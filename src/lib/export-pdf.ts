import { jsPDF } from "jspdf";
import type { EbookOutline } from "@/lib/export-docx";

export type PdfEbook = {
  title: string;
  outline: EbookOutline;
  chapters: string[];
  /** data URLs (image/png|jpeg) */
  coverDataUrl?: string | null;
  illustrationDataUrls?: Array<string | null>;
  watermark?: boolean;
};

const PAGE_W = 210;
const PAGE_H = 297;
const M_X = 22;
const M_TOP = 26;
const M_BOTTOM = 24;
const CONTENT_W = PAGE_W - M_X * 2;

type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "callout"; label: string; text: string };

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
    const li = text.match(/^[-*•]\s+(.*)$/);
    if (li) {
      blocks.push({ type: "li", text: clean(li[1]) });
      continue;
    }
    const callout = text.match(/^\*\*(.{2,30}?)\s*:\*\*\s*(.*)$/);
    if (callout && callout[2]) {
      blocks.push({ type: "callout", label: clean(callout[1]), text: clean(callout[2]) });
      continue;
    }
    blocks.push({ type: "p", text: clean(text) });
  }
  return blocks;
}

function clean(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^\d+\.\s*/, (m) => m)
    .trim();
}

async function imageSize(dataUrl: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 16, h: 9 });
    img.src = dataUrl;
  });
}

