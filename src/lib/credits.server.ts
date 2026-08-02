import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_CREDIT_COSTS, type CreditActionKey } from "@/lib/credit-costs";

export const INSUFFICIENT = "INSUFFICIENT_CREDITS";

/** Erreur normalisée que le client reconnaît pour afficher la modale de crédits. */
export function insufficientCreditsError() {
  return new Error(INSUFFICIENT);
}

/** Coût configurable d'une action, lu depuis la table `credit_costs`. */
export async function costOf(key: CreditActionKey): Promise<number> {
  const { data } = await supabaseAdmin
    .from("credit_costs")
    .select("credits")
    .eq("key", key)
    .maybeSingle();
  const value = data?.credits;
  return typeof value === "number" && value >= 0 ? value : DEFAULT_CREDIT_COSTS[key];
}

/** Débite des crédits pour une action donnée (coût résolu côté serveur). */
export async function consumeCredits(userId: string, key: CreditActionKey, reason?: string) {
  const amount = await costOf(key);
  if (amount <= 0) return;
  const { error } = await supabaseAdmin.rpc("consume_credits_for", {
    _user_id: userId,
    _amount: amount,
    _reason: reason ?? key,
  });
  if (error) throw insufficientCreditsError();
}

type JobUnit = "outline" | "chapter" | "illustration" | "cover";

const UNIT_COLUMNS: Record<JobUnit, { allowed: string; used: string }> = {
  outline: { allowed: "outline_allowed", used: "outline_used" },
  chapter: { allowed: "chapters_allowed", used: "chapters_used" },
  illustration: { allowed: "illustrations_allowed", used: "illustrations_used" },
  cover: { allowed: "covers_allowed", used: "covers_used" },
};

/**
 * Consomme une unité d'un forfait de génération complète.
 * Retourne true si l'unité était couverte par le forfait (aucun crédit débité).
 */
async function useJobUnit(userId: string, jobId: string, unit: JobUnit) {
  const { data: job } = await supabaseAdmin
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!job) return false;
  if (new Date(job.expires_at).getTime() < Date.now()) return false;

  const cols = UNIT_COLUMNS[unit];
  const allowed = (job as Record<string, number>)[cols.allowed] ?? 0;
  const used = (job as Record<string, number>)[cols.used] ?? 0;
  if (used >= allowed) return false;

  const { error } = await supabaseAdmin
    .from("generation_jobs")
    .update({ [cols.used]: used + 1 })
    .eq("id", jobId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Facture une action : si un forfait de génération couvre l'unité, rien n'est débité,
 * sinon les crédits configurés pour l'action sont consommés.
 */
export async function billAction(
  userId: string,
  key: CreditActionKey,
  options?: { jobId?: string | undefined; unit?: JobUnit; reason?: string },
) {
  if (options?.jobId && options.unit) {
    const covered = await useJobUnit(userId, options.jobId, options.unit);
    if (covered) return;
  }
  await consumeCredits(userId, key, options?.reason ?? key);
}
