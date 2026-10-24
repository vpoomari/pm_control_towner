// PM CONTROL TOWER — Zero-dependency PDF writer (PDF 1.4, core Helvetica fonts).
// Renders a branded multi-page report: cover page + table of contents + one section
// per tab, each as a paginated table with word-wrapped cells and repeated headers.
// Text is WinAnsi (CP1252); anything outside is replaced with "?".

import { deflateSync } from "node:zlib";

// ---------- Fonts & metrics (Adobe AFM widths, char codes 32..126) ----------

const HELV: number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const HELV_BOLD: number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// CP1252 special bytes for common Unicode punctuation (0x80-0x9F range).
const WINANSI_SPECIAL: Record<string, number> = {
  "\u20AC": 0x80, "\u201A": 0x82, "\u0192": 0x83, "\u201E": 0x84, "\u2026": 0x85,
  "\u2020": 0x86, "\u2021": 0x87, "\u02C6": 0x88, "\u2030": 0x89, "\u0160": 0x8A,
  "\u2039": 0x8B, "\u0152": 0x8C, "\u017D": 0x8E, "\u2018": 0x91, "\u2019": 0x92,
  "\u201C": 0x93, "\u201D": 0x94, "\u2022": 0x95, "\u2013": 0x96, "\u2014": 0x97,
  "\u02DC": 0x98, "\u2122": 0x99, "\u0161": 0x9A, "\u203A": 0x9B, "\u0153": 0x9C,
  "\u017E": 0x9E, "\u0178": 0x9F,
};

/** Convert a JS string to a WinAnsi (CP1252) byte string; unknown chars become "?". */
function toWinAnsi(s: string): string {
  let out = "";
  for (const ch of s.replace(/[\r\n\t]+/g, " ")) {
    const code = ch.codePointAt(0)!;
    if (ch in WINANSI_SPECIAL) out += String.fromCharCode(WINANSI_SPECIAL[ch]);
    else if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa0 && code <= 0xff) out += ch;
    else out += "?";
  }
  return out;
}

function measure(s: string, bold: boolean, size: number): number {
  const table = bold ? HELV_BOLD : HELV;
  let units = 0;
  for (const ch of toWinAnsi(s)) {
    const c = ch.charCodeAt(0);
    units += c >= 32 && c <= 126 ? table[c - 32] : 556;
  }
  return (units / 1000) * size;
}

// ---------- Drawing primitives (top-down coordinates, converted at render) ----------

type RGB = [number, number, number];

const NAVY: RGB = [0.043, 0.122, 0.227];   // #0b1f3a brand
const WHITE: RGB = [1, 1, 1];
const INK: RGB = [0.09, 0.13, 0.2];
const GRAY: RGB = [0.42, 0.47, 0.53];
const LIGHT: RGB = [0.85, 0.88, 0.91];
const ZEBRA: RGB = [0.945, 0.961, 0.976];
const SKY: RGB = [0.72, 0.8, 0.9];

type Op =
  | { t: "text"; x: number; y: number; str: string; size: number; bold?: boolean; rgb?: RGB }
  | { t: "rect"; x: number; y: number; w: number; h: number; rgb: RGB }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; rgb?: RGB; width?: number };

const PAGE_W = 842, PAGE_H = 595; // A4 landscape
const MARGIN = 36;
const TABLE_X = MARGIN;
const TABLE_W = PAGE_W - MARGIN * 2;
const TOP_Y = 40;
const BOTTOM_Y = PAGE_H - 46; // top-down limit for body content
const MAX_CELL_LINES = 6;