export async function exportPdf(ebook: PdfEbook) {
  const outline = ebook.outline ?? {};
  const title = outline.titre || ebook.title;
  const subtitle = outline.sous_titre ?? "";
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  let y = M_TOP;
  const tocEntries: Array<{ label: string; page: number; level: 0 | 1 }> = [];

  const newPage = () => {
    doc.addPage();
    y = M_TOP;
  };
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - M_BOTTOM) newPage();
  };

  // --- Page 1 : couverture ---
  if (ebook.coverDataUrl) {
    doc.addImage(ebook.coverDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    newPage();
  }

  // --- Page de titre ---
  doc.setTextColor(30, 41, 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SOLENYA · STUDIO DE CRÉATION", PAGE_W / 2, 70, { align: "center" });

  doc.setTextColor(17, 20, 35);
  doc.setFontSize(30);
  const titleLines = doc.splitTextToSize(title, CONTENT_W);
  doc.text(titleLines, PAGE_W / 2, 105, { align: "center" });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(90, 96, 120);
    doc.text(doc.splitTextToSize(subtitle, CONTENT_W - 10), PAGE_W / 2, 105 + titleLines.length * 11 + 8, {
      align: "center",
    });
  }

  doc.setDrawColor(60, 90, 220);
  doc.setLineWidth(0.8);
  doc.line(PAGE_W / 2 - 18, 200, PAGE_W / 2 + 18, 200);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 126, 150);
  doc.text(
    new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" }),
    PAGE_W / 2,
    212,
    { align: "center" },
  );

  // --- Placeholder du sommaire (rempli après coup) ---
  const tocPageIndex = doc.getNumberOfPages() + 1;
  newPage();
  newPage();

  const bodyStart = doc.getNumberOfPages();

  // --- Rendu du corps ---
  const writeHeading = (text: string, size: number, spacingBefore: number) => {
    ensure(spacingBefore + size * 0.6);
    y += spacingBefore;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(17, 20, 35);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      ensure(size * 0.55);
      doc.text(line, M_X, y);
      y += size * 0.55;
    }
    y += 3;
  };

  const writeBlocks = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === "h2") {
        writeHeading(block.text, 14, 5);
        continue;
      }
      if (block.type === "callout") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(`${block.label} : ${block.text}`, CONTENT_W - 12);
        const boxH = lines.length * 5.2 + 8;
        ensure(boxH + 4);
        doc.setFillColor(240, 244, 255);
        doc.roundedRect(M_X, y - 1, CONTENT_W, boxH, 2.5, 2.5, "F");
        doc.setFillColor(60, 90, 220);
        doc.rect(M_X, y - 1, 1.4, boxH, "F");
        doc.setTextColor(35, 45, 90);
        doc.text(lines, M_X + 7, y + 5.5);
        y += boxH + 5;
        continue;
      }
      if (block.type === "li") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(38, 42, 60);
        const lines = doc.splitTextToSize(block.text, CONTENT_W - 8);
        ensure(lines.length * 5.6);
        doc.setFillColor(60, 90, 220);
        doc.circle(M_X + 1.6, y - 1.4, 0.9, "F");
        doc.text(lines, M_X + 6, y);
        y += lines.length * 5.6 + 1.5;
        continue;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(38, 42, 60);
      const lines = doc.splitTextToSize(block.text, CONTENT_W);
      for (const line of lines) {
        ensure(5.8);
        doc.text(line, M_X, y, { maxWidth: CONTENT_W });
        y += 5.8;
      }
      y += 3.4;
    }
  };

  // Introduction
  tocEntries.push({ label: "Introduction", page: doc.getNumberOfPages(), level: 0 });
  writeHeading("Introduction", 20, 0);
  writeBlocks(parseMarkdown(outline.introduction ?? ""));

  // Chapitres
  const chapters = outline.chapitres ?? [];
  for (let i = 0; i < chapters.length; i++) {
    newPage();
    tocEntries.push({
      label: `Chapitre ${i + 1} — ${chapters[i].titre}`,
      page: doc.getNumberOfPages(),
      level: 0,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 90, 220);
    doc.text(`CHAPITRE ${String(i + 1).padStart(2, "0")}`, M_X, y);
    y += 4;
    doc.setDrawColor(220, 226, 245);
    doc.setLineWidth(0.4);
    doc.line(M_X, y, M_X + CONTENT_W, y);
    y += 8;

    writeHeading(chapters[i].titre, 22, 0);

    const illustration = ebook.illustrationDataUrls?.[i];
    if (illustration) {
      const { w, h } = await imageSize(illustration);
      const imgH = Math.min((CONTENT_W * h) / w, 85);
      ensure(imgH + 6);
      doc.addImage(illustration, "PNG", M_X, y, CONTENT_W, imgH, undefined, "FAST");
      y += imgH + 8;
    }

    writeBlocks(parseMarkdown(ebook.chapters?.[i] || chapters[i].resume || ""));
  }

  // Conclusion + CTA
  newPage();
  tocEntries.push({ label: "Conclusion", page: doc.getNumberOfPages(), level: 0 });
  writeHeading("Conclusion", 20, 0);
  writeBlocks(parseMarkdown(outline.conclusion ?? ""));
  if (outline.cta) {
    writeHeading("Et maintenant ?", 14, 6);
    writeBlocks(parseMarkdown(outline.cta));
  }

  // --- Sommaire ---
  doc.setPage(tocPageIndex);
  y = M_TOP;
  writeHeading("Sommaire", 24, 0);
  y += 4;
  for (const entry of tocEntries) {
    if (y > PAGE_H - M_BOTTOM - 8) {
      doc.setPage(tocPageIndex + 1);
      y = M_TOP;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(38, 42, 60);
    const label = doc.splitTextToSize(entry.label, CONTENT_W - 18)[0];
    doc.text(label, M_X, y);
    const labelW = doc.getTextWidth(label);
    doc.setTextColor(170, 176, 195);
    const dots = ".".repeat(Math.max(0, Math.floor((CONTENT_W - labelW - 14) / 1.6)));
    doc.text(dots, M_X + labelW + 2, y);
    doc.setTextColor(60, 90, 220);
    doc.setFont("helvetica", "bold");
    doc.text(String(entry.page), M_X + CONTENT_W, y, { align: "right" });
    y += 8.5;
  }

  // --- En-têtes, pieds de page, filigrane ---
  const total = doc.getNumberOfPages();
  const firstNumbered = ebook.coverDataUrl ? 2 : 1;
  for (let page = firstNumbered; page <= total; page++) {
    doc.setPage(page);
    if (page >= bodyStart) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 166, 185);
      doc.text(title.slice(0, 70), M_X, 14);
      doc.setDrawColor(232, 236, 248);
      doc.setLineWidth(0.3);
      doc.line(M_X, 17, M_X + CONTENT_W, 17);
      doc.text("Solenya", M_X + CONTENT_W, 14, { align: "right" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 156, 178);
    doc.text(String(page), PAGE_W / 2, PAGE_H - 12, { align: "center" });

    if (ebook.watermark && page >= bodyStart) {
      doc.setFontSize(8);
      doc.setTextColor(190, 196, 215);
      doc.text("Généré avec Solenya", M_X, PAGE_H - 12);
    }
  }

  doc.save(`${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "ebook"}.pdf`);
}
