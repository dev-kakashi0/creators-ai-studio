import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type EbookOutline = {
  titre?: string;
  sous_titre?: string;
  introduction?: string;
  chapitres?: Array<{ titre: string; resume?: string }>;
  conclusion?: string;
};

export type EbookDoc = {
  title: string;
  audience?: string | null;
  outline: EbookOutline;
  chapters: string[];
};

function paragraphs(text: string) {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => {
      const heading = line.match(/^#{2,3}\s+(.*)$/);
      if (heading) {
        return new Paragraph({ text: heading[1], heading: HeadingLevel.HEADING_2 });
      }
      return new Paragraph({ children: [new TextRun(line.replace(/^[#*-]\s*/, ""))] });
    });
}

export async function exportDocx(ebook: EbookDoc) {
  const outline = ebook.outline ?? {};
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: outline.titre || ebook.title, heading: HeadingLevel.TITLE }),
          ...(outline.sous_titre ? [new Paragraph({ text: outline.sous_titre })] : []),
          ...(ebook.audience ? [new Paragraph({ text: ebook.audience })] : []),
          new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_1 }),
          ...paragraphs(outline.introduction ?? ""),
          ...(outline.chapitres ?? []).flatMap((chapter, i) => [
            new Paragraph({
              text: `Chapitre ${i + 1} — ${chapter.titre}`,
              heading: HeadingLevel.HEADING_1,
              pageBreakBefore: true,
            }),
            ...paragraphs(ebook.chapters?.[i] ?? chapter.resume ?? ""),
          ]),
          new Paragraph({
            text: "Conclusion",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
          }),
          ...paragraphs(outline.conclusion ?? ""),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${(outline.titre || ebook.title).replace(/[^\p{L}\p{N} _-]/gu, "")}.docx`;
  link.click();
  URL.revokeObjectURL(link.href);
}