/** Word-wrap text to a width; hard-breaks overlong tokens; caps lines with an ellipsis. */
function wrap(str: string, width: number, size: number, bold: boolean, max: number): string[] {
  const words = toWinAnsi(str).split(" ").filter((w) => w !== "");
  if (!words.length) return [""];
  const lines: string[] = [];
  let cur = "";
  const push = () => { if (cur) { lines.push(cur); cur = ""; } };
  for (let w of words) {
    while (measure(w, bold, size) > width) {
      let cut = w.length;
      while (cut > 1 && measure(w.slice(0, cut), bold, size) > width) cut--;
      push();
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const next = cur ? cur + " " + w : w;
    if (measure(next, bold, size) <= width) cur = next;
    else { push(); cur = w; }
  }
  push();
  if (lines.length > max) {
    const kept = lines.slice(0, max);
    kept[max - 1] = kept[max - 1].replace(/\s*\S*$/, "") + "…";
    return kept;
  }
  return lines;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 16);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

export interface PdfSection {
  group: string;                       // nav group label
  label: string;                       // tab label
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  note?: string;                       // e.g. truncated / error note
}

export interface PdfReportInput {
  title: string;
  subtitle: string;
  generatedBy: string;
  generatedAt: Date;
  sections: PdfSection[];
}

// ---------- Section layout ----------

const LINE_H = (size: number) => size + 1.8;

function layoutSectionPages(sec: PdfSection): Op[][] {
  const pages: Op[][] = [];
  let ops: Op[] = [];
  const text = (x: number, y: number, str: string, size: number, o: { bold?: boolean; rgb?: RGB } = {}) =>
    ops.push({ t: "text", x, y, str, size, bold: o.bold, rgb: o.rgb });
  const rect = (x: number, y: number, w: number, h: number, rgb: RGB) => ops.push({ t: "rect", x, y, w, h, rgb });
  const line = (x1: number, y1: number, x2: number, y2: number, rgb: RGB = LIGHT, width = 0.5) =>
    ops.push({ t: "line", x1, y1, x2, y2, rgb, width });

  const newPage = () => { if (ops.length) pages.push(ops); ops = []; };
  // (no initial newPage() — the first page starts empty and is pushed once drawn)

  // Heading block
  text(MARGIN, TOP_Y, sec.group.toUpperCase(), 8, { bold: true, rgb: GRAY });
  text(MARGIN, TOP_Y + 13, sec.label, 16, { bold: true, rgb: NAVY });
  text(PAGE_W - MARGIN - measure(`${sec.rows.length.toLocaleString("en-US")} records`, false, 9.5), TOP_Y + 16,
    `${sec.rows.length.toLocaleString("en-US")} records`, 9.5, { rgb: GRAY });
  line(MARGIN, TOP_Y + 38, PAGE_W - MARGIN, TOP_Y + 38, NAVY, 1.2);
  let y = TOP_Y + 56;
  if (sec.note) { text(MARGIN, y, sec.note, 8, { rgb: GRAY }); y += 14; }

  if (!sec.rows.length) {
    text(MARGIN, y + 4, "No records available.", 9.5, { rgb: GRAY });
    pages.push(ops);
    return pages;
  }

  // Column sizing: widest content (capped), scaled to fill the table width
  const cols = sec.columns;
  const bodySize = cols.length <= 8 ? 7.4 : cols.length <= 12 ? 6.8 : 6.2;
  const pad = 4;
  const widths = cols.map((c) => {
    let w = measure(c.label, true, bodySize);
    for (const r of sec.rows.slice(0, 300)) {
      const cw = measure(fmtValue(r[c.key]), false, bodySize);
      if (cw > w) w = cw;
    }
    return Math.max(30, Math.min(w + pad * 2, 250));
  });
  const rawTotal = widths.reduce((a, b) => a + b, 0);
  const scale = TABLE_W / rawTotal;
  for (let i = 0; i < widths.length; i++) widths[i] = Math.max(26, widths[i] * scale);
  // Re-fit after clamping (many narrow columns can push the total past the page width)
  const clampedTotal = widths.reduce((a, b) => a + b, 0);
  if (clampedTotal !== TABLE_W) {
    const fit = TABLE_W / clampedTotal;
    for (let i = 0; i < widths.length; i++) widths[i] *= fit;
  }

  const colX: number[] = [];
  let acc = TABLE_X;
  for (const w of widths) { colX.push(acc); acc += w; }

  const drawHeader = (yTop: number): number => {
    const headLines = cols.map((c, i) => wrap(c.label, widths[i] - pad * 2, bodySize, true, 3));
    const headH = Math.max(...headLines.map((l) => l.length)) * LINE_H(bodySize) + 6;
    rect(TABLE_X, yTop, TABLE_W, headH, NAVY);
    headLines.forEach((lines, i) => {
      lines.forEach((ln, j) => text(colX[i] + pad, yTop + 3 + j * LINE_H(bodySize), ln, bodySize, { bold: true, rgb: WHITE }));
    });
    return headH;
  };

  y += drawHeader(y);

  sec.rows.forEach((row, ri) => {
    const cells = cols.map((c, i) => wrap(fmtValue(row[c.key]), widths[i] - pad * 2, bodySize, false, MAX_CELL_LINES));
    const rowH = Math.max(14, Math.max(...cells.map((l) => l.length)) * LINE_H(bodySize) + 4);
    if (y + rowH > BOTTOM_Y) {
      line(TABLE_X, y, TABLE_X + TABLE_W, y);
      newPage();
      y = TOP_Y;
      y += drawHeader(y);
    }
    if (ri % 2 === 1) rect(TABLE_X, y, TABLE_W, rowH, ZEBRA);
    cells.forEach((lines, i) => {
      lines.forEach((ln, j) => text(colX[i] + pad, y + 2.5 + j * LINE_H(bodySize), ln, bodySize, { rgb: INK }));
    });
    y += rowH;
    line(TABLE_X, y, TABLE_X + TABLE_W, y);
  });

  if (ops.length) pages.push(ops);
  return pages;
}

// ---------- Cover + table of contents ----------

function tocLineCount(sections: PdfSection[]): number {
  let lines = 0;
  let group = "";
  for (const s of sections) {
    if (s.group !== group) { lines += 1; group = s.group; }
    lines += 1;
  }
  return lines;
}

const TOC_FIRST_PAGE_LINES = 20;   // space left under the hero band + meta block
const TOC_NEXT_PAGE_LINES = Math.floor((BOTTOM_Y - TOP_Y - 24) / 16);

function coverPageCount(sections: PdfSection[]): number {
  const lines = tocLineCount(sections);
  return 1 + Math.max(0, Math.ceil((lines - TOC_FIRST_PAGE_LINES) / TOC_NEXT_PAGE_LINES));
}

function layoutCoverPages(
  input: PdfReportInput,
  entries: { sec: PdfSection; startPage: number; rowCount: number }[],
  stampDate: string,
): Op[][] {
  const pages: Op[][] = [];
  let ops: Op[] = [];
  const text = (x: number, y: number, str: string, size: number, o: { bold?: boolean; rgb?: RGB } = {}) =>
    ops.push({ t: "text", x, y, str, size, bold: o.bold, rgb: o.rgb });

  const newPage = () => { pages.push(ops); ops = []; };

  // Page 1: hero band + meta + TOC start (ops starts empty; no initial newPage)
  ops.push({ t: "rect", x: 0, y: 0, w: PAGE_W, h: 132, rgb: NAVY });
  text(MARGIN, 40, input.title, 25, { bold: true, rgb: WHITE });
  text(MARGIN, 80, input.subtitle, 11.5, { rgb: SKY });
  const brand = "PM CONTROL TOWER";
  text(PAGE_W - MARGIN - measure(brand, true, 9), 44, brand, 9, { bold: true, rgb: SKY });

  const totalRows = entries.reduce((a, e) => a + e.rowCount, 0);
  let y = 168;
  text(MARGIN, y, `Generated ${stampDate} · by ${input.generatedBy} · ${input.sections.length} tabs · ${totalRows.toLocaleString("en-US")} records`, 10, { rgb: GRAY });
  ops.push({ t: "line", x1: MARGIN, y1: y + 18, x2: PAGE_W - MARGIN, y2: y + 18, rgb: LIGHT, width: 1 });
  y += 40;
  text(MARGIN, y, "CONTENTS", 10, { bold: true, rgb: NAVY });
  y += 20;

  let onLine = 0;
  let group = "";
  const drawEntry = (fn: (yy: number) => void) => {
    if (onLine >= TOC_FIRST_PAGE_LINES) {
      newPage();
      onLine = 0;
      y = TOP_Y;
    }
    fn(y + onLine * 16);
    onLine += 1;
  };
  entries.forEach((e, i) => {
    if (e.sec.group !== group) {
      const g = e.sec.group.toUpperCase();
      drawEntry((yy) => text(MARGIN, yy, g, 8.5, { bold: true, rgb: GRAY }));
      group = e.sec.group;
    }
    const label = `${i + 1}.  ${e.sec.label}`;
    const tail = `${e.rowCount.toLocaleString("en-US")} records`;
    const pageLbl = `Page ${e.startPage}`;
    drawEntry((yy) => {
      text(MARGIN + 10, yy, label, 10, { rgb: INK });
      text(MARGIN + 10 + 420, yy, tail, 9, { rgb: GRAY });
      text(PAGE_W - MARGIN - measure(pageLbl, false, 9), yy, pageLbl, 9, { rgb: NAVY });
    });
  });
  if (ops.length) pages.push(ops);
  return pages;
}

// ---------- Assembly ----------

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function fmt(v: number): string {
  const s = v.toFixed(3);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, ".0") : s;
}
function num(v: number): string { return (Math.round(v * 100) / 100).toString(); }

