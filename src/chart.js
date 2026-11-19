// SVG pieces: the price line chart, the SoC ring and the flow bars. They return markup strings.
import { esc, QUARTER, startOfDay } from "./shared.js";

export const CHART_W = 400;
export const CHART_H = 120;
const TOP = 10;
const BOTTOM = 104;

let gid = 0;

// Price chart over [from, to) with the charging window blocks behind the line.
// The x axis is time, so 92- and 100-slot days fit the same width.
// `limit` (ct/kWh) draws the grid-charging price limit as a horizontal line; the scale always includes it.
export const priceChart = ({ slots, from, to, now, blocks, label, limit, limitLabel }) => {
  const id = `tb${++gid}`;
  const span = to - from;
  const ps = slots.map((s) => s.p);
  const hasLimit = Number.isFinite(limit);
  const lo = Math.min(...ps, ...(hasLimit ? [limit] : []));
  const hi = Math.max(...ps, ...(hasLimit ? [limit] : []));
  const range = hi - lo || 1;
  const X = (t) => ((t - from) / span) * CHART_W;
  const Y = (p) => TOP + ((hi - p) / range) * (BOTTOM - TOP);
  // Each price is drawn at the middle of its slot.
  const pts = slots.map((s, i) => {
    const end = slots[i + 1]?.t ?? s.t + QUARTER;
    return [X((s.t + Math.min(end, s.t + 4 * QUARTER)) / 2), Y(s.p)];
  });
  const nowX = Math.max(0, Math.min(CHART_W, X(now)));
  let nowIdx = -1;
  for (let i = 0; i < slots.length; i++) if (slots[i].t <= now) nowIdx = i;
  const nowPt = nowIdx >= 0 ? pts[nowIdx] : undefined;
  const path = (list) => list.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const past = nowIdx >= 0 ? pts.slice(0, nowIdx + 1) : [];
  const future = nowIdx >= 0 ? pts.slice(nowIdx) : pts;
  const area = (list) =>
    list.length > 1
      ? `${path(list)} L${list[list.length - 1][0].toFixed(1)} ${CHART_H} L${list[0][0].toFixed(1)} ${CHART_H} Z`
      : "";
  const blockPath = blocks
    .map((b) => {
      const x0 = Math.max(0, X(b.from));
      const x1 = Math.min(CHART_W, X(b.to));
      return x1 > x0 ? `M${x0.toFixed(1)} 0 H${x1.toFixed(1)} V${CHART_H} H${x0.toFixed(1)} Z` : "";
    })
    .join(" ");
  const grid = [TOP, (TOP + BOTTOM) / 2, BOTTOM].map((y) => `M0 ${y} H${CHART_W}`).join(" ");
  // Day boundary when tomorrow is appended.
  const midnight = startOfDay(from, 1) < to ? X(startOfDay(from, 1)) : undefined;
  return `
    <svg class="chart" viewBox="0 0 ${CHART_W} ${CHART_H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
      <defs>
        <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color:var(--tb-expensive);stop-opacity:.38"></stop>
          <stop offset="60%" style="stop-color:var(--tb-grid);stop-opacity:.22"></stop>
          <stop offset="100%" style="stop-color:var(--tb-grid);stop-opacity:0"></stop>
        </linearGradient>
        <linearGradient id="${id}l" gradientUnits="userSpaceOnUse" x1="0" y1="${TOP}" x2="0" y2="${BOTTOM}">
          <stop offset="0%" style="stop-color:var(--tb-expensive)"></stop>
          <stop offset="55%" style="stop-color:var(--tb-line-mid)"></stop>
          <stop offset="100%" style="stop-color:var(--tb-grid)"></stop>
        </linearGradient>
      </defs>
      <path class="win" d="${blockPath}"></path>
      <path class="grid" d="${grid}"></path>
      ${midnight != null ? `<path class="grid day" d="M${midnight.toFixed(1)} 0 V${CHART_H}"></path>` : ""}
      <path d="${area(past)}" fill="url(#${id}f)"></path>
      <path d="${area(future)}" fill="url(#${id}f)" opacity=".45"></path>
      <path class="line" d="${past.length > 1 ? path(past) : ""}" stroke="url(#${id}l)"></path>
      <path class="line future" d="${future.length > 1 ? path(future) : ""}" stroke="url(#${id}l)"></path>
      ${hasLimit ? `<path class="limit" d="M0 ${Y(limit).toFixed(1)} H${CHART_W}"></path>` : ""}
      ${now >= from && now < to ? `<path class="now" d="M${nowX.toFixed(1)} 0 V${BOTTOM + 4}"></path>` : ""}
    </svg>
    ${
      hasLimit && limitLabel
        ? `<span class="limit-label${Y(limit) < TOP + 14 ? " below" : ""}" style="top:${((Y(limit) / CHART_H) * 100).toFixed(2)}%">${esc(limitLabel)}</span>`
        : ""
    }
    ${
      nowPt
        ? `<span class="now-dot" style="left:${((nowPt[0] / CHART_W) * 100).toFixed(2)}%;top:${((nowPt[1] / CHART_H) * 100).toFixed(2)}%"></span>`
        : ""
    }`;
};

