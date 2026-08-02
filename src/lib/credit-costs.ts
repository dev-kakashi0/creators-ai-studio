/** Actions facturables et coûts par défaut (surchargés par la table `credit_costs`). */

export const DEFAULT_CREDIT_COSTS = {
  outline: 1,
  chapter: 2,
  ebook_standard: 10,
  ebook_premium: 20,
  cover: 2,
  illustration: 1,
  marketing_pack: 5,
  copy: 1,
} as const;

export type CreditActionKey = keyof typeof DEFAULT_CREDIT_COSTS;

export type CreditCost = {
  key: string;
  label: string;
  description: string | null;
  credits: number;
  sort_order: number;
};

export const CREDIT_ACTION_LABELS: Record<CreditActionKey, string> = {
  outline: "Plan d'ebook",
  chapter: "Chapitre",
  ebook_standard: "Ebook complet (20-50 pages)",
  ebook_premium: "Ebook premium (100+ pages)",
  cover: "Couverture",
  illustration: "Illustration",
  marketing_pack: "Pack marketing IA",
  copy: "Outil de copywriting",
};

/** Seuils d'alerte affichés dans la barre de navigation. */
export const LOW_CREDITS = 20;
export const CRITICAL_CREDITS = 5;
