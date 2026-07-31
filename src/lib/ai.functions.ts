import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CREDITS, languageLabel, lengthConfig, styleLabel } from "@/lib/ebook-config";

const MODEL = "google/gemini-3.6-flash";

async function callGateway(
  messages: Array<{ role: string; content: string }>,
  options?: { json?: boolean },
) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Service IA indisponible.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
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

const Common = {
  language: z.string().trim().max(10).optional().default("fr"),
  style: z.string().trim().max(40).optional().default("professionnel"),
  audience: z.string().trim().max(200).optional().default(""),
};

const OutlineInput = z.object({
  topic: z.string().trim().min(3).max(300),
  length: z.string().trim().max(20).optional().default("standard"),
  ...Common,
});

export type GeneratedOutline = {
  titre: string;
  sous_titre?: string;
  introduction: string;
  chapitres: Array<{ titre: string; resume?: string; points?: string[] }>;
  conclusion: string;
  cta?: string;
};

export const generateOutline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OutlineInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, CREDITS.outline, "ebook_outline");

    const cfg = lengthConfig(data.length);

    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            "Tu es un ghostwriter d'ebooks best-sellers. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni commentaire.",
        },
        {
          role: "user",
          content: `Conçois la structure complète d'un ebook professionnel prêt à publier.
Langue de rédaction : ${languageLabel(data.language)}
Idée / titre de départ : ${data.topic}
Audience cible : ${data.audience || "grand public"}
Style d'écriture : ${styleLabel(data.style)}
Nombre de chapitres : ${cfg.chapters}

Contraintes : titre commercial et accrocheur, sous-titre qui explicite la promesse, introduction en 3 paragraphes, chapitres progressifs et non redondants, conclusion en 2 paragraphes, appel à l'action final.

Réponds avec ce JSON strict :
{"titre":"...","sous_titre":"...","introduction":"...","chapitres":[{"titre":"...","resume":"2 phrases","points":["3 à 5 points clés"]}],"conclusion":"...","cta":"2 phrases"}`,
        },
      ],
      { json: true },
    );

    return extractJson(raw) as GeneratedOutline;
  });

const ChapterInput = z.object({
  bookTitle: z.string().trim().min(1).max(300),
  chapterTitle: z.string().trim().min(1).max(300),
  chapterIndex: z.number().int().min(0).max(50).optional().default(0),
  summary: z.string().trim().max(2000).optional().default(""),
  points: z.array(z.string().trim().max(300)).max(10).optional().default([]),
  length: z.string().trim().max(20).optional().default("standard"),
  ...Common,
});

export const generateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChapterInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, CREDITS.chapter, "ebook_chapter");

    const cfg = lengthConfig(data.length);

    const content = await callGateway([
      {
        role: "system",
        content: `Tu es un ghostwriter d'ebooks professionnels. Tu rédiges en ${languageLabel(
          data.language,
        )} dans un style ${styleLabel(data.style)}.
Règles de mise en forme obligatoires :
- structure en sous-sections avec des titres markdown "## "
- paragraphes courts (3 à 4 lignes maximum), jamais de bloc massif
- au moins un exemple concret introduit par "**Exemple :**"
- au moins un encadré de conseils introduit par "**Astuce :**"
- une liste à puces "- " par sous-section quand c'est pertinent
- terminer par une sous-section "## À retenir" avec 3 puces
- ne jamais répéter le titre du chapitre en H1, ne pas écrire de méta-commentaire`,
      },
      {
        role: "user",
        content: `Ebook : ${data.bookTitle}
Chapitre ${data.chapterIndex + 1} : ${data.chapterTitle}
Angle attendu : ${data.summary}
Points à couvrir : ${data.points.join(" ; ") || "libre"}
Audience : ${data.audience || "grand public"}

Rédige environ ${cfg.words} mots.`,
      },
    ]);

    return { content };
  });

