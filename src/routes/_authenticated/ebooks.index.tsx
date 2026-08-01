import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Copy, Loader2, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/ebooks/")({
  component: EbookLibrary,
});

type Ebook = Tables<"ebooks">;

function EbookLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: ebooks, isLoading } = useQuery({
    queryKey: ["ebooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebooks")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Ebook[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Session expirée");
      const { data, error } = await supabase
        .from("ebooks")
        .insert({ user_id: auth.user.id, title: "Nouvel ebook" })
        .select()
        .single();
      if (error) throw error;
      return data as Ebook;
    },
    onSuccess: (ebook) => {
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
      navigate({ to: "/ebooks/$id", params: { id: ebook.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Création impossible"),
  });

  const duplicate = useMutation({
    mutationFn: async (ebook: Ebook) => {
      const { id, created_at, updated_at, ...rest } = ebook;
      const { error } = await supabase
        .from("ebooks")
        .insert({ ...rest, title: `${ebook.title} (copie)` });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ebook dupliqué");
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ebook supprimé");
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (ebook: Ebook) => {
      const { error } = await supabase
        .from("ebooks")
        .update({ is_favorite: !ebook.is_favorite })
        .eq("id", ebook.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ebooks"] }),
  });

  const filtered = (ebooks ?? []).filter((e) =>
    `${e.title} ${e.topic ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell
      title="Ebooks"
      subtitle="Ta bibliothèque d'ebooks générés par l'IA"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            <span className="hidden sm:inline">Ebook vide</span>
          </button>
          <Link
            to="/ebooks/nouveau"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">Générer avec l'IA</span>
          </Link>
        </div>
      }

    >
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-3 md:max-w-sm">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ebook…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-premium flex flex-col items-center px-6 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BookOpen size={26} />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold">Aucun ebook pour l'instant</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Génère un plan complet, rédige chapitre par chapitre et exporte en PDF ou DOCX.
          </p>
          <button
            onClick={() => create.mutate()}
            className="mt-6 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Créer mon premier ebook
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ebook, i) => (
            <motion.div
              key={ebook.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="card-premium card-hover flex flex-col p-5"
            >
              <Link to="/ebooks/$id" params={{ id: ebook.id }} className="flex-1">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <BookOpen size={19} />
                </div>
                <div className="mt-4 line-clamp-2 font-semibold">{ebook.title}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {Array.isArray(ebook.chapters) ? ebook.chapters.length : 0} chapitres ·{" "}
                  {new Date(ebook.updated_at).toLocaleDateString("fr-FR")}
                </div>
                <span className="mt-3 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {ebook.status === "published" ? "Publié" : "Brouillon"}
                </span>
              </Link>
              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <button
                  onClick={() => toggleFavorite.mutate(ebook)}
                  className={`rounded-lg p-2 transition-colors hover:bg-accent ${ebook.is_favorite ? "text-primary" : "text-muted-foreground"}`}
                  aria-label="Favori"
                >
                  <Star size={15} fill={ebook.is_favorite ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => duplicate.mutate(ebook)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent"
                  aria-label="Dupliquer"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => remove.mutate(ebook.id)}
                  className="ml-auto rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
