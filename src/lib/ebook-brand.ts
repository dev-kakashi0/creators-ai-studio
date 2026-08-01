/** Thèmes de livre, identité de marque et niveaux de qualité. */

export type Rgb = [number, number, number];

export type ThemeTokens = {
  id: string;
  label: string;
  hint: string;
  recommended?: boolean;
  /** Couleurs par défaut du thème (RGB). */
  primary: Rgb;
  secondary: Rgb;
  accent: Rgb;
  ink: Rgb;
  muted: Rgb;
  surface: Rgb;
  page: Rgb;
  /** Police jsPDF de base. */
  font: "helvetica" | "times" | "courier";
  headingFont: "helvetica" | "times" | "courier";
  /** Style de la page de séparation de chapitre. */
  separator: "band" | "minimal" | "framed" | "solid";
  dropCap: boolean;
  swatch: string[];
};

export const THEMES: ThemeTokens[] = [
  {
    id: "modern",
    label: "Modern Professional",
    hint: "Épuré, élégant, business — IA, marketing, finance",
    recommended: true,
    primary: [37, 71, 214],
    secondary: [17, 20, 35],
    accent: [96, 132, 255],
    ink: [24, 28, 44],
    muted: [122, 129, 152],
    surface: [240, 244, 255],
    page: [255, 255, 255],
    font: "helvetica",
    headingFont: "helvetica",
    separator: "band",
    dropCap: true,
    swatch: ["#2547D6", "#111423", "#6084FF"],
  },
  {
    id: "minimalist",
    label: "Minimalist",
    hint: "Inspiré d'Apple et Notion — beaucoup de blanc",
    primary: [26, 26, 26],
    secondary: [90, 90, 90],
    accent: [150, 150, 150],
    ink: [20, 20, 20],
    muted: [140, 140, 140],
    surface: [246, 246, 246],
    page: [255, 255, 255],
    font: "helvetica",
    headingFont: "helvetica",
    separator: "minimal",
    dropCap: false,
    swatch: ["#1A1A1A", "#5A5A5A", "#F6F6F6"],
  },
  {
    id: "luxury",
    label: "Luxury",
    hint: "Noir & or, premium — coachs et livres haut de gamme",
    primary: [176, 141, 62],
    secondary: [16, 16, 18],
    accent: [212, 175, 96],
    ink: [22, 22, 24],
    muted: [130, 122, 104],
    surface: [248, 243, 231],
    page: [255, 253, 248],
    font: "times",
    headingFont: "times",
    separator: "framed",
    dropCap: true,
    swatch: ["#B08D3E", "#101012", "#D4AF60"],
  },
  {
    id: "academic",
    label: "Academic",
    hint: "Manuels, rapports, formations et recherche",
    primary: [21, 74, 92],
    secondary: [33, 40, 48],
    accent: [86, 143, 160],
    ink: [26, 30, 36],
    muted: [116, 124, 134],
    surface: [238, 245, 247],
    page: [255, 255, 255],
    font: "times",
    headingFont: "times",
    separator: "minimal",
    dropCap: false,
    swatch: ["#154A5C", "#212830", "#568FA0"],
  },
  {
    id: "startup",
    label: "Startup",
    hint: "Tech, SaaS, IA — cartes et illustrations modernes",
    primary: [111, 63, 233],
    secondary: [15, 18, 34],
    accent: [0, 196, 180],
    ink: [22, 25, 40],
    muted: [124, 130, 152],
    surface: [244, 240, 255],
    page: [255, 255, 255],
    font: "helvetica",
    headingFont: "helvetica",
    separator: "solid",
    dropCap: false,
    swatch: ["#6F3FE9", "#00C4B4", "#0F1222"],
  },
  {
    id: "magazine",
    label: "Magazine",
    hint: "Visuel, grandes images, typographie généreuse",
    primary: [223, 60, 62],
    secondary: [24, 24, 28],
    accent: [255, 143, 84],
    ink: [22, 22, 26],
    muted: [128, 128, 138],
    surface: [253, 240, 238],
    page: [255, 255, 255],
    font: "helvetica",
    headingFont: "times",
    separator: "solid",
    dropCap: true,
    swatch: ["#DF3C3E", "#FF8F54", "#18181C"],
  },
  {
    id: "corporate",
    label: "Corporate",
    hint: "Documentation d'entreprise, rapports formels",
    primary: [12, 90, 140],
    secondary: [28, 36, 48],
    accent: [70, 150, 200],
    ink: [24, 30, 40],
    muted: [116, 126, 140],
    surface: [236, 244, 250],
    page: [255, 255, 255],
    font: "helvetica",
    headingFont: "helvetica",
    separator: "band",
    dropCap: false,
    swatch: ["#0C5A8C", "#4696C8", "#1C2430"],
  },
];

export const QUALITIES = [
  { id: "draft", label: "Brouillon", hint: "Génération rapide", illustrationsEveryN: 0, words: 0.7 },
  { id: "standard", label: "Standard", hint: "Équilibré", illustrationsEveryN: 3, words: 1 },
  {
    id: "premium",
    label: "Premium",
    hint: "Meilleure mise en page, plus d'illustrations",
    recommended: true,
    illustrationsEveryN: 2,
    words: 1.2,
  },
  {
    id: "publisher",
    label: "Qualité éditeur",
    hint: "Maquette maximale, prêt pour Amazon KDP",
    illustrationsEveryN: 1,
    words: 1.45,
  },
] as const;

export type QualityId = (typeof QUALITIES)[number]["id"];

export function themeTokens(id?: string | null) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function qualityConfig(id?: string | null) {
  return QUALITIES.find((q) => q.id === id) ?? QUALITIES[2];
}

export const FONT_CHOICES = [
  { id: "helvetica", label: "Sans serif moderne" },
  { id: "times", label: "Serif éditorial" },
  { id: "courier", label: "Monospace technique" },
] as const;

/** Identité complète appliquée au livre exporté. */
export type BookIdentity = {
  authorName: string;
  authorBio?: string | null;
  authorPhotoDataUrl?: string | null;
  logoDataUrl?: string | null;
  website?: string | null;
  publisher?: string | null;
  email?: string | null;
  socials?: string | null;
  edition?: string | null;
  themeId: string;
  quality: string;
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  font?: string | null;
};

export type BrandingJson = {
  primary?: string;
  secondary?: string;
  accent?: string;
  font?: string;
  email?: string;
  socials?: string;
  edition?: string;
};

export function hexToRgb(hex?: string | null): Rgb | null {
  if (!hex) return null;
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: Rgb) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Fusionne un thème avec les couleurs personnalisées de l'utilisateur. */
export function resolvePalette(identity: BookIdentity): ThemeTokens {
  const base = themeTokens(identity.themeId);
  const font = (identity.font as ThemeTokens["font"]) || base.font;
  return {
    ...base,
    primary: hexToRgb(identity.primary) ?? base.primary,
    secondary: hexToRgb(identity.secondary) ?? base.secondary,
    accent: hexToRgb(identity.accent) ?? base.accent,
    font,
    headingFont: font === "courier" ? base.headingFont : font,
  };
}

export const DEFAULT_AUTHOR = "Auteur indépendant";

export function authorOrFallback(name?: string | null) {
  const value = (name ?? "").trim();
  return value.length ? value : DEFAULT_AUTHOR;
}
