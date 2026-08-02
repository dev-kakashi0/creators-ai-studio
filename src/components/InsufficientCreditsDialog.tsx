import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Coins, Sparkles, X, Zap } from "lucide-react";
import { closeCreditModal, useCreditModal } from "@/lib/credits";
import { useProfile } from "@/lib/auth";

/** Modale premium affichée quand une génération manque de crédits. */
export function InsufficientCreditsDialog() {
  const { open, needed } = useCreditModal();
  const { data: profile } = useProfile();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
          onClick={closeCreditModal}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="credits-modal-title"
            className="card-premium relative w-full max-w-md overflow-hidden p-7 text-center"
          >
            <button
              onClick={closeCreditModal}
              aria-label="Fermer"
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={18} />
            </button>

            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Coins size={26} />
            </span>

            <h2 id="credits-modal-title" className="mt-5 font-display text-xl font-bold">
              Crédits insuffisants
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu n'as pas assez de crédits pour terminer cette génération.
              {typeof needed === "number" ? ` Il te faut ${needed} crédits.` : ""}
            </p>

            <div className="mt-5 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              Solde actuel : {profile?.credits ?? 0} crédits
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/tarifs"
                onClick={closeCreditModal}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <Zap size={16} /> Passer à un plan supérieur
              </Link>
              <Link
                to="/tarifs"
                hash="packs"
                onClick={closeCreditModal}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent"
              >
                <Sparkles size={16} /> Acheter des crédits
              </Link>
              <button
                onClick={closeCreditModal}
                className="h-11 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
