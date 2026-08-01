import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateChapter, generateOutline, type GeneratedOutline } from "@/lib/ai.functions";
import { generateCover, generateIllustration } from "@/lib/cover.functions";
import { uploadImage } from "@/lib/ebook-assets";
import { lengthConfig } from "@/lib/ebook-config";

export type StepState = "pending" | "running" | "done" | "error";

export type GenerationStep = {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
};

const STEPS: Array<{ id: string; label: string }> = [
  { id: "research", label: "Analyse du sujet" },
  { id: "outline", label: "Construction du plan" },
  { id: "chapters", label: "Rédaction des chapitres" },
  { id: "readability", label: "Amélioration de la lisibilité" },
  { id: "illustrations", label: "Génération des illustrations" },
  { id: "cover", label: "Création de la couverture" },
  { id: "toc", label: "Sommaire et mise en page" },
  { id: "finalize", label: "Finalisation du livre" },
];

export type GenerationBrief = {
  topic: string;
  language: string;
  style: string;
  audience: string;
  length: string;
  withIllustrations: boolean;
  authorName?: string;
  publisher?: string;
  website?: string;
  theme?: string;
  quality?: string;
};


/** Exécute des tâches en parallèle avec une limite de concurrence. */
async function pool<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function useEbookGeneration() {
  const runOutline = useServerFn(generateOutline);
  const runChapter = useServerFn(generateChapter);
  const runCover = useServerFn(generateCover);
  const runIllustration = useServerFn(generateIllustration);

  const [steps, setSteps] = useState<GenerationStep[]>(
    STEPS.map((s) => ({ ...s, state: "pending" as StepState })),
  );
  const [running, setRunning] = useState(false);
  const inFlight = useRef(false);

  const update = useCallback((id: string, patch: Partial<GenerationStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const reset = useCallback(() => {
    setSteps(STEPS.map((s) => ({ ...s, state: "pending" as StepState })));
  }, []);

  const generate = useCallback(
    async (brief: GenerationBrief): Promise<string> => {
      if (inFlight.current) throw new Error("Une génération est déjà en cours.");
      inFlight.current = true;
      setRunning(true);
      reset();

      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) throw new Error("Session expirée.");

        const cfg = lengthConfig(brief.length);

        // 1 & 2 — plan
        update("research", { state: "running" });
        const outline = (await runOutline({
          data: {
            topic: brief.topic,
            audience: brief.audience,
            style: brief.style,
            language: brief.language,
            length: brief.length,
          },
        })) as GeneratedOutline;
        update("research", { state: "done" });
        update("outline", {
          state: "done",
          detail: `${outline.chapitres?.length ?? 0} chapitres`,
        });

        const { data: created, error: createError } = await supabase
          .from("ebooks")
          .insert({
            user_id: userId,
            title: outline.titre || brief.topic,
            subtitle: outline.sous_titre ?? null,
            topic: brief.topic,
            audience: brief.audience,
            tone: brief.style,
            style: brief.style,
            language: brief.language,
            length: brief.length,
            outline: outline as never,
            chapters: new Array(outline.chapitres?.length ?? 0).fill("") as never,
            status: "draft",
            author_name: brief.authorName ?? null,
            publisher: brief.publisher || null,
            website: brief.website || null,
            theme: brief.theme ?? "modern",
            quality: brief.quality ?? "premium",

          })
          .select("id")
          .single();
        if (createError || !created) throw new Error("Impossible de créer l'ebook.");
        const ebookId = created.id;

        // 3 — chapitres (parallélisés)
        const list = outline.chapitres ?? [];
        update("chapters", { state: "running", detail: `0/${list.length}` });
        let done = 0;
        const chapters = await pool(list, 3, async (chapter, index) => {
          const result = await runChapter({
            data: {
              bookTitle: outline.titre,
              chapterTitle: chapter.titre,
              chapterIndex: index,
              summary: chapter.resume ?? "",
              points: chapter.points ?? [],
              audience: brief.audience,
              style: brief.style,
              language: brief.language,
              length: brief.length,
            },
          });
          done += 1;
          update("chapters", { detail: `${done}/${list.length}` });
          return result.content;
        });
        update("chapters", { state: "done", detail: `${list.length} chapitres` });
        await supabase
          .from("ebooks")
          .update({ chapters: chapters as never })
          .eq("id", ebookId);

        // 4 — lisibilité (mise en forme appliquée à la rédaction)
        update("readability", { state: "running" });
        update("readability", { state: "done", detail: `${cfg.pages}` });

        // 5 — illustrations
        let illustrations: Array<string | null> = [];
        if (brief.withIllustrations) {
          update("illustrations", { state: "running", detail: `0/${list.length}` });
          let doneImages = 0;
          illustrations = await pool(list, 2, async (chapter, index) => {
            try {
              const { dataUrl } = await runIllustration({
                data: {
                  bookTitle: outline.titre,
                  chapterTitle: chapter.titre,
                  summary: chapter.resume ?? "",
                },
              });
              const path = await uploadImage(`${userId}/${ebookId}/ch-${index}.png`, dataUrl);
              doneImages += 1;
              update("illustrations", { detail: `${doneImages}/${list.length}` });
              return path;
            } catch {
              doneImages += 1;
              update("illustrations", { detail: `${doneImages}/${list.length}` });
              return null;
            }
          });
          update("illustrations", { state: "done" });
          await supabase
            .from("ebooks")
            .update({ illustrations: illustrations as never })
            .eq("id", ebookId);
        } else {
          update("illustrations", { state: "done", detail: "ignorées" });
        }

        // 6 — couverture
        update("cover", { state: "running" });
        try {
          const { dataUrl } = await runCover({
            data: {
              title: outline.titre,
              subtitle: outline.sous_titre ?? "",
              topic: brief.topic,
            },
          });
          const path = await uploadImage(`${userId}/${ebookId}/cover.png`, dataUrl);
          await supabase.from("ebooks").update({ cover_url: path }).eq("id", ebookId);
          update("cover", { state: "done" });
        } catch {
          update("cover", { state: "error", detail: "à régénérer" });
        }

        // 7 & 8 — assemblage
        update("toc", { state: "done" });
        update("finalize", { state: "running" });
        await supabase
          .from("ebooks")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", ebookId);
        update("finalize", { state: "done" });

        return ebookId;
      } finally {
        inFlight.current = false;
        setRunning(false);
      }
    },
    [reset, runChapter, runCover, runIllustration, runOutline, update],
  );

  return { steps, running, generate, reset };
}
