import { jsPDF } from "jspdf";
import type { EbookOutline } from "@/lib/export-docx";
import {
  authorOrFallback,
  resolvePalette,
  type BookIdentity,
  type Rgb,
} from "@/lib/ebook-brand";

export type PdfEbook = {
  title: string;
  outline: EbookOutline;
  chapters: string[];
  /** data URLs (image/png|jpeg) */
  coverDataUrl?: string | null;
  illustrationDataUrls?: Array<string | null>;
  /** Mention discrète en dernière page (plan gratuit uniquement). */
  watermark?: boolean;
  identity: BookIdentity;
  language?: string | null;
  keywords?: string[];
};

const PAGE_W = 210;
const PAGE_H = 297;
const M_X = 24;
const M_TOP = 30;
const M_BOTTOM = 26;
const CONTENT_W = PAGE_W - M_X * 2;

type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "quote"; text: string }
  | { type: "callout"; kind: CalloutKind; label: string; text: string };

type CalloutKind = "tip" | "warning" | "pro" | "example" | "key";

const CALLOUTS: Array<{ kind: CalloutKind; match: RegExp; icon: string }> = [
  { kind: "tip", match: /^(astuce|tip|conseil)/i, icon: "★" },
  { kind: "warning", match: /^(attention|warning|erreur|piège)/i, icon: "!" },
  { kind: "pro", match: /^(pro|expert|avancé)/i, icon: "◆" },
  { kind: "example", match: /^(exemple|cas|étude)/i, icon: "▸" },
  { kind: "key", match: /^(clé|à retenir|résumé|takeaway|checklist|plan d'action|ressources)/i, icon: "✓" },
];

function calloutKind(label: string): CalloutKind | null {
  return CALLOUTS.find((c) => c.match.test(label))?.kind ?? null;
}

function clean(text: string) {
  return text.replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "").trim();
}

function parseMarkdown(raw: string): Block[] {
  const blocks: Block[] = [];
  for (const line of (raw ?? "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    const h = text.match(/^#{1,4}\s+(.*)$/);
    if (h) {
      blocks.push({ type: "h2", text: clean(h[1]) });
      continue;
    }
    const quote = text.match(/^>\s*(.*)$/);
    if (quote) {
      blocks.push({ type: "quote", text: clean(quote[1]) });
      continue;
    }
    const callout = text.match(/^\*\*(.{2,40}?)\s*:\*\*\s*(.*)$/);
    if (callout && callout[2]) {
      const label = clean(callout[1]);
      const kind = calloutKind(label);
      blocks.push({ type: "callout", kind: kind ?? "tip", label, text: clean(callout[2]) });
      continue;
    }
    const li = text.match(/^[-*•]\s+(.*)$/);
    if (li) {
      blocks.push({ type: "li", text: clean(li[1]) });
      continue;
    }
    blocks.push({ type: "p", text: clean(text) });
  }
  return blocks;
}

async function imageSize(dataUrl: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 16, h: 9 });
    img.src = dataUrl;
  });
}

function mix(a: Rgb, b: Rgb, ratio: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * ratio),
    Math.round(a[1] + (b[1] - a[1]) * ratio),
    Math.round(a[2] + (b[2] - a[2]) * ratio),
  ];
}

