import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, Coins, Sparkles, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CheckoutDialog, type CheckoutTarget } from "@/components/CheckoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { useCurrency, usePackPrices, usePlanPrices } from "@/lib/billing";
import { CURRENCIES, formatPrice, type CurrencyCode } from "@/lib/billing-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tarifs")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Abonnements & crédits · Solenya" },
      {
        name: "description",
        content:
          "Choisissez le plan Solenya adapté à votre rythme de production : Free, Pro ou Business, avec packs de crédits à la demande et paiement local.",
      },
      { property: "og:title", content: "Abonnements & crédits · Solenya" },
      {
        property: "og:description",
        content: "Plans Solenya en euro, dollar ou franc CFA, par carte ou mobile money.",
      },
    ],
  }),
});

function PricingPage() {
  const { data: profile } = useProfile();
  const { currency, setCurrency, country } = useCurrency();
  const { data: planPrices } = usePlanPrices(currency);
  const { data: packPrices } = usePackPrices(currency);
  const [target, setTarget] = useState<CheckoutTarget | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: packs } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const currentPlan = profile?.plan ?? "free";

  return (
    <AppShell title="Abonnements" subtitle="Choisis la puissance de génération dont tu as besoin.">
      <div className="card-premium mb-8 flex flex-wrap items-center gap-4 p-6">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Coins size={22} />
        </span>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Crédits restants
          </div>
          <div className="font-display text-3xl font-bold">{profile?.credits ?? 0}</div>
        </div>
        <label className="sr-only" htmlFor="currency">
          Devise
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
        >
          {Object.values(CURRENCIES).map((info) => (
            <option key={info.code} value={info.code}>
              {info.code} — {info.label}
            </option>
          ))}
        </select>
        <div className="rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold capitalize text-primary">
          Plan {currentPlan}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {(plans ?? []).map((plan, index) => {
          const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
          const highlight = plan.id === "pro";
          const active = plan.id === currentPlan;
          const price = planPrices?.[plan.id] ?? Number(plan.price_monthly);
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={cn(
                "card-premium relative flex flex-col p-6",
                highlight && "border-primary shadow-lift",
              )}
            >
              {highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Le plus choisi
                </span>
              )}
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">
                  {formatPrice(price, currency)}
                </span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-primary">
                {plan.monthly_credits} crédits par mois
              </div>
              {plan.id !== "free" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Les crédits non utilisés expirent à la fin du cycle de facturation.
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={active || price <= 0}
                onClick={() =>
                  setTarget({
                    kind: "subscription",
                    itemId: plan.id,
                    label: `Abonnement ${plan.name} — ${plan.monthly_credits} crédits/mois`,
                    amount: price,
                  })
                }
                className={cn(
                  "mt-6 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-transform",
                  active || price <= 0
                    ? "cursor-default border border-input text-muted-foreground"
                    : highlight
                      ? "bg-gradient-primary text-primary-foreground shadow-glow hover:-translate-y-0.5"
                      : "border border-input hover:bg-accent",
                )}
              >
                {active ? (
                  "Plan actuel"
                ) : price <= 0 ? (
                  "Gratuit"
                ) : (
                  <>
                    Passer à {plan.name} <Zap size={15} />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <h2 id="packs" className="mt-12 scroll-mt-24 font-display text-xl font-bold">
        Packs de crédits
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Besoin de plus de crédits sans changer d'abonnement ? Recharge à la demande : les crédits
        achetés n'expirent jamais tant que l'abonnement est actif.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(packs ?? []).map((pack) => {
          const price = packPrices?.[pack.id] ?? Number(pack.price);
          return (
            <div key={pack.id} className="card-premium card-hover flex flex-col p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Sparkles size={18} />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">{pack.name}</h3>
              <div className="mt-1 text-sm text-muted-foreground">{pack.credits} crédits</div>
              <div className="mt-4 font-display text-2xl font-bold">
                {formatPrice(price, currency)}
              </div>
              <button
                onClick={() =>
                  setTarget({
                    kind: "pack",
                    itemId: pack.id,
                    label: `${pack.name} — ${pack.credits} crédits`,
                    amount: price,
                  })
                }
                className="mt-5 h-11 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent"
              >
                Acheter
              </button>
            </div>
          );
        })}
      </div>

      <CheckoutDialog
        target={target}
        currency={currency}
        country={country}
        onClose={() => setTarget(null)}
      />
    </AppShell>
  );
}
