import type { EbookOutline } from "@/lib/export-docx";

export function PrintableEbook({
  outline,
  chapters,
  audience,
  createdAt,
}: {
  outline: EbookOutline;
  chapters: string[];
  audience?: string | null;
  createdAt: string;
}) {
  if (!outline?.titre) return null;

  return (
    <div className="pdf-printable hidden print:block">
      <div className="flex flex-col items-center justify-center px-10 py-24 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Solenya · Studio de création
        </div>
        <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold">{outline.titre}</h1>
        {outline.sous_titre && (
          <p className="mt-3 text-base text-muted-foreground">{outline.sous_titre}</p>
        )}
        <div className="my-6 h-0.5 w-16 rounded bg-primary" />
        <div className="text-sm text-muted-foreground">{audience || "Guide pratique"}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="pdf-chapter px-10 pb-8">
        <h2 className="mb-3 font-display text-xl font-bold">Introduction</h2>
        <p className="whitespace-pre-wrap leading-relaxed">{outline.introduction}</p>
      </div>

      {(outline.chapitres ?? []).map((chapter, i) => (
        <div key={i} className="pdf-chapter px-10 pb-8">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Chapitre {i + 1}
          </div>
          <h2 className="mb-3 font-display text-xl font-bold">{chapter.titre}</h2>
          <p className="whitespace-pre-wrap leading-relaxed">
            {chapters[i] || chapter.resume || ""}
          </p>
        </div>
      ))}

      <div className="pdf-chapter px-10 pb-16">
        <h2 className="mb-3 font-display text-xl font-bold">Conclusion</h2>
        <p className="whitespace-pre-wrap leading-relaxed">{outline.conclusion}</p>
      </div>
    </div>
  );
}
