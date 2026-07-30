import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logomark } from "@/components/Logomark";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Solenya" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte." },
      { property: "og:title", content: "Nouveau mot de passe — Solenya" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe sécurisé." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("8 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logomark />
          <span className="font-display text-xl font-bold">Solenya</span>
        </div>
        <form onSubmit={handleSubmit} className="card-premium space-y-4 p-7">
          <h1 className="font-display text-xl font-bold">Nouveau mot de passe</h1>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={72}
            placeholder="Nouveau mot de passe"
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            maxLength={72}
            placeholder="Confirmer le mot de passe"
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />} Mettre à jour
          </button>
        </form>
      </div>
    </div>
  );
}