// x position (0..1) → slot index, for the hover tooltip.
export const slotIndexAt = (slots, from, to, frac) => {
  const t = from + frac * (to - from);
  let idx = -1;
  for (let i = 0; i < slots.length; i++) if (slots[i].t <= t) idx = i;
  return idx;
};

// SoC ring with a marker for the target SoC.
export const socRing = ({ soc, target, size = 140, stroke = 12, color, label, marker = true }) => {
  const r = (size - stroke) / 2 - (marker ? 4 : 0);
  const c = size / 2;
  const C = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, (soc ?? 0) / 100));
  let mark = "";
  if (marker && target != null) {
    const a = (Math.max(0, Math.min(100, target)) / 100) * 2 * Math.PI - Math.PI / 2;
    mark = `<circle class="mark" cx="${(c + r * Math.cos(a)).toFixed(1)}" cy="${(c + r * Math.sin(a)).toFixed(1)}" r="${stroke / 2 + 1}"></circle>`;
  }
  return `
    <svg class="ring" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}">
      <circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"></circle>
      ${
        soc != null
          ? `<circle class="value" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}" style="stroke:${color}"
              stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${c} ${c})"></circle>`
          : ""
      }
      ${mark}
    </svg>`;
};

// One flow row: label, value and a bar; an active flow gets the running stripes.
// The animation phase is taken from the clock so a re-render does not restart it.
export const flowRow = ({ label, value, color, active, fill, animate }) => {
  const delay = animate ? `animation-delay:-${((Date.now() % 900) / 1000).toFixed(2)}s;` : "";
  const width = active ? 100 : Math.max(0, Math.min(100, fill ?? 0));
  return `
    <div class="flow${active ? " on" : ""}" style="--c:${color}">
      <div class="flow-top"><span>${esc(label)}</span><b>${esc(value)}</b></div>
      <div class="track"><div class="fill${active && animate ? " run" : ""}" style="width:${width}%;${delay}"></div></div>
    </div>`;
};

// 24 h history: step lines (a state holds until the next one), optional area below, shared y scale.
export const historyChart = ({ series, from, to, max, label, height = 80 }) => {
  const W = CHART_W;
  const top = 6;
  const X = (t) => ((Math.max(from, Math.min(to, t)) - from) / (to - from)) * W;
  const Y = (v) => height - (Math.max(0, Math.min(max, v)) / (max || 1)) * (height - top);
  const paths = series
    .filter((s) => s.points.length)
    .map((s) => {
      const pts = s.points;
      let d = `M${X(pts[0].t).toFixed(1)} ${Y(pts[0].v).toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) d += ` H${X(pts[i].t).toFixed(1)} V${Y(pts[i].v).toFixed(1)}`;
      d += ` H${W}`;
      const area = s.area
        ? `<path d="${d} V${height} H${X(pts[0].t).toFixed(1)} Z" style="fill:${s.color};opacity:.16"></path>`
        : "";
      return `${area}<path class="hline" d="${d}" style="stroke:${s.color}"></path>`;
    })
    .join("");
  const grid = [top, (top + height) / 2, height].map((y) => `M0 ${y} H${W}`).join(" ");
  return `
    <svg class="hchart" viewBox="0 0 ${W} ${height}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}" style="height:${height}px">
      <path class="grid" d="${grid}"></path>
      ${paths}
    </svg>`;
};
