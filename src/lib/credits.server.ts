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

  const counters: Record<JobUnit, { allowed: number; used: number }> = {
    outline: { allowed: job.outline_allowed, used: job.outline_used },
    chapter: { allowed: job.chapters_allowed, used: job.chapters_used },
    illustration: { allowed: job.illustrations_allowed, used: job.illustrations_used },
    cover: { allowed: job.covers_allowed, used: job.covers_used },
  };

  const { allowed, used } = counters[unit];
  if (used >= allowed) return false;

  const next = used + 1;
  const patch =
    unit === "outline"
      ? { outline_used: next }
      : unit === "chapter"
        ? { chapters_used: next }
        : unit === "illustration"
          ? { illustrations_used: next }
          : { covers_used: next };

  const { error } = await supabaseAdmin
    .from("generation_jobs")
    .update(patch)
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