function renderOps(ops: Op[]): string {
  const parts: string[] = [];
  for (const op of ops) {
    if (op.t === "rect") {
      const [r, g, b] = op.rgb;
      parts.push(`${fmt(r)} ${fmt(g)} ${fmt(b)} rg ${num(op.x)} ${num(PAGE_H - op.y - op.h)} ${num(op.w)} ${num(op.h)} re f`);
    } else if (op.t === "line") {
      const [r, g, b] = op.rgb ?? LIGHT;
      parts.push(`${fmt(r)} ${fmt(g)} ${fmt(b)} RG ${num(op.width ?? 0.5)} w ${num(op.x1)} ${num(PAGE_H - op.y1)} m ${num(op.x2)} ${num(PAGE_H - op.y2)} l S`);
    } else if (op.t === "text") {
      const [r, g, b] = op.rgb ?? INK;
      parts.push(
        `${fmt(r)} ${fmt(g)} ${fmt(b)} rg BT /${op.bold ? "F2" : "F1"} ${num(op.size)} Tf 1 0 0 1 ${num(op.x)} ${num(PAGE_H - op.y - op.size)} Tm (${esc(toWinAnsi(op.str))}) Tj ET`,
      );
    }
  }
  return parts.join("\n");
}

function assemblePdf(title: string, pageStreams: string[]): Buffer {
  const objects: (string | Buffer)[] = [];
  const pageObjIds = pageStreams.map((_, i) => 5 + i * 2);
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  pageStreams.forEach((s, i) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObjIds[i] + 1} 0 R >>`);
    const compressed = deflateSync(Buffer.from(s, "latin1"));
    objects.push(Buffer.concat([
      Buffer.from(`<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`, "latin1"),
      compressed,
      Buffer.from(`\nendstream`, "latin1"),
    ]));
  });

  const chunks: Buffer[] = [];
  let offset = 0;
  const push = (b: Buffer) => { chunks.push(b); offset += b.length; };
  push(Buffer.from(`%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`, "latin1"));
  const xrefOffsets: number[] = [];
  objects.forEach((body, i) => {
    xrefOffsets.push(offset);
    push(Buffer.from(`${i + 1} 0 obj\n`, "latin1"));
    push(typeof body === "string" ? Buffer.from(body, "latin1") : body);
    push(Buffer.from("\nendobj\n", "latin1"));
  });
  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of xrefOffsets) xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
  push(Buffer.from(xref, "latin1"));
  push(Buffer.from(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${esc(toWinAnsi(title))}) /Producer (PM Control Tower) >> >>\nstartxref\n${xrefStart}\n%%EOF\n`,
    "latin1",
  ));
  return Buffer.concat(chunks);
}