export const COPY_KINDS = [
  { id: "sales_page", label: "Page de vente", icon: "megaphone" },
  { id: "amazon", label: "Description Amazon", icon: "shopping-bag" },
  { id: "gumroad", label: "Description Gumroad", icon: "shopping-bag" },
  { id: "payhip", label: "Description Payhip", icon: "shopping-bag" },
  { id: "landing", label: "Landing page", icon: "layout" },
  { id: "facebook_ads", label: "Publicités Facebook", icon: "target" },
  { id: "tiktok", label: "Scripts TikTok", icon: "video" },
  { id: "instagram", label: "Légendes Instagram", icon: "instagram" },
  { id: "email", label: "Séquence email", icon: "mail" },
  { id: "whatsapp", label: "Campagne WhatsApp", icon: "message-circle" },
  { id: "keywords", label: "Mots-clés SEO", icon: "search" },
  { id: "hashtags", label: "Hashtags", icon: "hash" },
  { id: "pricing", label: "Suggestions de prix", icon: "tag" },
] as const;

export type CopyKind = (typeof COPY_KINDS)[number]["id"];

const COPY_PROMPTS: Record<CopyKind, string> = {
  sales_page:
    "Rédige une page de vente complète : accroche, problème, promesse, bénéfices, contenu détaillé, preuve sociale, garantie, offre, FAQ, appel à l'action.",
  amazon:
    "Rédige une description produit Amazon Kindle : accroche, bénéfices en puces, description enrichie, mots-clés naturels, appel à l'action.",
  gumroad:
    "Rédige une description Gumroad courte et vendeuse : accroche, à qui c'est destiné, ce qui est inclus, résultats attendus, appel à l'action.",
  payhip:
    "Rédige une description Payhip : promesse claire, sommaire du produit, bénéfices, format livré, appel à l'action.",
  landing:
    "Rédige le contenu complet d'une landing page : titre, sous-titre, 3 blocs bénéfices, section preuve, section objections, CTA principal et secondaire.",
  facebook_ads:
    "Écris 5 publicités Facebook : accroche, corps de texte court, CTA. Varie les angles (douleur, désir, curiosité, preuve, urgence).",
  tiktok:
    "Écris 5 scripts TikTok de 30 secondes : hook 3 secondes, développement, chute, call-to-action. Indique les plans visuels.",
  instagram:
    "Écris 6 légendes Instagram engageantes avec émojis pertinents et un appel à l'action, dans des formats variés.",
  email:
    "Écris une séquence de 5 emails de lancement : objet, préheader, corps, CTA. Précise le jour d'envoi et l'objectif de chaque email.",
  whatsapp:
    "Écris une campagne WhatsApp de 4 messages courts, conversationnels, avec emojis modérés et un lien d'action.",
  keywords:
    "Liste 30 mots-clés pertinents classés en 3 groupes : forte intention, informationnels, longue traîne.",
  hashtags:
    "Liste 30 hashtags classés en 3 groupes : larges, de niche, communautaires. Format prêt à copier.",
  pricing:
    "Propose une stratégie de prix : 3 paliers argumentés, prix psychologique conseillé, bonus, offre de lancement et justification.",
};

const CopyInput = z.object({
  kind: z.enum(COPY_KINDS.map((k) => k.id) as [CopyKind, ...CopyKind[]]),
  product: z.string().trim().min(3).max(300),
  details: z.string().trim().max(2000).optional().default(""),
  ...Common,
});

export const generateMarketingCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CopyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { consumeCredits } = await import("@/lib/credits.server");
    await consumeCredits(context.userId, CREDITS.copy, `copy_${data.kind}`);

    const content = await callGateway([
      {
        role: "system",
        content: `Tu es un copywriter de conversion senior. Tu écris en ${languageLabel(
          data.language,
        )} dans un style ${styleLabel(
          data.style,
        )}. Formate ta réponse en markdown lisible avec des titres "## " et des listes. Pas de méta-commentaire.`,
      },
      {
        role: "user",
        content: `Produit : ${data.product}
Détails : ${data.details || "non précisé"}
Audience : ${data.audience || "grand public"}

${COPY_PROMPTS[data.kind]}`,
      },
    ]);

    return { content };
  });
