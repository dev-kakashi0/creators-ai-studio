import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  currencyForCountry,
  DEFAULT_CURRENCY,
  type CurrencyCode,
  regionForCurrency,
} from "@/lib/billing-config";
import { detectCountry } from "@/lib/billing.functions";

const STORAGE_KEY = "solenya.currency";

/** Devise choisie par l'utilisateur (mémorisée) sinon déduite du pays. */
export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [country, setCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored) {
      setCurrencyState(stored);
      setReady(true);
    }
    detectCountry()
      .then((result) => {
        if (cancelled) return;
        setCountry(result.country);
        if (!stored && result.country) setCurrencyState(currencyForCountry(result.country));
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function setCurrency(next: CurrencyCode) {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return { currency, setCurrency, country, region: regionForCurrency(currency), ready };
}

export function usePaymentProviders(currency: CurrencyCode) {
  return useQuery({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_providers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    select: (rows) =>
      rows.filter(
        (row) => row.enabled && (row.currencies as string[]).includes(currency),
      ),
  });
}

export function useAllProviders() {
  return useQuery({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_providers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function usePlanPrices(currency: CurrencyCode) {
  return useQuery({
    queryKey: ["plan-prices", currency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_prices")
        .select("*")
        .eq("currency", currency);
      if (error) throw error;
      return Object.fromEntries(data.map((row) => [row.plan_id, Number(row.amount)]));
    },
  });
}

export function usePackPrices(currency: CurrencyCode) {
  return useQuery({
    queryKey: ["pack-prices", currency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pack_prices")
        .select("*")
        .eq("currency", currency);
      if (error) throw error;
      return Object.fromEntries(data.map((row) => [row.pack_id, Number(row.amount)]));
    },
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Mutations admin : prix localisés, fournisseurs, coupons. */
export function useBillingAdmin() {
  const queryClient = useQueryClient();

  const savePlanPrice = useMutation({
    mutationFn: async (input: { planId: string; currency: string; amount: number }) => {
      const { error } = await supabase
        .from("plan_prices")
        .upsert(
          {
            plan_id: input.planId,
            currency: input.currency,
            amount: input.amount,
            region: input.currency.startsWith("X") ? "africa" : "international",
          },
          { onConflict: "plan_id,currency,interval" },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-prices"] }),
  });

  const savePackPrice = useMutation({
    mutationFn: async (input: { packId: string; currency: string; amount: number }) => {
      const { error } = await supabase.from("pack_prices").upsert(
        {
          pack_id: input.packId,
          currency: input.currency,
          amount: input.amount,
          region: input.currency.startsWith("X") ? "africa" : "international",
        },
        { onConflict: "pack_id,currency" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pack-prices"] }),
  });

  const toggleProvider = useMutation({
    mutationFn: async (input: { id: string; enabled: boolean; mode?: string }) => {
      const { error } = await supabase
        .from("payment_providers")
        .update({ enabled: input.enabled, ...(input.mode ? { mode: input.mode } : {}) })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-providers"] }),
  });

  const saveCoupon = useMutation({
    mutationFn: async (input: {
      code: string;
      percent_off: number | null;
      amount_off: number | null;
      currency: string | null;
      trial_days: number;
      max_redemptions: number | null;
      expires_at: string | null;
      active: boolean;
    }) => {
      const { error } = await supabase.from("coupons").upsert(input, { onConflict: "code" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("coupons").delete().eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });

  return { savePlanPrice, savePackPrice, toggleProvider, saveCoupon, deleteCoupon };
}
