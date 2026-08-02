import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useCreditCosts, useIsAdmin, useUpdateCreditCost } from "@/lib/credits";

export const Route = createFileRoute("/_authenticated/admin/credits")({
  component: AdminCreditsPage,
  head: () => ({
    meta: [
      { title: "Administration des crédits · Solenya" },
      {
        name: "description",
        content:
          "Réglez le coût en crédits de chaque action IA de Solenya sans toucher au code : plan, chapitres, couvertures, illustrations, pack marketing.",
      },
      { property: "og:title", content: "Administration des crédits · Solenya" },
      {
        property: "og:description",
        content: "Coûts de crédits configurables pour toutes les actions IA.",
      },
    ],
  }),
});

function AdminCreditsPage() {
  const { data: isAdmin, isLoading: checkingRole } = useIsAdmin();
  const { data: costs, isLoading } = useCreditCosts();
  const update = useUpdateCreditCost();
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (costs) setDraft(Object.fromEntries(costs.map((c) => [c.key, c.credits])));
  }, [costs]);

  if (checkingRole) {
    return (
      <AppShell title="Administration" subtitle="Vérification des droits…">
        <Loader2 className="animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Administration" subtitle="Accès réservé aux administrateurs.">
        <div className="card-premium p-8 text-center">
          <ShieldCheck className="mx-auto text-muted-foreground" size={28} />
          <h2 className="mt-4 font-display text-lg font-bold">Accès restreint</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs de l'espace Solenya.
          </p>
        </div>
      </AppShell>
    );
  }

  async function save(key: string) {
    const credits = draft[key];
    if (credits === undefined || Number.isNaN(credits) || credits < 0 || credits > 1000) {
      toast.error("Valeur invalide (0 à 1000).");
      return;
    }
    try {
      await update.mutateAsync({ key, credits });
      toast.success("Coût mis à jour.");
    } catch {
      toast.error("Mise à jour impossible.");
    }
  }

  return (
    <AppShell
      title="Coûts en crédits"
      subtitle="Chaque action IA est configurable ici, sans déploiement."
    >
      <div className="card-premium mb-6 flex flex-wrap items-center gap-3 p-5">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles size={20} />
        </span>
        <p className="flex-1 text-sm text-muted-foreground">
          Les nouvelles valeurs s'appliquent immédiatement à toutes les générations. Les exports
          PDF et DOCX restent toujours gratuits.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(costs ?? []).map((cost, index) => (
            <motion.div
              key={cost.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-premium flex flex-wrap items-center gap-4 p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{cost.label}</div>
                {cost.description && (
                  <div className="mt-1 text-xs text-muted-foreground">{cost.description}</div>
                )}
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {cost.key}
                </div>
              </div>
              <label className="sr-only" htmlFor={`cost-${cost.key}`}>
                Coût en crédits pour {cost.label}
              </label>
              <input
                id={`cost-${cost.key}`}
                type="number"
                min={0}
                max={1000}
                value={draft[cost.key] ?? cost.credits}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [cost.key]: Number(event.target.value) }))
                }
                className="h-11 w-24 rounded-xl border border-input bg-background px-3 text-center text-sm font-semibold outline-none focus:border-primary"
              />
              <button
                onClick={() => save(cost.key)}
                disabled={update.isPending || draft[cost.key] === cost.credits}
                className="flex h-11 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <Save size={15} /> Enregistrer
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
