import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logomark } from "@/components/Logomark";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Solenya" },
      { name: "description", content: "Réinitialisez le mot de passe de votre compte Solenya." },
      { property: "og:title", content: "Mot de passe oublié — Solenya" },
      { property: "og:description", content: "Recevez un lien de réinitialisation par email." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error("Adresse email invalide");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-surface px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <Logomark />
          <span className="font-display text-xl font-bold">Solenya</span>
        </Link>
        <div className="card-premium p-7">
          <h1 className="font-display text-xl font-bold">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Indique ton email, nous t'enverrons un lien de réinitialisation.
          </p>

          {sent ? (
            <div className="mt-6 rounded-xl bg-success/10 p-4 text-sm text-success">
              Si un compte existe pour cette adresse, un email vient d'être envoyé.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="toi@exemple.com"
                className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />} Envoyer le lien
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
