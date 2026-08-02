import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Coins, CreditCard, History } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/lib/auth";
import { useCreditCosts, useCreditHistory, transactionLabel } from "@/lib/credits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/credits")({
  component: CreditHistoryPage,
  head: () => ({
    meta: [
      { title: "Historique de crédits · Solenya" },
      {
        name: "description",
        content:
          "Suivez vos crédits Solenya : consommation par action, renouvellements d'abonnement, packs achetés et solde courant.",
      },
      { property: "og:title", content: "Historique de crédits · Solenya" },
      {
        property: "og:description",
        content: "Consommation, renouvellements et achats de crédits en un coup d'œil.",
      },
    ],
  }),
});

const KIND_LABELS: Record<string, string> = {
  usage: "Utilisation",
  purchase: "Pack acheté",
  renewal: "Renouvellement",
  bonus: "Bonus",
};

function CreditHistoryPage() {
  const { data: profile } = useProfile();
  const { data: history, isLoading } = useCreditHistory();
  const { data: costs } = useCreditCosts();

  const used = (history ?? [])
    .filter((tx) => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const added = (history ?? [])
    .filter((tx) => tx.amount > 0)
    .reduce((total, tx) => total + tx.amount, 0);

  return (
    <AppShell
      title="Historique de crédits"
      subtitle="Chaque action IA, chaque recharge, en toute transparence."
      actions={
        <Link
          to="/tarifs"
          hash="packs"
          className="hidden h-10 items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold transition-colors hover:bg-accent md:flex"
        >
          <CreditCard size={15} /> Acheter des crédits
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-premium flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Coins size={20} />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Solde actuel
            </div>
            <div className="font-display text-2xl font-bold">{profile?.credits ?? 0}</div>
          </div>
        </div>
        <div className="card-premium flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ArrowDownRight size={20} />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Crédits utilisés
            </div>
            <div className="font-display text-2xl font-bold">{used}</div>
          </div>
        </div>
        <div className="card-premium flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-success/10 text-success">
            <ArrowUpRight size={20} />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Crédits ajoutés
            </div>
            <div className="font-display text-2xl font-bold">{added}</div>
          </div>
        </div>
      </div>

      <div className="card-premium mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <History size={16} className="text-primary" />
          <h2 className="font-display text-base font-bold">Mouvements</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : (history ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Aucun mouvement pour le moment. Lance une génération pour voir apparaître ton
            historique.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 text-right font-semibold">Crédits</th>
                  <th className="px-5 py-3 text-right font-semibold">Solde</th>
                </tr>
              </thead>
              <tbody>
                {(history ?? []).map((tx, index) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 12) * 0.02 }}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{transactionLabel(tx)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {KIND_LABELS[tx.kind] ?? tx.kind}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-semibold",
                        tx.amount < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {tx.balance_after ?? "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="mt-10 font-display text-lg font-bold">Coût des actions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Les crédits sont consommés par action, jamais au nombre de mots. Les exports PDF et DOCX
        sont toujours gratuits.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(costs ?? []).map((cost) => (
          <div key={cost.key} className="card-premium p-4">
            <div className="text-sm font-semibold">{cost.label}</div>
            {cost.description && (
              <div className="mt-1 text-xs text-muted-foreground">{cost.description}</div>
            )}
            <div className="mt-3 text-sm font-bold text-primary">
              {cost.credits} crédit{cost.credits > 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
