import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CREDIT_COSTS,
  type CreditActionKey,
  type CreditCost,
} from "@/lib/credit-costs";

/* ------------------------------------------------------------------ */
/* Coûts configurables                                                 */
/* ------------------------------------------------------------------ */

export function useCreditCosts() {
  return useQuery({
    queryKey: ["credit-costs"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CreditCost[]> => {
      const { data, error } = await supabase
        .from("credit_costs")
        .select("key, label, description, credits, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as CreditCost[];
    },
  });
}

/** Coût courant d'une action (valeur par défaut tant que la config n'est pas chargée). */
export function useCreditCost(key: CreditActionKey) {
  const { data } = useCreditCosts();
  return data?.find((c) => c.key === key)?.credits ?? DEFAULT_CREDIT_COSTS[key];
}

export function useCostMap(): Record<CreditActionKey, number> {
  const { data } = useCreditCosts();
  const map = { ...DEFAULT_CREDIT_COSTS } as Record<CreditActionKey, number>;
  for (const row of data ?? []) {
    if (row.key in map) map[row.key as CreditActionKey] = row.credits;
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: auth.user.id,
        _role: "admin",
      });
      if (error) return false;
      return Boolean(data);
    },
  });
}

export function useUpdateCreditCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, credits }: { key: string; credits: number }) => {
      const { error } = await supabase
        .from("credit_costs")
        .update({ credits })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["credit-costs"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Historique                                                          */
/* ------------------------------------------------------------------ */

export type CreditTransaction = {
  id: string;
  amount: number;
  reason: string;
  kind: string;
  balance_after: number | null;
  created_at: string;
};

export function useCreditHistory() {
  return useQuery({
    queryKey: ["credit-history"],
    queryFn: async (): Promise<CreditTransaction[]> => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, amount, reason, kind, balance_after, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CreditTransaction[];
    },
  });
}

const REASON_LABELS: Record<string, string> = {
  ebook_outline: "Plan d'ebook généré",
  ebook_chapter: "Chapitre rédigé",
  ebook_cover: "Couverture générée",
  ebook_illustration: "Illustration générée",
  ebook_standard: "Ebook complet généré",
  ebook_premium: "Ebook premium généré",
  marketing_pack: "Pack marketing IA",
  subscription_renewal: "Renouvellement d'abonnement",
};

export function transactionLabel(tx: CreditTransaction) {
  if (REASON_LABELS[tx.reason]) return REASON_LABELS[tx.reason];
  if (tx.reason.startsWith("copy_")) return `Copywriting · ${tx.reason.replace("copy_", "")}`;
  if (tx.kind === "purchase") return "Pack de crédits acheté";
  if (tx.kind === "renewal") return "Renouvellement d'abonnement";
  if (tx.kind === "bonus") return "Crédits offerts";
  return tx.reason;
}

/* ------------------------------------------------------------------ */
/* Modale « crédits insuffisants »                                     */
/* ------------------------------------------------------------------ */

type ModalState = { open: boolean; needed?: number };

let modalState: ModalState = { open: false };
const listeners = new Set<() => void>();

function emit(next: ModalState) {
  modalState = next;
  listeners.forEach((l) => l());
}

export function openCreditModal(needed?: number) {
  emit({ open: true, ...(needed === undefined ? {} : { needed }) });
}

export function closeCreditModal() {
  emit({ open: false });
}

export function useCreditModal() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => modalState,
    () => modalState,
  );
}

/** Ouvre la modale si l'erreur vient d'un manque de crédits. Retourne true si géré. */
export function handleCreditError(error: unknown, needed?: number) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/INSUFFICIENT_CREDITS|Crédits IA insuffisants/i.test(message)) {
    openCreditModal(needed);
    return true;
  }
  return false;
}
