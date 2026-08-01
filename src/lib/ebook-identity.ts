import type { Tables } from "@/integrations/supabase/types";
import type { BookIdentity, BrandingJson } from "@/lib/ebook-brand";

type Ebook = Tables<"ebooks">;

export function brandingOf(ebook: Pick<Ebook, "branding">): BrandingJson {
  const value = ebook.branding;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as BrandingJson) : {};
}

/** Construit l'identité d'export à partir de la ligne `ebooks`. */
export function identityOf(
  ebook: Ebook,
  assets?: { authorPhotoDataUrl?: string | null; logoDataUrl?: string | null },
): BookIdentity {
  const branding = brandingOf(ebook);
  return {
    authorName: ebook.author_name ?? "",
    authorBio: ebook.author_bio,
    authorPhotoDataUrl: assets?.authorPhotoDataUrl ?? null,
    logoDataUrl: assets?.logoDataUrl ?? null,
    website: ebook.website,
    publisher: ebook.publisher,
    email: branding.email ?? null,
    socials: branding.socials ?? null,
    edition: branding.edition ?? null,
    themeId: ebook.theme ?? "modern",
    quality: ebook.quality ?? "premium",
    primary: branding.primary ?? null,
    secondary: branding.secondary ?? null,
    accent: branding.accent ?? null,
    font: branding.font ?? null,
  };
}

/** Le filigrane Solenya n'apparaît que pour le plan gratuit. */
export function watermarkForPlan(plan?: string | null) {
  return (plan ?? "free") === "free";
}
