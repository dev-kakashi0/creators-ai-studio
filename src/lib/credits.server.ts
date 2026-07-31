import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Débite des crédits pour un utilisateur authentifié.
 * Utilise une fonction SQL réservée au rôle de service : les clients ne peuvent
 * pas déclencher de débit ou d'écriture dans credit_transactions eux-mêmes.
 */
export async function consumeCredits(userId: string, amount: number, reason: string) {
  const { error } = await supabaseAdmin.rpc("consume_credits_for", {
    _user_id: userId,
    _amount: amount,
    _reason: reason,
  });
  if (error) throw new Error("Crédits IA insuffisants.");
}
