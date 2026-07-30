import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logomark } from "@/components/Logomark";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Connexion — Solenya" },
      { name: "description", content: "Connectez-vous à votre studio de création IA Solenya." },
      { property: "og:title", content: "Connexion — Solenya" },
      { property: "og:description", content: "Accédez à votre studio de création IA." },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Adresse email invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  fullName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName || null },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Vérifie ta boîte mail pour confirmer ton compte.");
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible pour le moment.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-surface px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <Logomark />
          <span className="font-display text-xl font-bold">Solenya</span>
        </Link>

        <div className="card-premium p-7">
          <div className="mb-6 flex rounded-xl bg-muted p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setSent(false);
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
                  mode === m
                    ? "bg-card text-primary shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {sent ? (
            <div className="rounded-xl bg-success/10 p-4 text-sm text-success">
              Un email de confirmation vient de t'être envoyé. Clique sur le lien pour activer ton
              compte.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold" htmlFor="fullName">
                    Nom complet
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={80}
                    className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
                    placeholder="Thomas Martin"
                  />
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
                  placeholder="toi@exemple.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="password">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={72}
                  className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/15"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-semibold transition-colors hover:bg-accent"
          >
            Continuer avec Google
          </button>

          {mode === "login" && (
            <div className="mt-5 text-center">
              <Link
                to="/mot-de-passe-oublie"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
