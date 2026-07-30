import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  History,
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { generateChapter, generateOutline } from "@/lib/ai.functions";
import { generateCover } from "@/lib/cover.functions";
import { exportDocx, type EbookOutline } from "@/lib/export-docx";
import { PrintableEbook } from "@/components/PrintableEbook";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/ebooks/$id")({
  component: EbookEditor,
});

type Ebook = Tables<"ebooks">;

const TONES = ["professionnel et accessible", "inspirant", "direct et punchy", "pédagogique"];

function EbookEditor() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const runOutline = useServerFn(generateOutline);
  const runChapter = useServerFn(generateChapter);
  const runCover = useServerFn(generateCover);

  const [draft, setDraft] = useState<Ebook | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const skipFirstSave = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ["ebook", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ebooks").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Ebook | null;
    },
  });

  const { data: versions } = useQuery({
    queryKey: ["ebook-versions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebook_versions")
        .select("*")
        .eq("ebook_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: coverUrl } = useQuery({
    queryKey: ["cover", draft?.cover_url],
    enabled: Boolean(draft?.cover_url),
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("covers")
        .createSignedUrl(draft!.cover_url!, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  const outline = (draft?.outline ?? {}) as EbookOutline;
  const chapters = useMemo(
    () => (Array.isArray(draft?.chapters) ? (draft!.chapters as string[]) : []),
    [draft],
  );

  const persist = useCallback(
    async (patch: Partial<Ebook>) => {
      setSaving(true);
      const { error } = await supabase.from("ebooks").update(patch).eq("id", id);
      setSaving(false);
      if (error) {
        toast.error("Sauvegarde impossible");
        return;
      }
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["ebooks"] });
    },
    [id, queryClient],
  );

  // Sauvegarde automatique
  useEffect(() => {
    if (!draft) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void persist({
        title: draft.title,
        topic: draft.topic,
        audience: draft.audience,
        tone: draft.tone,
        outline: draft.outline,
        chapters: draft.chapters,
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, persist]);

  const outlineMutation = useMutation({
    mutationFn: async () => {
      if (!draft?.topic) throw new Error("Indique d'abord le sujet de ton ebook.");
      return runOutline({
        data: {
          topic: draft.topic,
          audience: draft.audience ?? "",
          tone: draft.tone ?? TONES[0],
          chapterCount: 6,
        },
      });
    },
    onSuccess: (result) => {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              title: result.titre || prev.title,
              outline: result as never,
              chapters: new Array(result.chapitres?.length ?? 0).fill("") as never,
            }
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Plan généré");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Génération impossible"),
  });

  async function handleChapter(index: number) {
    if (!draft) return;
    const chapter = outline.chapitres?.[index];
    if (!chapter) return;
    setBusyChapter(index);
    try {
      const result = await runChapter({
        data: {
          bookTitle: outline.titre || draft.title,
          chapterTitle: chapter.titre,
          summary: chapter.resume ?? "",
          audience: draft.audience ?? "",
          tone: draft.tone ?? TONES[0],
        },
      });
      setDraft((prev) => {
        if (!prev) return prev;
        const next = [...(Array.isArray(prev.chapters) ? (prev.chapters as string[]) : [])];
        next[index] = result.content;
        return { ...prev, chapters: next as never };
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setBusyChapter(null);
    }
  }

  const coverMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Ebook introuvable");
      const { dataUrl } = await runCover({
        data: { title: outline.titre || draft.title, topic: draft.topic ?? "" },
      });
      const blob = await (await fetch(dataUrl)).blob();
      const { data: auth } = await supabase.auth.getUser();
      const path = `${auth.user!.id}/${draft.id}.png`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (error) throw error;
      await persist({ cover_url: path });
      return path;
    },
    onSuccess: (path) => {
      setDraft((prev) => (prev ? { ...prev, cover_url: path } : prev));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Couverture générée");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Génération impossible"),
  });

  const versionMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("ebook_versions").insert({
        ebook_id: draft.id,
        user_id: auth.user!.id,
        label: `Version du ${new Date().toLocaleString("fr-FR")}`,
        snapshot: { title: draft.title, outline: draft.outline, chapters: draft.chapters } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Version enregistrée");
      queryClient.invalidateQueries({ queryKey: ["ebook-versions", id] });
    },
  });

  if (isLoading || !draft) {
    return (
      <AppShell title="Ebook">
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={draft.title}
      subtitle={
        saving
          ? "Sauvegarde…"
          : savedAt
            ? `Sauvegardé à ${savedAt.toLocaleTimeString("fr-FR")}`
            : "Sauvegarde automatique activée"
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Download size={15} /> <span className="hidden md:inline">PDF</span>
          </button>
          <button
            onClick={() =>
              exportDocx({
                title: draft.title,
                audience: draft.audience,
                outline,
                chapters,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <FileText size={15} /> <span className="hidden md:inline">DOCX</span>
          </button>
        </div>
      }
    >
      <div className="mb-5">
        <Link
          to="/ebooks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={15} /> Mes ebooks
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-5">
          <div className="card-premium space-y-4 p-5">
            <h2 className="font-display text-base font-bold">Paramètres</h2>
            <Field label="Titre">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={200}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Sujet">
              <textarea
                value={draft.topic ?? ""}
                onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                maxLength={300}
                rows={3}
                placeholder="Ex : lancer une boutique e-commerce en 30 jours"
                className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Audience">
              <input
                value={draft.audience ?? ""}
                onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                maxLength={200}
                placeholder="Entrepreneurs débutants"
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Ton">
              <select
                value={draft.tone ?? TONES[0]}
                onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={() => outlineMutation.mutate()}
              disabled={outlineMutation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {outlineMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              Générer le plan (5 crédits)
            </button>
          </div>

          <div className="card-premium space-y-3 p-5">
            <h2 className="font-display text-base font-bold">Couverture</h2>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={`Couverture de ${draft.title}`}
                className="aspect-[3/4] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ImagePlus size={26} />
              </div>
            )}
            <button
              onClick={() => coverMutation.mutate()}
              disabled={coverMutation.isPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
            >
              {coverMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Sparkles size={15} />
              )}
              Générer (8 crédits)
            </button>
          </div>

          <div className="card-premium space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Versions</h2>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-muted-foreground hover:text-primary"
                aria-label="Historique"
              >
                <History size={16} />
              </button>
            </div>
            <button
              onClick={() => versionMutation.mutate()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent"
            >
              <Save size={15} /> Enregistrer une version
            </button>
            {showHistory && (
              <ul className="space-y-2 pt-1">
                {(versions ?? []).length === 0 && (
                  <li className="text-xs text-muted-foreground">Aucune version enregistrée.</li>
                )}
                {(versions ?? []).map((version) => (
                  <li key={version.id}>
                    <button
                      onClick={() => {
                        const snap = version.snapshot as {
                          title: string;
                          outline: unknown;
                          chapters: unknown;
                        };
                        setDraft((prev) => (prev ? ({ ...prev, ...snap } as Ebook) : prev));
                        toast.success("Version restaurée");
                      }}
                      className="w-full rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {version.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex flex-col gap-5">
          {!outline.chapitres?.length ? (
            <div className="card-premium flex flex-col items-center px-6 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Wand2 size={26} />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold">Commence par le plan</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Renseigne le sujet et l'audience, puis génère un plan structuré. Tu pourras ensuite
                rédiger chaque chapitre.
              </p>
            </div>
          ) : (
            <>
              <div className="card-premium p-6">
                <h2 className="font-display text-lg font-bold">{outline.titre}</h2>
                {outline.sous_titre && (
                  <p className="mt-1 text-sm text-muted-foreground">{outline.sous_titre}</p>
                )}
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">
                  Introduction
                </h3>
                <textarea
                  value={outline.introduction ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      outline: { ...outline, introduction: e.target.value } as never,
                    })
                  }
                  rows={6}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </div>

              {outline.chapitres.map((chapter, index) => (
                <div key={index} className="card-premium p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                        Chapitre {index + 1}
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold">{chapter.titre}</h3>
                    </div>
                    <button
                      onClick={() => handleChapter(index)}
                      disabled={busyChapter !== null}
                      className="inline-flex items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {busyChapter === index ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : chapters[index] ? (
                        <Check size={14} />
                      ) : (
                        <Wand2 size={14} />
                      )}
                      {chapters[index] ? "Régénérer" : "Rédiger"} (3 crédits)
                    </button>
                  </div>
                  {chapter.resume && (
                    <p className="mt-2 text-sm text-muted-foreground">{chapter.resume}</p>
                  )}
                  <textarea
                    value={chapters[index] ?? ""}
                    onChange={(e) => {
                      const next = [...chapters];
                      next[index] = e.target.value;
                      setDraft({ ...draft, chapters: next as never });
                    }}
                    rows={10}
                    placeholder="Le contenu du chapitre apparaîtra ici…"
                    className="mt-4 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                  />
                </div>
              ))}

              <div className="card-premium p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Conclusion
                </h3>
                <textarea
                  value={outline.conclusion ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      outline: { ...outline, conclusion: e.target.value } as never,
                    })
                  }
                  rows={6}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </div>
            </>
          )}
        </section>
      </div>

      <PrintableEbook
        outline={outline}
        chapters={chapters}
        audience={draft.audience}
        createdAt={draft.created_at}
      />
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}