export async function exportPdf(ebook: PdfEbook) {
  const outline = ebook.outline ?? {};
  const title = outline.titre || ebook.title;
  const subtitle = outline.sous_titre ?? "";
  const theme = resolvePalette(ebook.identity);
  const author = authorOrFallback(ebook.identity.authorName);
  const publisher = (ebook.identity.publisher ?? "").trim();
  const white: Rgb = [255, 255, 255];
  const soft = mix(theme.surface, white, 0.25);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title,
    author,
    subject: subtitle || title,
    keywords: (ebook.keywords ?? []).join(", "),
    creator: publisher || author,
  });

  let y = M_TOP;
  const tocEntries: Array<{ label: string; page: number; level: 0 | 1 }> = [];

  const setFill = (c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);

  const newPage = () => {
    doc.addPage();
    y = M_TOP;
  };
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - M_BOTTOM) newPage();
  };

  // ---------------------------------------------------------------- Couverture
  if (ebook.coverDataUrl) {
    doc.addImage(ebook.coverDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
  } else {
    setFill(theme.secondary);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    setFill(theme.primary);
    doc.rect(0, PAGE_H - 120, PAGE_W, 6, "F");
  }

  // Voile + typographie composée sur la couverture
  setFill(theme.secondary);
  doc.setGState(doc.GState({ opacity: 0.62 }));
  doc.rect(0, PAGE_H - 132, PAGE_W, 132, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  setFill(theme.primary);
  doc.rect(M_X, PAGE_H - 116, 26, 2.4, "F");

  doc.setFont(theme.headingFont, "bold");
  doc.setFontSize(34);
  setText(white);
  const coverTitle = doc.splitTextToSize(title, CONTENT_W);
  doc.text(coverTitle, M_X, PAGE_H - 96);

  let coverY = PAGE_H - 96 + coverTitle.length * 13;
  if (subtitle) {
    doc.setFont(theme.font, "normal");
    doc.setFontSize(13);
    setText(mix(white, theme.muted, 0.35));
    const sub = doc.splitTextToSize(subtitle, CONTENT_W - 6);
    doc.text(sub, M_X, coverY + 2);
    coverY += sub.length * 6 + 4;
  }

  doc.setFont(theme.font, "bold");
  doc.setFontSize(12);
  setText(theme.accent);
  doc.text(author.toUpperCase(), M_X, PAGE_H - 30);
  if (publisher) {
    doc.setFont(theme.font, "normal");
    doc.setFontSize(9);
    setText(mix(white, theme.muted, 0.4));
    doc.text(publisher, M_X, PAGE_H - 22);
  }

  // ---------------------------------------------------------------- Page de titre
  newPage();
  doc.setFont(theme.headingFont, "bold");
  doc.setFontSize(30);
  setText(theme.ink);
  const titleLines = doc.splitTextToSize(title, CONTENT_W);
  doc.text(titleLines, PAGE_W / 2, 100, { align: "center" });

  if (subtitle) {
    doc.setFont(theme.font, "normal");
    doc.setFontSize(13);
    setText(theme.muted);
    doc.text(doc.splitTextToSize(subtitle, CONTENT_W - 10), PAGE_W / 2, 100 + titleLines.length * 11 + 6, {
      align: "center",
    });
  }

  setDraw(theme.primary);
  doc.setLineWidth(0.8);
  doc.line(PAGE_W / 2 - 18, 190, PAGE_W / 2 + 18, 190);

  doc.setFont(theme.font, "bold");
  doc.setFontSize(12);
  setText(theme.ink);
  doc.text(author, PAGE_W / 2, 202, { align: "center" });
  if (publisher) {
    doc.setFont(theme.font, "normal");
    doc.setFontSize(9);
    setText(theme.muted);
    doc.text(publisher, PAGE_W / 2, 210, { align: "center" });
  }

  // ---------------------------------------------------------------- Copyright
  newPage();
  const year = new Date().getFullYear();
  const copyrightLines = [
    `© ${year} ${author}`,
    "Tous droits réservés.",
    "",
    publisher ? `Éditeur : ${publisher}` : "",
    ebook.identity.website ? `Site web : ${ebook.identity.website}` : "",
    ebook.identity.email ? `Contact : ${ebook.identity.email}` : "",
    ebook.identity.edition ? `Édition : ${ebook.identity.edition}` : `Édition : Première édition, ${year}`,
    "",
    "Aucune partie de cet ouvrage ne peut être reproduite, distribuée ou transmise sous quelque forme que ce soit sans l'autorisation écrite préalable de l'auteur, sauf citations brèves dans le cadre d'une critique ou d'une revue.",
  ].filter((line, index, all) => !(line === "" && all[index - 1] === ""));

  doc.setFont(theme.font, "normal");
  doc.setFontSize(9.5);
  setText(theme.muted);
  let copyY = PAGE_H - 110;
  for (const line of copyrightLines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W);
    doc.text(wrapped, M_X, copyY);
    copyY += wrapped.length * 5 + (line ? 1.5 : 2);
  }

  // ---------------------------------------------------------------- Sommaire (réservé)
  const tocPageIndex = doc.getNumberOfPages() + 1;
  newPage();
  newPage();

  const bodyStart = doc.getNumberOfPages();

  // ---------------------------------------------------------------- Rendu
  const writeHeading = (text: string, size: number, spacingBefore: number) => {
    ensure(spacingBefore + size * 0.7);
    y += spacingBefore;
    doc.setFont(theme.headingFont, "bold");
    doc.setFontSize(size);
    setText(theme.ink);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      ensure(size * 0.55);
      doc.text(line, M_X, y);
      y += size * 0.55;
    }
    y += 3.5;
  };

  const calloutStyle = (kind: CalloutKind) => {
    switch (kind) {
      case "warning":
        return { bar: [214, 108, 40] as Rgb, bg: [253, 243, 232] as Rgb };
      case "key":
        return { bar: theme.accent, bg: soft };
      case "example":
        return { bar: theme.secondary, bg: mix(theme.surface, white, 0.4) };
      default:
        return { bar: theme.primary, bg: theme.surface };
    }
  };

  const writeBlocks = (blocks: Block[], opts?: { dropCap?: boolean }) => {
    let firstParagraph = Boolean(opts?.dropCap) && theme.dropCap;

    for (const block of blocks) {
      if (block.type === "h2") {
        writeHeading(block.text, 14, 6);
        continue;
      }

      if (block.type === "quote") {
        doc.setFont(theme.headingFont, "italic");
        doc.setFontSize(12.5);
        setText(theme.secondary);
        const lines = doc.splitTextToSize(block.text, CONTENT_W - 16);
        ensure(lines.length * 6.4 + 8);
        setFill(theme.primary);
        doc.rect(M_X, y - 4, 1.6, lines.length * 6.4 + 3, "F");
        doc.text(lines, M_X + 8, y + 1);
        y += lines.length * 6.4 + 8;
        continue;
      }

      if (block.type === "callout") {
        const style = calloutStyle(block.kind);
        doc.setFont(theme.font, "normal");
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(block.text, CONTENT_W - 18);
        const boxH = lines.length * 5.2 + 15;
        ensure(boxH + 4);
        setFill(style.bg);
        doc.roundedRect(M_X, y - 2, CONTENT_W, boxH, 3, 3, "F");
        setFill(style.bar);
        doc.rect(M_X, y - 2, 1.8, boxH, "F");
        doc.setFont(theme.font, "bold");
        doc.setFontSize(8.5);
        setText(style.bar);
        doc.text(block.label.toUpperCase(), M_X + 8, y + 5);
        doc.setFont(theme.font, "normal");
        doc.setFontSize(10.5);
        setText(theme.ink);
        doc.text(lines, M_X + 8, y + 11);
        y += boxH + 6;
        continue;
      }

      if (block.type === "li") {
        doc.setFont(theme.font, "normal");
        doc.setFontSize(11);
        setText(theme.ink);
        const lines = doc.splitTextToSize(block.text, CONTENT_W - 10);
        ensure(lines.length * 5.8);
        setFill(theme.primary);
        doc.circle(M_X + 1.8, y - 1.4, 0.9, "F");
        doc.text(lines, M_X + 7, y);
        y += lines.length * 5.8 + 2;
        continue;
      }

      // Paragraphe (avec lettrine éventuelle)
      doc.setFont(theme.font, "normal");
      doc.setFontSize(11);
      setText(theme.ink);

      if (firstParagraph && block.text.length > 90) {
        firstParagraph = false;
        const initial = block.text.charAt(0);
        const rest = block.text.slice(1);
        ensure(24);
        doc.setFont(theme.headingFont, "bold");
        doc.setFontSize(30);
        setText(theme.primary);
        doc.text(initial, M_X, y + 8);
        const capW = doc.getTextWidth(initial) + 3;
        doc.setFont(theme.font, "normal");
        doc.setFontSize(11);
        setText(theme.ink);
        const indented = doc.splitTextToSize(rest, CONTENT_W - capW);
        const head = indented.slice(0, 3);
        const tail = indented.slice(3);
        head.forEach((line: string, i: number) => doc.text(line, M_X + capW, y + i * 5.9));
        y += Math.max(head.length * 5.9, 14);
        for (const line of tail) {
          ensure(5.9);
          doc.text(line, M_X, y);
          y += 5.9;
        }
        y += 3.6;
        continue;
      }

      firstParagraph = false;
      const lines = doc.splitTextToSize(block.text, CONTENT_W);
      for (const line of lines) {
        ensure(5.9);
        doc.text(line, M_X, y);
        y += 5.9;
      }
      y += 3.6;
    }
  };

  const chapterSeparator = (index: number, chapterTitle: string, summary?: string) => {
    newPage();
    const label = `CHAPITRE ${String(index + 1).padStart(2, "0")}`;

    if (theme.separator === "solid") {
      setFill(theme.secondary);
      doc.rect(0, 0, PAGE_W, PAGE_H, "F");
      setFill(theme.primary);
      doc.rect(M_X, 116, 26, 2.4, "F");
      doc.setFont(theme.font, "bold");
      doc.setFontSize(10);
      setText(theme.accent);
      doc.text(label, M_X, 108);
      doc.setFont(theme.headingFont, "bold");
      doc.setFontSize(26);
      setText(white);
      doc.text(doc.splitTextToSize(chapterTitle, CONTENT_W), M_X, 134);
    } else if (theme.separator === "framed") {
      setDraw(theme.primary);
      doc.setLineWidth(0.6);
      doc.rect(M_X - 6, 40, CONTENT_W + 12, PAGE_H - 80);
      doc.setFont(theme.font, "bold");
      doc.setFontSize(10);
      setText(theme.primary);
      doc.text(label, PAGE_W / 2, 120, { align: "center" });
      doc.setFont(theme.headingFont, "bold");
      doc.setFontSize(26);
      setText(theme.ink);
      doc.text(doc.splitTextToSize(chapterTitle, CONTENT_W - 20), PAGE_W / 2, 140, {
        align: "center",
      });
    } else if (theme.separator === "minimal") {
      doc.setFont(theme.font, "bold");
      doc.setFontSize(9.5);
      setText(theme.muted);
      doc.text(label, M_X, 118);
      doc.setFont(theme.headingFont, "bold");
      doc.setFontSize(26);
      setText(theme.ink);
      doc.text(doc.splitTextToSize(chapterTitle, CONTENT_W), M_X, 134);
      setDraw(theme.primary);
      doc.setLineWidth(0.7);
      doc.line(M_X, 146, M_X + 24, 146);
    } else {
      setFill(theme.surface);
      doc.rect(0, 96, PAGE_W, 78, "F");
      setFill(theme.primary);
      doc.rect(0, 96, 3, 78, "F");
      doc.setFont(theme.font, "bold");
      doc.setFontSize(9.5);
      setText(theme.primary);
      doc.text(label, M_X, 118);
      doc.setFont(theme.headingFont, "bold");
      doc.setFontSize(26);
      setText(theme.ink);
      doc.text(doc.splitTextToSize(chapterTitle, CONTENT_W), M_X, 134);
    }

    if (summary) {
      doc.setFont(theme.font, "italic");
      doc.setFontSize(10.5);
      setText(theme.separator === "solid" ? mix(white, theme.muted, 0.35) : theme.muted);
      doc.text(
        doc.splitTextToSize(summary, CONTENT_W - (theme.separator === "framed" ? 20 : 0)),
        theme.separator === "framed" ? PAGE_W / 2 : M_X,
        theme.separator === "framed" ? 156 : 152,
        { align: theme.separator === "framed" ? "center" : "left" },
      );
    }
  };

  // Introduction
  tocEntries.push({ label: "Introduction", page: doc.getNumberOfPages(), level: 0 });
  writeHeading("Introduction", 22, 0);
  writeBlocks(parseMarkdown(outline.introduction ?? ""), { dropCap: true });

  // Chapitres
  const chapters = outline.chapitres ?? [];
  for (let i = 0; i < chapters.length; i++) {
    chapterSeparator(i, chapters[i].titre, chapters[i].resume);
    newPage();
    tocEntries.push({
      label: `Chapitre ${i + 1} — ${chapters[i].titre}`,
      page: doc.getNumberOfPages(),
      level: 0,
    });

    const illustration = ebook.illustrationDataUrls?.[i];
    if (illustration) {
      const { w, h } = await imageSize(illustration);
      const imgH = Math.min((CONTENT_W * h) / w, 82);
      ensure(imgH + 8);
      doc.addImage(illustration, "PNG", M_X, y, CONTENT_W, imgH, undefined, "FAST");
      y += imgH + 9;
    }

    writeBlocks(parseMarkdown(ebook.chapters?.[i] || chapters[i].resume || ""), { dropCap: true });

    if (chapters[i].points?.length) {
      ensure(30);
      const points = chapters[i].points!;
      y += 4;

      const lines = points.map((p) => `•  ${clean(p)}`);
      doc.setFont(theme.font, "normal");
      doc.setFontSize(10.5);
      const wrapped = lines.flatMap((l) => doc.splitTextToSize(l, CONTENT_W - 18) as string[]);
      const boxH = wrapped.length * 5.4 + 16;
      setFill(soft);
      doc.roundedRect(M_X, y - 2, CONTENT_W, boxH, 3, 3, "F");
      setFill(theme.primary);
      doc.rect(M_X, y - 2, 1.8, boxH, "F");
      doc.setFont(theme.font, "bold");
      doc.setFontSize(9);
      setText(theme.primary);
      doc.text("À RETENIR", M_X + 8, y + 4);
      doc.setFont(theme.font, "normal");
      doc.setFontSize(10.5);
      setText(theme.ink);
      doc.text(wrapped, M_X + 8, y + 11);
      y += boxH + 6;
    }
  }

  // Conclusion + CTA
  newPage();
  tocEntries.push({ label: "Conclusion", page: doc.getNumberOfPages(), level: 0 });
  writeHeading("Conclusion", 22, 0);
  writeBlocks(parseMarkdown(outline.conclusion ?? ""), { dropCap: true });
  if (outline.cta) {
    writeHeading("Et maintenant ?", 14, 6);
    writeBlocks(parseMarkdown(outline.cta));
  }

  // À propos de l'auteur
  if (ebook.identity.authorBio || ebook.identity.website || ebook.identity.authorPhotoDataUrl) {
    newPage();
    tocEntries.push({ label: "À propos de l'auteur", page: doc.getNumberOfPages(), level: 0 });
    writeHeading("À propos de l'auteur", 22, 0);
    if (ebook.identity.authorPhotoDataUrl) {
      doc.addImage(ebook.identity.authorPhotoDataUrl, "PNG", M_X, y, 34, 34, undefined, "FAST");
      y += 40;
    }
    doc.setFont(theme.font, "bold");
    doc.setFontSize(13);
    setText(theme.ink);
    doc.text(author, M_X, y);
    y += 8;
    if (ebook.identity.authorBio) writeBlocks(parseMarkdown(ebook.identity.authorBio));
    if (ebook.identity.website) {
      doc.setFont(theme.font, "normal");
      doc.setFontSize(10.5);
      setText(theme.primary);
      doc.text(ebook.identity.website, M_X, y);
      y += 6;
    }
    if (ebook.identity.socials) {
      doc.setFont(theme.font, "normal");
      doc.setFontSize(10);
      setText(theme.muted);
      doc.text(doc.splitTextToSize(ebook.identity.socials, CONTENT_W), M_X, y);
    }
  }

  // ---------------------------------------------------------------- Sommaire
  doc.setPage(tocPageIndex);
  y = M_TOP;
  writeHeading("Sommaire", 24, 0);
  y += 4;
  for (const entry of tocEntries) {
    if (y > PAGE_H - M_BOTTOM - 8) {
      doc.setPage(tocPageIndex + 1);
      y = M_TOP;
    }
    doc.setFont(theme.font, "normal");
    doc.setFontSize(11);
    setText(theme.ink);
    const label = doc.splitTextToSize(entry.label, CONTENT_W - 18)[0];
    doc.text(label, M_X, y);
    const labelW = doc.getTextWidth(label);
    setText(mix(theme.muted, white, 0.45));
    const dots = ".".repeat(Math.max(0, Math.floor((CONTENT_W - labelW - 14) / 1.6)));
    doc.text(dots, M_X + labelW + 2, y);
    setText(theme.primary);
    doc.setFont(theme.font, "bold");
    doc.text(String(entry.page), M_X + CONTENT_W, y, { align: "right" });
    doc.link(M_X, y - 5, CONTENT_W, 7, { pageNumber: entry.page });
    y += 8.5;
  }

  // ---------------------------------------------------------------- En-têtes / pieds
  const total = doc.getNumberOfPages();
  for (let page = 2; page <= total; page++) {
    doc.setPage(page);
    if (page >= bodyStart) {
      doc.setFont(theme.font, "normal");
      doc.setFontSize(8);
      setText(mix(theme.muted, white, 0.25));
      doc.text(title.slice(0, 70), M_X, 16);
      doc.text(author.slice(0, 40), M_X + CONTENT_W, 16, { align: "right" });
      setDraw(mix(theme.surface, white, 0.2));
      doc.setLineWidth(0.3);
      doc.line(M_X, 19, M_X + CONTENT_W, 19);
    }
    doc.setFont(theme.font, "normal");
    doc.setFontSize(9);
    setText(mix(theme.muted, white, 0.15));
    doc.text(String(page), PAGE_W / 2, PAGE_H - 13, { align: "center" });
  }

  if (ebook.watermark) {
    doc.setPage(total);
    doc.setFont(theme.font, "normal");
    doc.setFontSize(7.5);
    setText(mix(theme.muted, white, 0.4));
    doc.text("Created with Solenya AI", PAGE_W / 2, PAGE_H - 8, { align: "center" });
  }

  doc.save(`${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "ebook"}.pdf`);
}
