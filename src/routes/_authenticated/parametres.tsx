import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Coins, Loader2, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSignOut } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/parametres")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const [fullName, setFullName] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  const { data: transactions } = useQuery({
    queryKey: ["credit-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = fullName.trim().slice(0, 80);
      if (!trimmed) throw new Error("Le nom ne peut pas être vide.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", auth.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("solenya-theme", next ? "dark" : "light");
  }

  return (
    <AppShell title="Paramètres" subtitle="Gère ton profil, ton thème et tes crédits">
      <div className="grid max-w-4xl gap-6">
        <section className="card-premium p-6">
          <div className="flex items-center gap-2 text-primary">
            <UserRound size={18} />
            <h2 className="font-display text-base font-bold text-foreground">Profil</h2>
          </div>
          {isLoading ? (
            <Loader2 className="mt-6 animate-spin text-muted-foreground" size={18} />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Nom complet</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Email</span>
                <input
                  value={profile?.email ?? ""}
                  disabled
                  className="h-11 w-full rounded-xl border border-input bg-muted px-3 text-sm text-muted-foreground"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="h-11 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card-premium flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-display text-base font-bold">Apparence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bascule entre le thème clair et sombre.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? "Thème clair" : "Thème sombre"}
          </button>
        </section>

        <section className="card-premium p-6">
          <div className="flex items-center gap-2 text-primary">
            <Coins size={18} />
            <h2 className="font-display text-base font-bold text-foreground">Crédits IA</h2>
          </div>
          <p className="mt-4 font-display text-3xl font-bold">{profile?.credits ?? 0}</p>
          <p className="text-sm text-muted-foreground">crédits disponibles</p>
          <ul className="mt-5 divide-y divide-border">
            {(transactions ?? []).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{tx.reason}</span>
                <span className={tx.amount > 0 ? "font-semibold text-primary" : "font-semibold"}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </li>
            ))}
            {(transactions ?? []).length === 0 && (
              <li className="py-2.5 text-sm text-muted-foreground">Aucune consommation pour le moment.</li>
            )}
          </ul>
        </section>

        <section className="card-premium flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-display text-base font-bold">Session</h2>
            <p className="mt-1 text-sm text-muted-foreground">Déconnecte-toi de cet appareil.</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-destructive/30 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut size={16} /> Se déconnecter
          </button>
        </section>
      </div>
    </AppShell>
  );
}
