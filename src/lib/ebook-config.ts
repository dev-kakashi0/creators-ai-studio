/** Configuration partagée du studio ebook : styles, longueurs, langues, coûts. */

export const LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "Anglais" },
  { id: "es", label: "Espagnol" },
  { id: "de", label: "Allemand" },
  { id: "pt", label: "Portugais" },
  { id: "it", label: "Italien" },
] as const;

export const STYLES = [
  { id: "professionnel", label: "Professionnel", hint: "Clair, crédible, orienté résultats" },
  { id: "amical", label: "Amical", hint: "Chaleureux, tutoiement, proche du lecteur" },
  { id: "pedagogique", label: "Pédagogique", hint: "Explications pas à pas, exemples" },
  { id: "persuasif", label: "Persuasif", hint: "Argumenté, orienté conversion" },
  { id: "storytelling", label: "Storytelling", hint: "Récits, anecdotes, immersion" },
] as const;

export const LENGTHS = [
  { id: "mini", label: "Mini", pages: "≈ 20 pages", chapters: 5, words: 700 },
  { id: "standard", label: "Standard", pages: "≈ 50 pages", chapters: 8, words: 1100 },
  { id: "premium", label: "Premium", pages: "100+ pages", chapters: 12, words: 1600 },
] as const;

export const AUDIENCES = [
  "Entrepreneurs débutants",
  "Freelances & indépendants",
  "Marketeurs & growth",
  "Coachs & formateurs",
  "Créateurs de contenu",
  "Étudiants",
  "Grand public",
] as const;

export type LengthId = (typeof LENGTHS)[number]["id"];

export const CREDITS = {
  outline: 1,
  chapter: 1,
  illustration: 1,
  cover: 2,
  copy: 1,
} as const;

export function lengthConfig(id: string) {
  return LENGTHS.find((l) => l.id === id) ?? LENGTHS[1];
}

export function styleLabel(id: string) {
  return STYLES.find((s) => s.id === id)?.label ?? STYLES[0].label;
}

export function languageLabel(id: string) {
  return LANGUAGES.find((l) => l.id === id)?.label ?? "Français";
}

/** Coût total estimé d'une génération complète. */
export function generationCost(lengthId: string, withIllustrations: boolean, withCover: boolean) {
  const { chapters } = lengthConfig(lengthId);
  return (
    CREDITS.outline +
    chapters * CREDITS.chapter +
    (withIllustrations ? chapters * CREDITS.illustration : 0) +
    (withCover ? CREDITS.cover : 0)
  );
}
