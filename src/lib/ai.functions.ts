import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "google/gemini-3.6-flash";

async function callGateway(messages: Array<{ role: string; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Service IA indisponible.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (res.status === 429) throw new Error("Trop de requêtes IA. Réessaie dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA de l'espace épuisés.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`AI gateway error [${res.status}]: ${body}`);
    throw new Error("La génération IA a échoué.");
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

function extractJson(raw: string) {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
}

const OutlineInput = z.object({
  topic: z.string().trim().min(3).max(300),
  audience: z.string().trim().max(200).optional().default(""),
  tone: z.string().trim().max(80).optional().default("professionnel et accessible"),
  chapterCount: z.number().int().min(3).max(12).optional().default(6),
});

export const generateOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OutlineInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("consume_credits", {
      _amount: 5,
      _reason: "ebook_outline",
    });
    if (error) throw new Error("Crédits IA insuffisants.");

    const raw = await callGateway([
      {
        role: "system",
        content:
          "Tu es un ghostwriter expert en ebooks. Réponds UNIQUEMENT en JSON valide, sans markdown.",
      },
      {
        role: "user",
        content: `Crée le plan d'un ebook en français.
Sujet : ${data.topic}
Audience : ${data.audience || "grand public"}
Ton : ${data.tone}
Nombre de chapitres : ${data.chapterCount}

Format JSON strict :
{"titre":"...","sous_titre":"...","introduction":"3 paragraphes","chapitres":[{"titre":"...","resume":"2 phrases"}],"conclusion":"2 paragraphes"}`,
      },
    ]);

    return extractJson(raw) as {
      titre: string;
      sous_titre?: string;
      introduction: string;
      chapitres: Array<{ titre: string; resume?: string }>;
      conclusion: string;
    };
  });

const ChapterInput = z.object({
  bookTitle: z.string().trim().min(1).max(300),
  chapterTitle: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(1000).optional().default(""),
  audience: z.string().trim().max(200).optional().default(""),
  tone: z.string().trim().max(80).optional().default("professionnel et accessible"),
});

export const generateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChapterInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("consume_credits", {
      _amount: 3,
      _reason: "ebook_chapter",
    });
    if (error) throw new Error("Crédits IA insuffisants.");

    const content = await callGateway([
      {
        role: "system",
        content:
          "Tu es un ghostwriter expert. Rédige un chapitre d'ebook en français, structuré, concret et actionnable. Utilise des sous-titres en markdown (##) et des listes quand c'est utile.",
      },
      {
        role: "user",
        content: `Ebook : ${data.bookTitle}
Chapitre : ${data.chapterTitle}
Résumé attendu : ${data.summary}
Audience : ${data.audience || "grand public"}
Ton : ${data.tone}

Rédige 700 à 1000 mots.`,
      },
    ]);

    return { content };
  });
