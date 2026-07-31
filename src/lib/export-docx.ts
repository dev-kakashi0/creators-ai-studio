import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export type EbookOutline = {
  titre?: string;
  sous_titre?: string;
  introduction?: string;
  chapitres?: Array<{ titre: string; resume?: string; points?: string[] }>;
  conclusion?: string;
  cta?: string;
};

export type EbookDoc = {
  title: string;
  audience?: string | null;
  outline: EbookOutline;
  chapters: string[];
  coverDataUrl?: string | null;
  illustrationDataUrls?: Array<string | null>;
};

function paragraphs(text: string) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const heading = line.match(/^#{1,4}\s+(.*)$/);
      if (heading) {
        return new Paragraph({
          text: heading[1].replace(/\*\*/g, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 260, after: 120 },
        });
      }
      const bullet = line.match(/^[-*•]\s+(.*)$/);
      if (bullet) {
        return new Paragraph({
          text: bullet[1].replace(/\*\*/g, ""),
          bullet: { level: 0 },
          spacing: { after: 80 },
        });
      }
      return new Paragraph({
        children: [new TextRun(line.replace(/\*\*/g, ""))],
        spacing: { after: 140, line: 300 },
      });
    });
}

async function imageParagraph(dataUrl: string, width: number, height: number) {
  const buffer = await (await fetch(dataUrl)).arrayBuffer();
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new ImageRun({
        data: buffer,
        type: "png",
        transformation: { width, height },
      }),
    ],
  });
}

export async function exportDocx(ebook: EbookDoc) {
  const outline = ebook.outline ?? {};
  const title = outline.titre || ebook.title;

  const children: Paragraph[] = [];

  if (ebook.coverDataUrl) {
    children.push(await imageParagraph(ebook.coverDataUrl, 440, 620));
    children.push(new Paragraph({ text: "", pageBreakBefore: true }));
  }

  children.push(
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
  );
  if (outline.sous_titre) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: outline.sous_titre, italics: true, size: 26 })],
      }),
    );
  }

  children.push(
    new Paragraph({ text: "Sommaire", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    new Paragraph({ text: "Introduction", bullet: { level: 0 } }),
    ...(outline.chapitres ?? []).map(
      (chapter, i) =>
        new Paragraph({ text: `Chapitre ${i + 1} — ${chapter.titre}`, bullet: { level: 0 } }),
    ),
    new Paragraph({ text: "Conclusion", bullet: { level: 0 } }),
  );

  children.push(
    new Paragraph({ text: "Introduction", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    ...paragraphs(outline.introduction ?? ""),
  );

  for (let i = 0; i < (outline.chapitres ?? []).length; i++) {
    const chapter = outline.chapitres![i];
    children.push(
      new Paragraph({
        text: `Chapitre ${i + 1} — ${chapter.titre}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
    );
    const illustration = ebook.illustrationDataUrls?.[i];
    if (illustration) children.push(await imageParagraph(illustration, 520, 292));
    children.push(...paragraphs(ebook.chapters?.[i] || chapter.resume || ""));
  }

  children.push(
    new Paragraph({ text: "Conclusion", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    ...paragraphs(outline.conclusion ?? ""),
  );
  if (outline.cta) {
    children.push(
      new Paragraph({ text: "Et maintenant ?", heading: HeadingLevel.HEADING_2 }),
      ...paragraphs(outline.cta),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "8A90A6" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "ebook"}.docx`;
  link.click();
  URL.revokeObjectURL(link.href);
}
