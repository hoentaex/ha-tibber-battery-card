// KPI tiles, as in the energy card's consumers card, the oil and the heating card: a round icon, the label under it, the value
// large with a small unit, then a sub line and/or a thin bar (with a marker for a target, the reserve or last year).
// Tiles without a value are left out; the grid never shows a gap: a tile that would not fit the rest of a row and
// the last tile of a short row widen until the row is full.
import { esc } from "./shared.js";

// `icon` is an MDI path here, as everywhere in this card.
const svgIcon = (path) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;

/**
 * Column spans so every row is full. `spans` are the wished spans (1 or 2) in order; a tile that does not fit the
 * rest of its row moves to the next one (as CSS grid does) and the tile before it takes the free columns instead.
 */
export function fillRows(spans, cols) {
  const out = spans.map((s) => Math.max(1, Math.min(cols, s)));
  let used = 0;
  for (let i = 0; i < out.length; i++) {
    if (used + out[i] > cols) {
      out[i - 1] += cols - used;
      used = 0;
    }
    used = (used + out[i]) % cols;
  }
  if (used > 0 && out.length) out[out.length - 1] += cols - used;
  return out;
}

const pct = (v) => Math.max(0, Math.min(100, v));

/**
 * One tile. `k` label, `v` value (HTML-escaped here), `u` unit, `icon`, `c` colour, `p` bar 0–100, `m` marker 0–100,
 * `s` sub line, `d` badge HTML, `st` "warn" | "bad", `more` entity for Home Assistant's dialog.
 */
const tile = (x, s2, s3) => {
  const tag = x.more ? "button" : "div";
  const attrs = x.more ? ` type="button" data-more="${esc(x.more)}"` : "";
  return `<${tag} class="kpi${x.st ? ` ${x.st}` : ""}${x.wide ? " wide" : ""}"${attrs} style="--c:${x.c};--s2:${s2};--s3:${s3}">
    <span class="ki">${svgIcon(x.icon)}</span>
    <span class="kk">${esc(x.k)}</span>
    <span class="kv num">${esc(x.v)}${x.u ? `<small>${esc(x.u)}</small>` : ""}${x.d ? ` ${x.d}` : ""}</span>
    ${x.s ? `<span class="ks">${esc(x.s)}</span>` : ""}
    ${Number.isFinite(x.p) ? `<span class="kb"><i style="width:${pct(x.p).toFixed(1)}%"></i>${Number.isFinite(x.m) ? `<b style="left:${pct(x.m).toFixed(1)}%"></b>` : ""}</span>` : ""}
  </${tag}>`;
};

/**
 * A grid of tiles: three columns (two on a narrow card) or always two (`cols: 2`). Tiles whose value is null or
 * undefined are dropped before the layout, so nothing leaves a hole.
 */
export function kpiGrid(list, { cols = 3 } = {}) {
  const tiles = list.filter((x) => x && x.v !== null && x.v !== undefined && x.v !== "");
  if (!tiles.length) return "";
  const want = tiles.map((x) => (x.wide ? 2 : 1));
  const two = fillRows(want, 2);
  const three = cols === 3 ? fillRows(want, 3) : two;
  return `<div class="kpis c${cols}">${tiles.map((x, i) => tile(x, two[i], three[i])).join("")}</div>`;
}

export const KPI_STYLE = `
.kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kpis.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.kpis .kpi { grid-column: span var(--s2); }
.kpis.c3 .kpi { grid-column: span var(--s3); }
.kpi { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; padding: 11px 12px 12px;
       border: 0; border-radius: 12px; background: var(--tb-soft); color: inherit; font: inherit; text-align: left; }
button.kpi { cursor: pointer; }
button.kpi:hover { filter: brightness(1.04); }
.kpi .ki { width: 32px; height: 32px; flex: none; border-radius: 50%; display: grid; place-items: center; margin-bottom: 2px;
           color: color-mix(in srgb, var(--c) 82%, var(--primary-text-color)); background: color-mix(in srgb, var(--c) 18%, var(--ha-card-background, var(--card-background-color, #fff))); }
.kpi .ki .icon { width: 18px; height: 18px; }
.kpi .kk { font-size: 12.5px; line-height: 1.3; color: var(--secondary-text-color); }
.kpi .kv { font-size: 22px; font-weight: 500; line-height: 1.15; overflow-wrap: anywhere; }
.kpi.wide .kv { font-size: 28px; }
.kpi .kv small { display: inline-block; white-space: nowrap; font-size: 12px; font-weight: 400; color: var(--secondary-text-color); margin-left: 4px; }
.kpi .kv .badge { vertical-align: middle; }
.kpi .ks { font-size: 11.5px; line-height: 1.35; color: var(--secondary-text-color); }
.kpi .kb { position: relative; align-self: stretch; height: 4px; margin-top: auto; border-radius: 2px; background: color-mix(in srgb, var(--secondary-text-color) 25%, transparent); }
.kpi .ks + .kb, .kpi .kv + .kb { margin-top: 6px; }
.kpi .kb i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 2px; background: var(--c); }
.kpi .kb b { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--primary-text-color); opacity: .7; }
.kpi.warn, .kpi.bad { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 8%, var(--tb-soft)); }
.kpi.warn .kv, .kpi.bad .kv { color: color-mix(in srgb, var(--c) 70%, var(--primary-text-color)); }
@container (max-width: 360px) {
  .kpis.c3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpis.c3 .kpi { grid-column: span var(--s2); }
  .kpi.wide .kv { font-size: 24px; }
}
`;
