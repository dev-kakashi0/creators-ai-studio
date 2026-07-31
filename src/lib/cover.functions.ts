import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CREDITS } from "@/lib/ebook-config";

async function generateImage(prompt: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Service IA indisponible.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      stream: false,
    }),
  });

  if (res.status === 429) throw new Error("Trop de requêtes IA. Réessaie dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA de l'espace épuisés.");
  if (!res.ok) {
    console.error(`Image gateway error [${res.status}]: ${await res.text()}`);
    throw new Error("La génération d'image a échoué.");
  }

  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };

  const b64 = json.data?.[0]?.b64_json;
  const url = json.data?.[0]?.url ?? json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const dataUrl = b64 ? `data:image/png;base64,${b64}` : url;
  if (!dataUrl) throw new Error("Aucune image retournée par l'IA.");
  return dataUrl;
}

const CoverInput = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).optional().default(""),
  topic: z.string().trim().max(300).optional().default(""),
  style: z.string().trim().max(120).optional().default("moderne, minimaliste, bleu et blanc"),
});

/** Génère une couverture d'ebook et renvoie une image encodée en base64. */
export const generateCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, CREDITS.cover, "ebook_cover");

    const dataUrl = await generateImage(
      `Couverture de livre numérique premium, format portrait 2:3, qualité haute définition.
Titre du livre à afficher en grand, typographie éditoriale soignée : "${data.title}".
${data.subtitle ? `Sous-titre plus petit sous le titre : "${data.subtitle}".` : ""}
Thème du livre : ${data.topic}.
Direction artistique : ${data.style}. Composition équilibrée, dégradés subtils, contraste élevé, aspect librairie professionnelle.
Aucun texte parasite, aucune faute, aucune mention d'éditeur.`,
    );

    return { dataUrl };
  });

const IllustrationInput = z.object({
  bookTitle: z.string().trim().min(1).max(300),
  chapterTitle: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(600).optional().default(""),
});

/** Génère une illustration d'ouverture de chapitre. */
export const generateIllustration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IllustrationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, CREDITS.illustration, "ebook_illustration");

    const dataUrl = await generateImage(
      `Illustration éditoriale pour un chapitre de livre professionnel, format paysage 16:9.
Livre : "${data.bookTitle}". Chapitre : "${data.chapterTitle}". Idée : ${data.summary}.
Style : illustration vectorielle moderne et épurée, palette bleu, blanc et noir, formes géométriques douces, lumière subtile, aspect premium et cohérent d'un chapitre à l'autre.
Sans texte, sans lettres, sans logo, sans visage réaliste.`,
    );

    return { dataUrl };
  });