// ---------- Public entry point ----------

export function buildPdfReport(input: PdfReportInput): Buffer {
  const stampDate = input.generatedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  // 1. Lay out every section first (provisionally numbered), so the TOC can cite
  //    real page numbers and footers can show "Page X of Y".
  const sectionPages = input.sections.map((sec) => layoutSectionPages(sec));
  const coverCount = coverPageCount(input.sections);
  const startPages: number[] = [];
  let p = coverCount;
  for (const pages of sectionPages) { p += pages.length; startPages.push(p - pages.length + 1); }
  const totalPages = p;

  // 2. Cover (drawn last, placed first).
  const coverPages = layoutCoverPages(
    input,
    input.sections.map((sec, i) => ({ sec, startPage: startPages[i], rowCount: sec.rows.length })),
    stampDate,
  );

  // 3. Stamp footers with absolute page numbers on every section page.
  input.sections.forEach((sec, i) => {
    sectionPages[i].forEach((ops, j) => {
      const abs = startPages[i] + j;
      const right = `Page ${abs} of ${totalPages}`;
      ops.push({ t: "line", x1: MARGIN, y1: PAGE_H - 40, x2: PAGE_W - MARGIN, y2: PAGE_H - 40, rgb: LIGHT, width: 0.6 });
      ops.push({ t: "text", x: MARGIN, y: PAGE_H - 36, str: `PM Control Tower · All-tabs export · ${stampDate}`, size: 7, rgb: GRAY });
      ops.push({ t: "text", x: PAGE_W - MARGIN - measure(right, false, 7), y: PAGE_H - 36, str: right, size: 7, rgb: GRAY });
    });
  });

  // 4. Assemble: cover pages, then sections in order.
  const allPages = [...coverPages, ...sectionPages.flat()];
  return assemblePdf(input.title, allPages.map(renderOps));
}
