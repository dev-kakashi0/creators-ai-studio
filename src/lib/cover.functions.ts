import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CoverInput = z.object({
  title: z.string().trim().min(1).max(200),
  topic: z.string().trim().max(300).optional().default(""),
  style: z.string().trim().max(120).optional().default("moderne, minimaliste, bleu et blanc"),
});

/** Génère une couverture d'ebook et renvoie une image encodée en base64. */
export const generateCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoverInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, 8, "ebook_cover");


    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Service IA indisponible.");

    const prompt = `Couverture d'ebook professionnelle, format portrait.
Titre affiché : "${data.title}".
Thème : ${data.topic}.
Style : ${data.style}. Typographie soignée, composition premium, sans texte parasite.`;

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
      throw new Error("La génération de couverture a échoué.");
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };

    const b64 = json.data?.[0]?.b64_json;
    const url = json.data?.[0]?.url ?? json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const dataUrl = b64 ? `data:image/png;base64,${b64}` : url;
    if (!dataUrl) throw new Error("Aucune image retournée par l'IA.");

    return { dataUrl };
  });
