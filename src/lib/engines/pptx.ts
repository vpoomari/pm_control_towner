// PM CONTROL TOWER — PowerPoint export engine (Command Center v3.1).
// Server-side only: renders presentation-native 16:9 decks with pptxgenjs so the
// browser dashboard and the desktop application produce IDENTICAL output — both
// call the same /api/export/ppt endpoint, which runs this single engine.
//
// Intelligent data fitting:
//  - tables auto-paginate with fixed row budgets (no overflow), repeated headers,
//    per-column character budgets (truncation, never wrapping/overlap),
//  - the Gantt renders as native shapes on a real date axis and splits across
//    slides in fixed row pages with a stable axis (bars align across parts),
//  - charts are native PPT vector charts (editable, crisp at any size).

import PptxGenJS from "pptxgenjs";

// ---- Layout constants (16:9 wide, inches) ----
const W = 13.33, H = 7.5, M = 0.5;
const CW = W - 2 * M;               // 12.33 content width
const TOP = 1.32;                   // content top below header
const BOTTOM = H - 0.52;            // content bottom above footer
const F = "Segoe UI";

// ---- Palette (mirrors the application UI) ----
export const C = {
  navy: "0B1F3A", navyPanel: "13294A", ink: "0E2240",
  blue: "1D4ED8", blueSoft: "E7EEFC", sky: "38BDF8",
  green: "0E9F6E", amber: "D97706", red: "DC2626",
  txt: "1E2A3B", mut: "5D6E85", mutDark: "9FB3CE",
  line: "DCE4EE", zebra: "F4F7FB", tint: "F2F6FB", white: "FFFFFF",
};

const CHAR_PER_INCH = 8.5; // conservative single-line budget at 10pt (prevents wrap/overlap)

export function trunc(s: unknown, max: number): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "—";
  return max > 1 ? t.slice(0, max - 1) + "…" : t.slice(0, max);
}

export type Tone = "blue" | "green" | "amber" | "red" | "neutral";
const TONE_HEX: Record<Tone, string> = { blue: C.blue, green: C.green, amber: C.amber, red: C.red, neutral: C.ink };

export interface TableCol<T = any> {
  header: string;
  w?: number;                       // relative weight (normalized to slide width)
  get: (row: T) => string | number | null | undefined;
  align?: "left" | "center" | "right";
}

export interface GanttTask {
  code?: string;
  name: string;
  start?: Date | string | null;
  end?: Date | string | null;
  progress?: number;
  status?: string;
  isCritical?: boolean;
  isMilestone?: boolean;
}

export interface DeckMeta {
  deckTitle: string;
  subtitle?: string;
  projectLine?: string;             // e.g. "PRJ-ERP-001 — Global ERP Implementation"
  confidentiality?: string;         // from AdminSettings.confidentialityLabel
  metaPairs?: [string, string | number][];
  generatedBy?: string;
}

export class Deck {
  readonly pptx: PptxGenJS;
  private get shapes(): any { return (this.pptx as unknown as { shapes: unknown }).shapes; }
  private meta: DeckMeta;
  private sections = 0;

  constructor(meta: DeckMeta) {
    this.pptx = new PptxGenJS();
    this.pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 (16:9)
    this.pptx.author = meta.generatedBy || "PM Control Tower";
    this.pptx.company = "dynamiq Solutions";
    this.pptx.title = meta.deckTitle;
    this.meta = meta;
    this.cover();
  }

  private footerOn(slide: PptxGenJS.Slide) {
    slide.addText(`PM Control Tower  ·  ${this.meta.confidentiality || "Confidential"}`, {
      x: M, y: H - 0.4, w: 9.5, h: 0.3, fontFace: F, fontSize: 8, color: C.mutDark, margin: 0,
    });
    slide.slideNumber = { x: W - 0.95, y: H - 0.4, w: 0.6, h: 0.3, fontFace: F, fontSize: 9, color: C.mutDark, align: "right" };
  }

