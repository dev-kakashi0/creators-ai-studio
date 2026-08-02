import { languageLabel, styleLabel } from "@/lib/ebook-config";

const MODEL = "google/gemini-3.6-flash";

async function ask(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Service IA indisponible.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Trop de requêtes IA. Réessaie dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA de l'espace épuisés.");
  if (!res.ok) {
    console.error(`AI gateway error [${res.status}]: ${await res.text()}`);
    throw new Error("La génération IA a échoué.");
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export type MarketingPackInput = {
  product: string;
  details: string;
  audience: string;
  language: string;
  style: string;
};

/** Génère les trois livrables du pack marketing en parallèle. */
export async function runMarketingPack(data: MarketingPackInput) {
  const system = `Tu es un copywriter de conversion senior. Tu écris en ${languageLabel(
    data.language,
  )} dans un style ${styleLabel(
    data.style,
  )}. Formate en markdown avec des titres "## " et des listes. Aucun méta-commentaire.`;

  const brief = `Produit : ${data.product}
Détails : ${data.details || "non précisé"}
Audience : ${data.audience || "grand public"}`;

  const [salesPage, socialPosts, emailSequence] = await Promise.all([
    ask(
      system,
      `${brief}\n\nRédige une page de vente complète : accroche, problème, promesse, bénéfices, contenu détaillé, preuve sociale, garantie, offre, FAQ, appel à l'action.`,
    ),
    ask(
      system,
      `${brief}\n\nÉcris un pack de posts sociaux : 5 légendes Instagram, 3 scripts TikTok de 30 secondes, 3 posts LinkedIn. Chaque bloc avec son hook et son appel à l'action.`,
    ),
    ask(
      system,
      `${brief}\n\nÉcris une séquence de 5 emails de lancement : jour d'envoi, objet, préheader, corps, appel à l'action.`,
    ),
  ]);

  return { salesPage, socialPosts, emailSequence };
}
