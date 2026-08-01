import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookCheck,
  Check,
  Download,
  FileText,
  History,
  ImagePlus,
  Loader2,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { generateChapter, generateOutline } from "@/lib/ai.functions";
import { generateCover, generateIllustration } from "@/lib/cover.functions";
import { exportDocx, type EbookOutline } from "@/lib/export-docx";
import { exportPdf } from "@/lib/export-pdf";
import { pathToDataUrl, signedUrl, uploadImage } from "@/lib/ebook-assets";
import { CREDITS, LANGUAGES, STYLES } from "@/lib/ebook-config";
import { FONT_CHOICES, QUALITIES, THEMES, type BrandingJson } from "@/lib/ebook-brand";
import { brandingOf, identityOf, watermarkForPlan } from "@/lib/ebook-identity";
import { useProfile } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";


import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ebooks/$id")({
  component: EbookEditor,
  head: () => ({
    meta: [
      { title: "Éditeur d'ebook · Solenya" },
      {
        name: "description",
        content:
          "Éditez, réorganisez et régénérez chaque chapitre de votre ebook, puis exportez un PDF professionnel avec couverture intégrée.",
      },
    ],
  }),
});

type Ebook = Tables<"ebooks">;

function EbookEditor() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const runOutline = useServerFn(generateOutline);
  const runChapter = useServerFn(generateChapter);
  const runCover = useServerFn(generateCover);
  const runIllustration = useServerFn(generateIllustration);

  const [draft, setDraft] = useState<Ebook | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [busyImage, setBusyImage] = useState<number | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const skipFirstSave = useRef(true);

  // Historique local (annuler / rétablir)
  const past = useRef<Ebook[]>([]);
  const future = useRef<Ebook[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

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
    queryFn: () => signedUrl(draft?.cover_url),
  });

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  const outline = (draft?.outline ?? {}) as EbookOutline;
  const chapters = useMemo(
    () => (Array.isArray(draft?.chapters) ? (draft!.chapters as string[]) : []),
    [draft],
  );
  const illustrations = useMemo(
    () => (Array.isArray(draft?.illustrations) ? (draft!.illustrations as Array<string | null>) : []),
    [draft],
  );

  /** Applique une modification en empilant l'état précédent pour l'annulation. */
  const apply = useCallback((updater: (prev: Ebook) => Ebook, trackHistory = true) => {
    setDraft((prev) => {
      if (!prev) return prev;
      if (trackHistory) {
        past.current = [...past.current.slice(-29), prev];
        future.current = [];
      }
      return updater(prev);
    });
    if (trackHistory) setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    setDraft((prev) => {
      const previous = past.current.pop();
      if (!prev || !previous) return prev;
      future.current = [...future.current, prev];
      return previous;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    setDraft((prev) => {
      const next = future.current.pop();
      if (!prev || !next) return prev;
      past.current = [...past.current, prev];
      return next;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.key.toLowerCase() === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
        subtitle: draft.subtitle,
        topic: draft.topic,
        audience: draft.audience,
        tone: draft.tone,
        style: draft.style,
        language: draft.language,
        outline: draft.outline,
        chapters: draft.chapters,
        illustrations: draft.illustrations,
        status: draft.status,
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
          style: draft.style ?? "professionnel",
          language: draft.language ?? "fr",
          length: draft.length ?? "standard",
        },
      });
    },
    onSuccess: (result) => {
      apply((prev) => ({
        ...prev,
        title: result.titre || prev.title,
        subtitle: result.sous_titre ?? prev.subtitle,
        outline: result as never,
        chapters: new Array(result.chapitres?.length ?? 0).fill("") as never,
      }));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Plan généré");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Génération impossible"),
  });

  async function handleChapter(index: number) {
    if (!draft) return;
    const chapter = outline.chapitres?.[index];
    if (!chapter || busyChapter !== null) return;
    setBusyChapter(index);
    try {
      const result = await runChapter({
        data: {
          bookTitle: outline.titre || draft.title,
          chapterTitle: chapter.titre,
          chapterIndex: index,
          summary: chapter.resume ?? "",
          points: chapter.points ?? [],
          audience: draft.audience ?? "",
          style: draft.style ?? "professionnel",
          language: draft.language ?? "fr",
          length: draft.length ?? "standard",
        },
      });
      apply((prev) => {
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

  async function handleIllustration(index: number) {
    if (!draft || busyImage !== null) return;
    const chapter = outline.chapitres?.[index];
    if (!chapter) return;
    setBusyImage(index);
    try {
      const { dataUrl } = await runIllustration({
        data: {
          bookTitle: outline.titre || draft.title,
          chapterTitle: chapter.titre,
          summary: chapter.resume ?? "",
        },
      });
      const { data: auth } = await supabase.auth.getUser();
      const path = await uploadImage(`${auth.user!.id}/${draft.id}/ch-${index}.png`, dataUrl);
      apply((prev) => {
        const next = [
          ...(Array.isArray(prev.illustrations) ? (prev.illustrations as Array<string | null>) : []),
        ];
        next[index] = `${path}?v=${Date.now()}`.split("?")[0];
        return { ...prev, illustrations: next as never };
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["illustration"] });
      toast.success("Illustration générée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setBusyImage(null);
    }
  }

  function moveChapter(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!outline.chapitres || target < 0 || target >= outline.chapitres.length) return;
    apply((prev) => {
      const currentOutline = { ...((prev.outline ?? {}) as EbookOutline) };
      const list = [...(currentOutline.chapitres ?? [])];
      [list[index], list[target]] = [list[target], list[index]];
      const body = [...(Array.isArray(prev.chapters) ? (prev.chapters as string[]) : [])];
      [body[index], body[target]] = [body[target], body[index]];
      const images = [
        ...(Array.isArray(prev.illustrations) ? (prev.illustrations as Array<string | null>) : []),
      ];
      [images[index], images[target]] = [images[target], images[index]];
      currentOutline.chapitres = list;
      return {
        ...prev,
        outline: currentOutline as never,
        chapters: body as never,
        illustrations: images as never,
      };
    });
  }

  function deleteChapter(index: number) {
    apply((prev) => {
      const currentOutline = { ...((prev.outline ?? {}) as EbookOutline) };
      currentOutline.chapitres = (currentOutline.chapitres ?? []).filter((_, i) => i !== index);
      return {
        ...prev,
        outline: currentOutline as never,
        chapters: (Array.isArray(prev.chapters) ? (prev.chapters as string[]) : []).filter(
          (_, i) => i !== index,
        ) as never,
        illustrations: (Array.isArray(prev.illustrations)
          ? (prev.illustrations as Array<string | null>)
          : []
        ).filter((_, i) => i !== index) as never,
      };
    });
    toast.success("Chapitre supprimé");
  }

  function addChapter() {
    apply((prev) => {
      const currentOutline = { ...((prev.outline ?? {}) as EbookOutline) };
      currentOutline.chapitres = [
        ...(currentOutline.chapitres ?? []),
        { titre: "Nouveau chapitre", resume: "" },
      ];
      return {
        ...prev,
        outline: currentOutline as never,
        chapters: [
          ...(Array.isArray(prev.chapters) ? (prev.chapters as string[]) : []),
          "",
        ] as never,
        illustrations: [
          ...(Array.isArray(prev.illustrations) ? (prev.illustrations as Array<string | null>) : []),
          null,
        ] as never,
      };
    });
  }

  const coverMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Ebook introuvable");
      const { dataUrl } = await runCover({
        data: {
          title: outline.titre || draft.title,
          subtitle: draft.subtitle ?? outline.sous_titre ?? "",
          topic: draft.topic ?? "",
        },
      });
      const { data: auth } = await supabase.auth.getUser();
      const path = await uploadImage(`${auth.user!.id}/${draft.id}/cover.png`, dataUrl);
      await persist({ cover_url: path });
      return path;
    },
    onSuccess: (path) => {
      apply((prev) => ({ ...prev, cover_url: path }), false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["cover"] });
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

  async function handleExport(format: "pdf" | "docx") {
    if (!draft || exporting) return;
    setExporting(format);
    try {
      const [coverDataUrl, authorPhotoDataUrl, logoDataUrl, ...illustrationDataUrls] =
        await Promise.all([
          pathToDataUrl(draft.cover_url),
          pathToDataUrl(draft.author_photo),
          pathToDataUrl(draft.logo_url),
          ...(outline.chapitres ?? []).map((_, index) => pathToDataUrl(illustrations[index])),
        ]);
      const payload = {
        title: draft.title,
        outline,
        chapters,
        coverDataUrl,
        illustrationDataUrls,
      };
      if (format === "pdf") {
        await exportPdf({
          ...payload,
          identity: identityOf(draft, { authorPhotoDataUrl, logoDataUrl }),
          language: draft.language,
          watermark: watermarkForPlan(profile?.plan),
        });

      } else {
        await exportDocx({ ...payload, audience: draft.audience });
      }
      toast.success(format === "pdf" ? "PDF exporté" : "DOCX exporté");
    } catch (error) {
      console.error(error);
      toast.error("Export impossible");
    } finally {
      setExporting(null);
    }
  }

  if (isLoading || !draft) {
    return (
      <AppShell title="Ebook">
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      </AppShell>
    );
  }

  const published = draft.status === "published";

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
            onClick={undo}
            disabled={past.current.length === 0}
            data-tick={historyTick}
            aria-label="Annuler"
            className="rounded-xl border border-input p-2.5 transition-colors hover:bg-accent disabled:opacity-40"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={future.current.length === 0}
            aria-label="Rétablir"
            className="rounded-xl border border-input p-2.5 transition-colors hover:bg-accent disabled:opacity-40"
          >
            <Redo2 size={15} />
          </button>
          <button
            onClick={() => void handleExport("pdf")}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span className="hidden md:inline">PDF</span>
          </button>
          <button
            onClick={() => void handleExport("docx")}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {exporting === "docx" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileText size={15} />
            )}
            <span className="hidden md:inline">DOCX</span>
          </button>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/ebooks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={15} /> Mes ebooks
        </Link>
        <button
          onClick={() =>
            apply((prev) => ({ ...prev, status: published ? "draft" : "published" }), false)
          }
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            published
              ? "bg-success/15 text-success"
              : "border border-input text-muted-foreground hover:bg-accent",
          )}
        >
          <BookCheck size={15} /> {published ? "Publié" : "Marquer comme publié"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-5">
          <div className="card-premium space-y-4 p-5">
            <h2 className="font-display text-base font-bold">Livre</h2>
            <Field label="Titre">
              <input
                value={draft.title}
                onChange={(e) => apply((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={200}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Sous-titre">
              <input
                value={draft.subtitle ?? outline.sous_titre ?? ""}
                onChange={(e) =>
                  apply((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                    outline: {
                      ...((prev.outline ?? {}) as EbookOutline),
                      sous_titre: e.target.value,
                    } as never,
                  }))
                }
                maxLength={300}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Sujet">
              <textarea
                value={draft.topic ?? ""}
                onChange={(e) => apply((prev) => ({ ...prev, topic: e.target.value }))}
                maxLength={300}
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Audience">
              <input
                value={draft.audience ?? ""}
                onChange={(e) => apply((prev) => ({ ...prev, audience: e.target.value }))}
                maxLength={200}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Style">
                <select
                  value={draft.style ?? "professionnel"}
                  onChange={(e) => apply((prev) => ({ ...prev, style: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Langue">
                <select
                  value={draft.language ?? "fr"}
                  onChange={(e) => apply((prev) => ({ ...prev, language: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button
              onClick={() => outlineMutation.mutate()}
              disabled={outlineMutation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-input text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
            >
              {outlineMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              Régénérer le plan ({CREDITS.outline})
            </button>
          </div>

          <div className="card-premium space-y-4 p-5">
            <h2 className="font-display text-base font-bold">Identité & thème</h2>
            <Field label="Nom de l'auteur">
              <input
                value={draft.author_name ?? ""}
                onChange={(e) => apply((prev) => ({ ...prev, author_name: e.target.value }))}
                maxLength={120}
                placeholder="Votre nom"
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <Field label="Bio de l'auteur">
              <textarea
                value={draft.author_bio ?? ""}
                onChange={(e) => apply((prev) => ({ ...prev, author_bio: e.target.value }))}
                maxLength={800}
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Éditeur">
                <input
                  value={draft.publisher ?? ""}
                  onChange={(e) => apply((prev) => ({ ...prev, publisher: e.target.value }))}
                  maxLength={120}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Site web">
                <input
                  value={draft.website ?? ""}
                  onChange={(e) => apply((prev) => ({ ...prev, website: e.target.value }))}
                  maxLength={200}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <Field label="Thème du livre">
              <select
                value={draft.theme ?? "modern"}
                onChange={(e) => apply((prev) => ({ ...prev, theme: e.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qualité">
                <select
                  value={draft.quality ?? "premium"}
                  onChange={(e) => apply((prev) => ({ ...prev, quality: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  {QUALITIES.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Typographie">
                <select
                  value={brandingOf(draft).font ?? ""}
                  onChange={(e) =>
                    apply((prev) => ({
                      ...prev,
                      branding: {
                        ...brandingOf(prev),
                        font: e.target.value || undefined,
                      } as never,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Thème par défaut</option>
                  {FONT_CHOICES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-3">
              {(["primary", "secondary", "accent"] as const).map((key) => (
                <label key={key} className="flex flex-1 items-center gap-2 text-xs capitalize">
                  <input
                    type="color"
                    value={
                      (brandingOf(draft)[key] as string | undefined) ??
                      (THEMES.find((t) => t.id === (draft.theme ?? "modern")) ?? THEMES[0]).swatch[
                        key === "primary" ? 0 : key === "secondary" ? 1 : 2
                      ]
                    }
                    onChange={(e) =>
                      apply((prev) => ({
                        ...prev,
                        branding: {
                          ...brandingOf(prev),
                          [key]: e.target.value,
                        } as BrandingJson as never,
                      }))
                    }
                    className="h-8 w-8 cursor-pointer rounded-lg border border-input bg-card"
                  />
                  <span className="text-muted-foreground">{key}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {watermarkForPlan(profile?.plan)
                ? "Plan gratuit : une mention « Created with Solenya AI » figure en dernière page."
                : "Plan payant : exports 100 % à votre marque, sans mention Solenya."}
            </p>
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
            <p className="text-xs text-muted-foreground">
              La couverture devient automatiquement la page 1 du PDF exporté.
            </p>
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
              Régénérer ({CREDITS.cover} crédits)
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
                        apply((prev) => ({ ...prev, ...snap }) as Ebook);
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
                Renseigne le sujet et l'audience, puis génère un plan structuré.
              </p>
            </div>
          ) : (
            <>
              <div className="card-premium p-6">
                <h2 className="font-display text-lg font-bold">{outline.titre}</h2>
                {(draft.subtitle || outline.sous_titre) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {draft.subtitle || outline.sous_titre}
                  </p>
                )}
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">
                  Introduction
                </h3>
                <textarea
                  value={outline.introduction ?? ""}
                  onChange={(e) =>
                    apply((prev) => ({
                      ...prev,
                      outline: {
                        ...((prev.outline ?? {}) as EbookOutline),
                        introduction: e.target.value,
                      } as never,
                    }))
                  }
                  rows={6}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </div>

              {outline.chapitres.map((chapter, index) => (
                <ChapterCard
                  key={index}
                  index={index}
                  total={outline.chapitres!.length}
                  chapter={chapter}
                  body={chapters[index] ?? ""}
                  illustrationPath={illustrations[index] ?? null}
                  busy={busyChapter === index}
                  busyImage={busyImage === index}
                  disabled={busyChapter !== null}
                  onTitle={(value) =>
                    apply((prev) => {
                      const currentOutline = { ...((prev.outline ?? {}) as EbookOutline) };
                      const list = [...(currentOutline.chapitres ?? [])];
                      list[index] = { ...list[index], titre: value };
                      currentOutline.chapitres = list;
                      return { ...prev, outline: currentOutline as never };
                    })
                  }
                  onBody={(value) =>
                    apply((prev) => {
                      const next = [
                        ...(Array.isArray(prev.chapters) ? (prev.chapters as string[]) : []),
                      ];
                      next[index] = value;
                      return { ...prev, chapters: next as never };
                    })
                  }
                  onGenerate={() => void handleChapter(index)}
                  onIllustration={() => void handleIllustration(index)}
                  onMove={(direction) => moveChapter(index, direction)}
                  onDelete={() => deleteChapter(index)}
                />
              ))}

              <button
                onClick={addChapter}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus size={16} /> Ajouter un chapitre
              </button>

              <div className="card-premium p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Conclusion
                </h3>
                <textarea
                  value={outline.conclusion ?? ""}
                  onChange={(e) =>
                    apply((prev) => ({
                      ...prev,
                      outline: {
                        ...((prev.outline ?? {}) as EbookOutline),
                        conclusion: e.target.value,
                      } as never,
                    }))
                  }
                  rows={6}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">
                  Appel à l'action
                </h3>
                <textarea
                  value={outline.cta ?? ""}
                  onChange={(e) =>
                    apply((prev) => ({
                      ...prev,
                      outline: {
                        ...((prev.outline ?? {}) as EbookOutline),
                        cta: e.target.value,
                      } as never,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-input bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
                />
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ChapterCard({
  index,
  total,
  chapter,
  body,
  illustrationPath,
  busy,
  busyImage,
  disabled,
  onTitle,
  onBody,
  onGenerate,
  onIllustration,
  onMove,
  onDelete,
}: {
  index: number;
  total: number;
  chapter: { titre: string; resume?: string };
  body: string;
  illustrationPath: string | null;
  busy: boolean;
  busyImage: boolean;
  disabled: boolean;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onGenerate: () => void;
  onIllustration: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { data: imageUrl } = useQuery({
    queryKey: ["illustration", illustrationPath],
    enabled: Boolean(illustrationPath),
    queryFn: () => signedUrl(illustrationPath),
  });

  return (
    <div className="card-premium p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[200px] flex-1">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Chapitre {index + 1}
          </div>
          <input
            value={chapter.titre}
            onChange={(e) => onTitle(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-transparent bg-transparent font-display text-base font-bold outline-none focus:border-input focus:bg-card focus:px-2 focus:py-1"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="Monter" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp size={14} />
          </IconButton>
          <IconButton label="Descendre" onClick={() => onMove(1)} disabled={index === total - 1}>
            <ArrowDown size={14} />
          </IconButton>
          <IconButton label="Supprimer" onClick={onDelete} destructive>
            <Trash2 size={14} />
          </IconButton>
          <button
            onClick={onIllustration}
            disabled={busyImage}
            className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busyImage ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImagePlus size={14} />
            )}
            Image
          </button>
          <button
            onClick={onGenerate}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : body ? (
              <Check size={14} />
            ) : (
              <Wand2 size={14} />
            )}
            {body ? "Régénérer" : "Rédiger"} ({CREDITS.chapter})
          </button>
        </div>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Illustration du chapitre ${index + 1}`}
          className="mt-4 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      <textarea
        value={body}
        onChange={(e) => onBody(e.target.value)}
        rows={14}
        placeholder="Le contenu du chapitre apparaîtra ici."
        className="mt-4 w-full resize-y rounded-xl border border-input bg-card p-4 text-sm leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-ring/15"
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border border-input p-2.5 transition-colors disabled:opacity-40",
        destructive ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