  private headerOn(slide: PptxGenJS.Slide, title: string, accent = C.blue) {
    slide.background = { color: C.white };
    slide.addShape(this.shapes.RECTANGLE, { x: M, y: 0.42, w: 0.09, h: 0.5, fill: { color: accent }, line: { type: "none" } });
    slide.addText(trunc(title, 90), { x: M + 0.2, y: 0.3, w: CW - 0.3, h: 0.56, fontFace: F, fontSize: 21, bold: true, color: C.ink, margin: 0 });
    if (this.meta.projectLine) {
      slide.addText(this.meta.projectLine, { x: M + 0.2, y: 0.86, w: CW - 0.3, h: 0.3, fontFace: F, fontSize: 10.5, color: C.mut, margin: 0 });
    }
    slide.addText("PM CONTROL TOWER", { x: W - 2.6, y: 0.36, w: 2.2, h: 0.26, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 2, color: C.mutDark, align: "right", margin: 0 });
    this.footerOn(slide);
  }

  private cover() {
    const s = this.pptx.addSlide();
    s.background = { color: C.navy };
    s.addShape(this.shapes.ROUNDED_RECTANGLE, { x: M, y: 0.75, w: 0.62, h: 0.62, rectRadius: 0.12, fill: { color: C.blue }, line: { type: "none" } });
    s.addText("PM", { x: M, y: 0.75, w: 0.62, h: 0.62, fontFace: F, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText("PM CONTROL TOWER", { x: M + 0.78, y: 0.82, w: 8, h: 0.3, fontFace: F, fontSize: 12, bold: true, charSpacing: 3, color: C.white, margin: 0 });
    s.addText("PLAN · EXECUTE · MONITOR · GOVERN · DELIVER", { x: M + 0.78, y: 1.1, w: 8, h: 0.24, fontFace: F, fontSize: 8.5, charSpacing: 2, color: C.mutDark, margin: 0 });
    s.addText(trunc(this.meta.deckTitle, 80), { x: M, y: 2.35, w: CW, h: 1.15, fontFace: F, fontSize: 33, bold: true, color: C.white, margin: 0 });
    if (this.meta.subtitle) s.addText(trunc(this.meta.subtitle, 140), { x: M, y: 3.5, w: CW, h: 0.45, fontFace: F, fontSize: 14, color: C.sky, margin: 0 });
    if (this.meta.projectLine) s.addText(this.meta.projectLine, { x: M, y: 4.05, w: CW, h: 0.35, fontFace: F, fontSize: 13, color: C.mutDark, margin: 0 });

    if (this.meta.metaPairs?.length) {
      const pairs = this.meta.metaPairs.slice(0, 8);
      const colW = (CW - 0.4) / 2;
      pairs.forEach(([k, v], i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = M + col * (colW + 0.4), y = 4.65 + row * 0.52;
        s.addText(String(k).toUpperCase(), { x, y, w: colW, h: 0.24, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 1.5, color: C.mutDark, margin: 0 });
        s.addText(trunc(v, 52), { x, y: y + 0.22, w: colW, h: 0.28, fontFace: F, fontSize: 11.5, color: C.white, margin: 0 });
      });
    }
    s.addText(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC  ·  ${this.meta.generatedBy || "PM Control Tower"}`, {
      x: M, y: H - 0.62, w: 8, h: 0.28, fontFace: F, fontSize: 9, color: C.mutDark, margin: 0,
    });
    s.addText(this.meta.confidentiality || "Confidential", { x: W - 5.4, y: H - 0.62, w: 4.9, h: 0.28, fontFace: F, fontSize: 9, color: C.mutDark, align: "right", margin: 0 });
  }

  /** Dark section divider between major parts of a deck. */
  section(title: string, subtitle?: string) {
    this.sections += 1;
    const s = this.pptx.addSlide();
    s.background = { color: C.navy };
    s.addText(String(this.sections).padStart(2, "0"), { x: M, y: 2.2, w: 2, h: 1, fontFace: F, fontSize: 54, bold: true, color: C.navyPanel, margin: 0 });
    s.addText(trunc(title, 70), { x: M, y: 3.25, w: CW, h: 0.7, fontFace: F, fontSize: 27, bold: true, color: C.white, margin: 0 });
    if (subtitle) s.addText(trunc(subtitle, 130), { x: M, y: 3.95, w: CW, h: 0.4, fontFace: F, fontSize: 13, color: C.mutDark, margin: 0 });
    this.footerOn(s);
    return s;
  }

  /** Standard content slide with header, project line and footer. */
  content(title: string, accent?: Tone): PptxGenJS.Slide {
    const s = this.pptx.addSlide();
    this.headerOn(s, title, accent ? TONE_HEX[accent] : C.blue);
    return s;
  }

  /** KPI metric cards — up to 8 (two rows of 4). */
  kpis(slide: PptxGenJS.Slide, items: { label: string; value: string | number; sub?: string; tone?: Tone }[]) {
    const list = items.slice(0, 8);
    const perRow = 4, gap = 0.22;
    const cw = (CW - gap * (perRow - 1)) / perRow;
    list.forEach((k, i) => {
      const col = i % perRow, row = Math.floor(i / perRow);
      const x = M + col * (cw + gap), y = TOP + 0.06 + row * 1.42;
      slide.addShape(this.shapes.ROUNDED_RECTANGLE, {
        x, y, w: cw, h: 1.24, rectRadius: 0.07, fill: { color: C.white },
        line: { color: C.line, width: 0.75 }, shadow: { type: "outer", color: C.navy, blur: 6, offset: 1.5, angle: 90, opacity: 0.14 },
      });
      slide.addText(trunc(k.label.toUpperCase(), 30), { x: x + 0.16, y: y + 0.12, w: cw - 0.32, h: 0.24, fontFace: F, fontSize: 8.5, bold: true, charSpacing: 1, color: C.mut, margin: 0 });
      slide.addText(trunc(k.value, 18), { x: x + 0.16, y: y + 0.38, w: cw - 0.32, h: 0.44, fontFace: F, fontSize: 19, bold: true, color: TONE_HEX[k.tone ?? "neutral"], margin: 0 });
      if (k.sub) slide.addText(trunc(k.sub, 42), { x: x + 0.16, y: y + 0.86, w: cw - 0.32, h: 0.3, fontFace: F, fontSize: 8.5, color: C.mut, margin: 0 });
    });
  }

  /**
   * Auto-paginating data table. Fixed row budget per slide (no overflow), header
   * repeated on every part, cells truncated to a per-column character budget
   * derived from the normalized column width. Returns the number of slides used.
   */
  table(title: string, columns: TableCol<any>[], rows: any[], opts: { rowsPerSlide?: number; note?: string; accent?: Tone } = {}): number {
    if (!rows.length) {
      const s = this.content(title, opts.accent);
      s.addText("No records in this view.", { x: M, y: TOP + 0.4, w: CW, h: 0.4, fontFace: F, fontSize: 12, color: C.mut, margin: 0 });
      return 1;
    }
    const totalW = columns.reduce((s2, c) => s2 + (c.w ?? 1), 0);
    const widths = columns.map((c) => (c.w ?? 1) / totalW * CW);
    const budgets = widths.map((w) => Math.max(5, Math.floor(w * CHAR_PER_INCH)));
    const rowsPer = opts.rowsPerSlide ?? (columns.length > 6 ? 13 : 16);
    const pages = Math.ceil(rows.length / rowsPer);

    for (let p = 0; p < pages; p++) {
      const chunk = rows.slice(p * rowsPer, (p + 1) * rowsPer);
      const s = this.content(pages > 1 ? `${title}  (${p + 1}/${pages})` : title, opts.accent);
      const header = columns.map((c, i) => ({
        text: c.header, options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 9.5, align: c.align ?? "left", valign: "middle" as const },
      }));
      const body = chunk.map((r, ri) => columns.map((c, ci) => ({
        text: trunc(c.get(r), budgets[ci]),
        options: {
          color: C.txt, fill: { color: ri % 2 ? C.zebra : C.white }, fontSize: 9.5,
          align: c.align ?? "left", valign: "middle" as const,
        },
      })));
      s.addTable([header, ...body] as PptxGenJS.TableRow[], {
        x: M, y: TOP + (this.meta.projectLine ? 0.18 : 0.02), w: CW, colW: widths,
        border: { pt: 0.5, color: C.line }, rowH: 0.32, margin: 0.05,
        fontFace: F, autoPage: false,
      });
      if (opts.note && p === pages - 1) {
        s.addText(opts.note, { x: M, y: H - 0.78, w: CW, h: 0.26, fontFace: F, fontSize: 8.5, color: C.mut, margin: 0 });
      }
    }
    return pages;
  }

  /** KPI cards on a fresh titled content slide. */
  kpiSlide(title: string, items: { label: string; value: string | number; sub?: string; tone?: Tone }[], accent?: Tone): void {
    const s = this.content(title, accent);
    this.kpis(s, items);
  }

  /** Native vector chart on its own slide (bar | line | doughnut | pie | area). */
  chart(
    title: string,
    type: "bar" | "line" | "doughnut" | "pie" | "area",
    data: { name: string; labels: string[]; values: (number | null)[] }[],
    opts: { colors?: string[]; legend?: boolean; note?: string; stacked?: boolean; yLabel?: string } = {},
  ): void {
    const s = this.content(title);
    const chartType = this.pptx.ChartType[type];
    const anySlide = s as unknown as { addChart: (t: unknown, d: unknown, o: unknown) => void };
    anySlide.addChart(chartType, data, {
      x: M, y: TOP + 0.12, w: CW, h: H - TOP - 1.15,
      chartColors: opts.colors ?? [C.blue, C.green, C.amber, C.red, C.sky, "7C3AED"],
      showLegend: opts.legend ?? data.length > 1, legendPos: "b", legendFontSize: 10, legendColor: C.txt,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: C.mut, valAxisLabelColor: C.mut,
      dataLabelFontSize: 9, dataLabelColor: C.txt, showValue: type === "doughnut" || type === "pie",
      barGapWidthPct: 60, ...(opts.stacked ? { barGrouping: "stacked" } : {}),
      chartColorsOpacity: type === "area" ? 45 : undefined,
      showTitle: false,
    });
    if (opts.note) s.addText(opts.note, { x: M, y: H - 0.78, w: CW, h: 0.26, fontFace: F, fontSize: 8.5, color: C.mut, margin: 0 });
  }

  /**
   * Multi-slide Gantt. Real date axis (month gridlines, today marker), status /
   * progress / critical-path visuals, milestone diamonds. Tasks are split into
   * fixed-size row pages sharing the SAME axis, so bars align across parts.
   */
  gantt(title: string, tasks: GanttTask[], opts: { rowsPerSlide?: number } = {}): number {
    const dated = tasks
      .filter((t) => t.start && t.end && !t.isMilestone)
      .map((t) => ({ ...t, s: new Date(t.start as string | Date).getTime(), e: new Date(t.end as string | Date).getTime() }))
      .filter((t) => Number.isFinite(t.s) && Number.isFinite(t.e) && t.e >= t.s)
      .sort((a, b) => a.s - b.s);
    const milestones = tasks.filter((t) => t.isMilestone && t.end);
    const rowsPer = opts.rowsPerSlide ?? 15;

    const DAY = 86_400_000;
    const now = Date.now();
    const minT = Math.min(dated[0]?.s ?? now, now) - 7 * DAY;
    const maxT = Math.max(dated[dated.length - 1]?.e ?? now, ...milestones.map((m) => new Date(m.end as string | Date).getTime()), now) + 7 * DAY;
    const span = Math.max(maxT - minT, DAY);
    const hasData = dated.length > 0 || milestones.length > 0;

    const labelX = M, labelW = 3.0;
    const chartX = M + 3.1, chartW = W - M - chartX;
    const rowH = 0.315, barH = 0.17;
    const topY = TOP + (this.meta.projectLine ? 0.52 : 0.34);
    const xOf = (t: number) => chartX + ((t - minT) / span) * chartW;

    const pages = Math.max(1, Math.ceil((dated.length + milestones.length) / rowsPer));
    for (let p = 0; p < pages; p++) {
      const s = this.content(pages > 1 ? `${title}  (${p + 1}/${pages})` : title, "blue");
      const pageRows = dated.slice(p * rowsPer, (p + 1) * rowsPer);
      const pageMs = milestones.slice(Math.max(0, p * rowsPer - dated.length), Math.max(0, p * rowsPer - dated.length) + rowsPer);

      // month gridlines + labels
      const grid = new Date(minT);
      grid.setDate(1); grid.setHours(0, 0, 0, 0);
      while (grid.getTime() <= minT + span) {
        const gx = xOf(grid.getTime());
        if (gx >= chartX - 0.01) {
          s.addShape(this.shapes.LINE, { x: gx, y: topY - 0.14, w: 0, h: rowsPer * rowH + 0.12, line: { color: C.line, width: 0.75 } });
          s.addText(grid.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), {
            x: gx + 0.03, y: topY - 0.4, w: 0.85, h: 0.22, fontFace: F, fontSize: 7.5, color: C.mut, margin: 0,
          });
        }
        grid.setMonth(grid.getMonth() + 1);
      }
      // today marker
      if (now >= minT && now <= minT + span) {
        s.addShape(this.shapes.LINE, { x: xOf(now), y: topY - 0.14, w: 0, h: rowsPer * rowH + 0.12, line: { color: C.amber, width: 1.25 } });
      }

      if (!hasData && p === 0) {
        s.addText("No scheduled tasks in this view.", { x: M, y: topY + 0.4, w: CW, h: 0.4, fontFace: F, fontSize: 12, color: C.mut, margin: 0 });
        continue;
      }

      const renderRow = (i: number, label: string, isMs: boolean, t?: (typeof dated)[number], ms?: (typeof milestones)[number]) => {
        const y = topY + i * rowH;
        s.addText(trunc(label, 42), { x: labelX, y: y - 0.02, w: labelW, h: rowH, fontFace: F, fontSize: 8.5, color: C.txt, valign: "middle", margin: 0 });
        if (isMs && ms) {
          const mx = xOf(new Date(ms.end as string | Date).getTime()) - 0.07;
          s.addShape(this.shapes.DIAMOND, { x: mx, y: y + (rowH - barH) / 2 - 0.005, w: 0.14, h: 0.14, fill: { color: C.navy }, line: { color: C.blue, width: 0.75 } });
          return;
        }
        if (!t) return;
        const bx = xOf(t.s), bw = Math.max(((t.e - t.s) / span) * chartW, 0.055);
        const base = t.status === "COMPLETED" ? C.green : t.status === "IN_PROGRESS" ? C.blue : t.status === "BLOCKED" ? C.red : "C7D2E5";
        s.addShape(this.shapes.ROUNDED_RECTANGLE, {
          x: bx, y: y + (rowH - barH) / 2, w: bw, h: barH, rectRadius: Math.min(0.05, barH / 2),
          fill: { color: "E3EAF5" }, line: { color: t.isCritical ? C.red : C.line, width: t.isCritical ? 1.2 : 0.5 },
        });
        const prog = Math.max(0, Math.min(100, t.progress ?? 0));
        if (prog > 0) {
          s.addShape(this.shapes.ROUNDED_RECTANGLE, {
            x: bx, y: y + (rowH - barH) / 2, w: Math.max(bw * prog / 100, 0.03), h: barH, rectRadius: Math.min(0.05, barH / 2),
            fill: { color: t.isCritical ? C.red : base }, line: { type: "none" },
          });
        }
      };

      let i = 0;
      for (const t of pageRows) {
        renderRow(i, `${t.code ? t.code + "  " : ""}${t.name}`, false, t);
        i++;
      }
      for (const ms of pageMs) {
        renderRow(i, `◆ ${ms.name}`, true, undefined, ms);
        i++;
      }

      // legend on first part
      if (p === 0) {
        const legend: [string, string][] = [
          ["Completed", C.green], ["In progress", C.blue], ["Not started", "C7D2E5"], ["Critical path", C.red],
        ];
        let lx = chartX;
        for (const [lbl, col] of legend) {
          s.addShape(this.shapes.RECTANGLE, { x: lx, y: topY - 0.42, w: 0.16, h: 0.12, fill: { color: col === "C7D2E5" ? col : col }, line: col === C.red ? { color: C.red, width: 1 } : { color: C.line, width: 0.5 } });
          s.addText(lbl, { x: lx + 0.2, y: topY - 0.47, w: 0.95, h: 0.22, fontFace: F, fontSize: 7.5, color: C.mut, margin: 0 });
          lx += 1.18;
        }
        s.addShape(this.shapes.DIAMOND, { x: lx, y: topY - 0.435, w: 0.11, h: 0.11, fill: { color: C.navy }, line: { color: C.blue, width: 0.5 } });
        s.addText("Milestone", { x: lx + 0.16, y: topY - 0.47, w: 0.85, h: 0.22, fontFace: F, fontSize: 7.5, color: C.mut, margin: 0 });
        s.addShape(this.shapes.LINE, { x: lx + 1.05, y: topY - 0.44, w: 0, h: 0.16, line: { color: C.amber, width: 1.25 } });
        s.addText("Today", { x: lx + 1.12, y: topY - 0.47, w: 0.6, h: 0.22, fontFace: F, fontSize: 7.5, color: C.mut, margin: 0 });
      }
    }
    return pages;
  }

  /** Assemble the .pptx binary. */
  async buffer(): Promise<Buffer> {
    const out = await this.pptx.write({ outputType: "nodebuffer" });
    return out as Buffer;
  }
}
