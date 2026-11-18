// Sections of the main card and their styles. Each section takes the view model built by the card
// and returns markup; a section without data returns "" and simply disappears.
import { flowRow, historyChart, priceChart, socRing } from "./chart.js";
import { fmtWhen } from "./activity.js";
import { BANNER_STYLE, gridScene, readout } from "./banner.js";
import { esc, fmtNum, fmtTime, fmtW, modeHint, STATUS_COLOR, statusText } from "./shared.js";

export const ICONS = {
  tower:
    "M8.28,5.45L6.5,4.55L7.76,2H16.23L17.5,4.55L15.72,5.44L15,4H9L8.28,5.45M18.62,8H14.09L13.3,5H10.7L9.91,8H5.38L4.1,10.55L5.89,11.44L6.62,10H17.38L18.1,11.45L19.89,10.56L18.62,8M17.77,22H15.7L15.46,21.1L12,15.9L8.53,21.1L8.3,22H6.23L9.12,11H11.19L10.83,12.35L12,14.1L13.16,12.35L12.81,11H14.88L17.77,22M11.4,15L10.5,13.65L9.32,18.13L11.4,15M14.68,18.12L13.5,13.64L12.6,15L14.68,18.12Z",
  help: "M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z",
  chart: "M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z",
  euro: "M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.3C19.41,3.87 17.3,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.5 11.08,21 15,21C17.31,21 19.41,20.13 21,18.7L19.22,16.92C18.09,17.91 16.62,18.5 15,18.5Z",
  battery:
    "M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4M11,20V14.5H9L13,7V12.5H15",
  chevron: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  expand:
    "M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z",
  decision:
    "M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z",
  clock:
    "M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3",
  close:
    "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
};

// Section heading with its icon in front, as in the Proxmox card.
const title = (icon, text, attrs = "") =>
  `<div class="section-title"${attrs}>${svgIcon(ICONS[icon])}<span>${esc(text)}</span></div>`;

export const svgIcon = (path, cls = "icon") =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;

export const STYLE = `
  :host {
    --tb-pv: #f5b942; --tb-grid: #5aa9ff; --tb-batt: #5fd08a; --tb-expensive: #ff9a5c; --tb-block: #ff8f8f;
    --tb-line-mid: var(--secondary-text-color, #9b9b9b);
    --tb-soft: var(--secondary-background-color, rgba(127,127,127,.08));
    --tb-track: var(--divider-color, rgba(127,127,127,.25));
    display: block;
  }
  ha-card { overflow: hidden; container-type: inline-size; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  /* Accent text: the accent mixed with the theme's text colour keeps 4.5:1 on light and dark themes. */
  .ink { color: color-mix(in srgb, var(--c) 62%, var(--primary-text-color)); }
  .header { display: flex; align-items: center; gap: 12px; padding: 16px 16px 12px; }
  .logo { height: 40px; width: 40px; flex: none; border-radius: 50%; display: grid; place-items: center;
          color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
  .logo .icon { width: 22px; height: 22px; }
  .titles { flex: 1 1 0; min-width: 5ch; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
          background: color-mix(in srgb, var(--c) 15%, transparent); white-space: nowrap; flex: 0 1 auto; min-width: 0; overflow: hidden; }
  .chip > span:last-child { overflow: hidden; text-overflow: ellipsis; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; display: inline-block; }
  .content { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 20px; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em;
                   color: var(--secondary-text-color); margin-bottom: 10px; }

  /* Battery: SoC ring and energy flows */
  .battery { display: grid; grid-template-columns: minmax(110px, 140px) minmax(0, 1fr); gap: 20px; align-items: center; }
  .ringbox { position: relative; aspect-ratio: 1; }
  .ring { display: block; width: 100%; height: 100%; }
  .ring circle { fill: none; }
  .ring .track { stroke: var(--tb-track); }
  .ring .value { stroke-linecap: round; transition: stroke-dasharray .6s ease; }
  .ring .mark { fill: var(--ha-card-background, var(--card-background-color, #fff)); stroke: var(--primary-text-color); stroke-width: 3; }
  .ringval { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ringval .pct { font-size: 32px; font-weight: 600; line-height: 1; }
  .ringval .pct small { font-size: 16px; font-weight: 500; }
  .ringval .kv { font-size: 12px; color: var(--secondary-text-color); margin-top: 4px; line-height: 1.35; max-width: 72%; }
  .nw { white-space: nowrap; }
  .flows { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .flow-top { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; margin-bottom: 6px; }
  .flow-top span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .flow-top b { font-weight: 500; white-space: nowrap; color: var(--secondary-text-color); }
  .flow.on .flow-top b { color: color-mix(in srgb, var(--c) 62%, var(--primary-text-color)); }
  .track { height: 6px; border-radius: 3px; background: var(--tb-track); overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; background: color-mix(in srgb, var(--c) 45%, transparent); transition: width .6s ease; }
  .flow.on .fill { background: var(--c); }
  .flow.on .fill.run { background: repeating-linear-gradient(90deg, var(--c) 0 12px, color-mix(in srgb, var(--c) 35%, transparent) 12px 24px);
                       background-size: 24px 6px; animation: tb-flow .9s linear infinite; }
  @keyframes tb-flow { from { background-position: 0 0; } to { background-position: 24px 0; } }
  @container (max-width: 340px) {
    .battery { grid-template-columns: minmax(0, 1fr); }
    .ringbox { width: 140px; margin: 0 auto; }
  }

  /* Price */
  .panel { border-radius: 12px; padding: 14px 16px; background: var(--tb-soft); display: flex; flex-direction: column; gap: 10px; }
  .price-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .section-title .icon, .kicker .icon { width: 16px; height: 16px; }
  .section-title.fold { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 6px; width: 100%; min-height: 44px;
                        margin: -12px 0 -2px; cursor: pointer; user-select: none; font-size: 13px; font-weight: 500; text-transform: uppercase;
                        letter-spacing: .04em; color: var(--secondary-text-color); border-radius: 8px; }
  .section-title.fold:hover { color: var(--primary-text-color); }
  .section-title.fold:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  .section-title.fold .chevron { margin-left: auto; transition: transform .2s ease; }
  .section-title.fold.closed { margin-bottom: -12px; }
  .section-title.fold.closed .chevron { transform: rotate(-90deg); }
  .kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .04em; }
  .price-now { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; }
  .price-now .big { font-size: 30px; font-weight: 600; line-height: 1.1; }
  .price-now .unit { font-size: 14px; color: var(--secondary-text-color); }
  .price-now .chip { align-self: center; }
  .stats { text-align: right; font-size: 12px; color: var(--secondary-text-color); line-height: 1.6; white-space: nowrap; }
  .stats b { color: var(--primary-text-color); font-weight: 500; }
  .plot { position: relative; height: 120px; touch-action: pan-y; }
  .chart { display: block; width: 100%; height: 100%; overflow: visible; }
  .chart .win { fill: color-mix(in srgb, var(--tb-grid) 18%, transparent); }
  .chart .grid { stroke: var(--tb-track); stroke-width: 1; fill: none; vector-effect: non-scaling-stroke; }
  .chart .grid.day { stroke-dasharray: 2 3; }
  .chart .line { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .chart .line.future { stroke-width: 2; stroke-dasharray: 5 4; }
  .chart .now { stroke: var(--primary-text-color); stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  .now-dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; box-sizing: border-box; pointer-events: none;
             background: var(--ha-card-background, var(--card-background-color, #fff)); border: 3px solid var(--primary-text-color); }
  .tip { position: absolute; top: -6px; transform: translate(-50%, -100%); padding: 4px 8px; border-radius: 8px; font-size: 12px; white-space: nowrap;
         background: var(--primary-text-color); color: var(--ha-card-background, var(--card-background-color, #fff)); pointer-events: none; z-index: 2; }
  .tip[hidden] { display: none; }
  .hover-line { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--secondary-text-color); pointer-events: none; }
  .hover-line[hidden] { display: none; }
  .axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--secondary-text-color); }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--secondary-text-color); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .lg-win { width: 12px; height: 12px; border-radius: 3px; background: color-mix(in srgb, var(--tb-grid) 40%, transparent); }
  .lg-now { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--primary-text-color); box-sizing: border-box; }
  .lg-fc { width: 16px; border-top: 2px dashed var(--secondary-text-color); }
  /* Recent activity: a timeline, newest first */
  .fold-note { margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 12px; }
  .section-title.fold .fold-note + .chevron { margin-left: 4px; }
  .act { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }
  .act li { display: grid; grid-template-columns: 14px minmax(0, 1fr); column-gap: 10px; position: relative; padding-bottom: 12px; }
  .act li:last-child { padding-bottom: 0; }
  .act li:not(:last-child)::before { content: ""; position: absolute; left: 6px; top: 17px; bottom: 1px; width: 2px;
                                      border-radius: 1px; background: var(--tb-track); }
  .act-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); margin: 4px 2px 0;
             box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 18%, transparent); }
  .act-top { display: flex; align-items: baseline; gap: 8px; font-size: 14px; line-height: 1.35; }
  .act-title { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .act time { flex: none; font-size: 12px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .act-meta { font-size: 12px; line-height: 1.4; color: var(--secondary-text-color); overflow-wrap: anywhere;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .empty { font-size: 13px; color: var(--secondary-text-color); padding: 8px 0; }

  /* Reasons */
  .decision { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; font-size: 14px; line-height: 1.4; color: var(--primary-text-color); }
  .decision .icon { color: var(--c); margin-top: 1px; }
  .decision span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .reason { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: var(--tb-soft); font-size: 13px; min-height: 20px; }
  .reason .k { color: var(--secondary-text-color); }
  .reason b { font-weight: 500; }

  /* Controls */
  .seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: var(--tb-soft); }
  .seg button { font: inherit; font-size: 14px; font-weight: 500; border: 0; border-radius: 10px; min-height: 44px; cursor: pointer; padding: 0 6px;
                background: transparent; color: var(--primary-text-color); transition: background .15s, color .15s; }
  .seg button:hover:not([aria-pressed="true"]) { background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); }
  .seg button[aria-pressed="true"] { background: var(--c); color: #0e1520; }
  .seg button:focus-visible, .zoom:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  .seg button:disabled { cursor: default; opacity: .5; }
  .hint { font-size: 12px; color: var(--secondary-text-color); margin-top: 8px; }
  .slider { margin-top: 12px; }
  .slider-top { display: flex; justify-content: space-between; font-size: 13px; }
  .slider-top b { font-weight: 500; }
  .slider input { width: 100%; min-height: 44px; margin: 0; accent-color: var(--tb-grid); cursor: pointer; }

  /* Footer */
  .footer { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; border-top: 1px solid var(--tb-track); padding-top: 14px; }
  .footer .k { font-size: 12px; color: var(--secondary-text-color); }
  .footer .v { font-size: 15px; font-weight: 500; margin-top: 2px; }
  .clickable { cursor: pointer; }

  /* Detail button (header) and expand button (mini card) */
  .zoom { all: unset; flex: none; cursor: pointer; width: 40px; height: 40px; margin: -4px -8px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 20px; height: 20px; }
  .zoom:hover { background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent); color: var(--primary-text-color); }
  .zoom[aria-expanded="true"] .icon { transform: rotate(180deg); }

  /* Mini card: one row */
  .mini { display: flex; align-items: center; gap: 14px; padding: 12px 12px 12px 16px; min-width: 0; }
  .mring { position: relative; width: 56px; height: 56px; flex: none; }
  .mring .ringval .pct { font-size: 15px; font-weight: 600; }
  .mring .ringval .pct small { font-size: 11px; }
  .mmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .mtop { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .mtop .name { flex: 0 1 auto; min-width: 0; }
  .mtop .chip { flex: none; max-width: 70%; }
  .mdetail { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mdetail .ink { font-weight: 500; }
  .mini .zoom { width: 44px; height: 44px; margin: 0; border-radius: 12px; background: var(--tb-soft); }
  .mini + .content { border-top: 1px solid var(--tb-track); padding-top: 16px; }
  /* Pill: the short text ("Gesperrt") once the card gets narrow, the full one as tooltip. */
  .chip .st-short { display: none; }
  @container (max-width: 420px) { .mini .chip .st-full { display: none; } .mini .chip .st-short { display: inline; } }
  @container (max-width: 340px) { .header .chip .st-full { display: none; } .header .chip .st-short { display: inline; } }
  @container (max-width: 279px) { .mini .chip > span:last-child { display: none; } .mini .chip { padding: 5px; } }

  /* Detail view (popup): larger price chart and the 24 h history */
  .detail .plot { height: 200px; }
  .hist { display: flex; flex-direction: column; gap: 6px; }
  .hist-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
  .hist-row b { font-weight: 500; }
  .hchart { display: block; width: 100%; }
  .hchart .grid { stroke: var(--tb-track); stroke-width: 1; fill: none; vector-effect: non-scaling-stroke; }
  .hchart .hline { fill: none; stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .hist + .hist { margin-top: 10px; }

${BANNER_STYLE}
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;

const pill = (v) => {
  const s = statusText(v.status, v.live.until, v.now, v.t, v.lang, v.hass.locale);
  const text =
    s.short === s.full
      ? esc(s.full)
      : `<span class="st-full">${esc(s.full)}</span><span class="st-short">${esc(s.short)}</span>`;
  return `<span class="chip ink" style="--c:${STATUS_COLOR[v.status]}" title="${esc(s.title)}"><span class="dot"></span><span>${text}</span></span>`;
};

// Colour of the round logo: the status colour, the battery green while idle.
const logoColor = (v) => (STATUS_COLOR[v.status] === STATUS_COLOR.idle ? "var(--tb-batt)" : STATUS_COLOR[v.status]);

// The illustrated header: logo, title with the status pill and subtitle on the sky, the grid connection at the right,
// the ground strip in the state colour, and the detail / close / expand button as a frosted round button.
export const banner = (v, button = "") => {
  const r = readout(v);
  return `
  <div class="banner${v.night ? " night" : ""}">
    ${gridScene(r.state, v.live.soc, r.top, r.what)}
    <div class="head">
      <div class="logo" style="--c:${logoColor(v)}">${svgIcon(ICONS.battery)}</div>
      <div class="titles">
        <div class="trow"><div class="name" title="${esc(v.name)}">${esc(v.name)}</div>${pill(v)}</div>
        ${v.subtitle ? `<div class="sub">${esc(v.subtitle)}</div>` : ""}
      </div>
    </div>
    <div class="wallx"></div>
    <div class="ground ${r.state}"></div>
    ${button}
  </div>`;
};

const headerButtons = (v) =>
  `${v.popupButton ? `<button type="button" class="zoom" data-open aria-haspopup="dialog" aria-label="${esc(v.t("open_details"))}">${svgIcon(ICONS.expand)}</button>` : ""}${v.closeButton ? `<button type="button" class="zoom" data-close aria-label="${esc(v.t("close"))}">${svgIcon(ICONS.close)}</button>` : ""}`;

export const header = (v) =>
  v.illustrated
    ? banner(v, headerButtons(v))
    : `
  <div class="header">
    <div class="logo" style="--c:${logoColor(v)}">${svgIcon(ICONS.battery)}</div>
    <div class="titles">
      <div class="name">${esc(v.name)}</div>
      ${v.subtitle ? `<div class="sub">${esc(v.subtitle)}</div>` : ""}
    </div>
    ${pill(v)}
    ${headerButtons(v)}
  </div>`;

export const battery = (v) => {
  const { live, t, lang } = v;
  const flows = v.flows;
  const rows = [];
  const max = Math.max(1, ...Object.values(flows).filter((x) => x != null));
  if (flows.pvToBatt != null)
    rows.push({
      label: t("pv_to_batt"),
      w: flows.pvToBatt,
      color: "var(--tb-pv)",
      sign: true,
      entity: v.config.pv_power_entity,
    });
  if (flows.battToHouse != null)
    rows.push({
      label: t("batt_to_house"),
      w: flows.battToHouse,
      color: "var(--tb-batt)",
      entity: v.config.battery_power_entity,
    });
  if (flows.gridToBatt != null)
    rows.push({
      label: t("grid_to_batt"),
      w: flows.gridToBatt,
      color: "var(--tb-grid)",
      sign: true,
      entity: v.config.grid_charge_power_entity,
    });
  const flowHtml = rows
    .map((r) => {
      const active = r.w > 10;
      return `<div class="clickable" data-more="${esc(r.entity)}">${flowRow({
        label: r.label,
        value: fmtW(active ? r.w : 0, lang, r.sign),
        color: r.color,
        active,
        animate: v.animate,
      })}</div>`;
    })
    .join("");
  const houseHtml =
    flows.house != null
      ? `<div class="clickable" data-more="${esc(v.config.house_power_entity)}">${flowRow({
          label: t("house"),
          value: fmtW(flows.house, lang),
          color: "var(--secondary-text-color)",
          active: false,
          fill: (flows.house / max) * 100,
        })}</div>`
      : "";
  const target = live.activeTarget;
  const ringColor = live.soc != null && target != null && live.soc < target ? "var(--tb-grid)" : "var(--tb-batt)";
  return `
    <div class="battery">
      <div class="ringbox clickable" data-more="${esc(v.config.soc_entity)}">
        ${socRing({
          soc: live.soc,
          target,
          color: ringColor,
          label: t("ring_label", { soc: fmtNum(live.soc, 0, lang), target: fmtNum(target, 0, lang) }),
        })}
        <div class="ringval">
          <div class="pct">${live.soc != null ? Math.round(live.soc) : "–"}<small>%</small></div>
          ${live.kwh != null ? `<div class="kv">${fmtNum(live.kwh, 1, lang)} kWh</div>` : ""}
          ${target != null ? `<div class="kv">${esc(t(live.forcing ? "force_until" : "target"))} <span class="nw">${fmtNum(target, 0, lang)} %</span></div>` : ""}
        </div>
      </div>
      ${rows.length || houseHtml ? `<div class="flows">${flowHtml}${houseHtml}</div>` : "<div></div>"}
    </div>`;
};

export const price = (v) => {
  const { t, lang, prices } = v;
  if (!prices.slots.length) {
    if (!prices.expected) return "";
    return `<div class="panel"><div class="kicker">${svgIcon(ICONS.euro)}<span>${esc(t("price_now"))}</span></div>
      <div class="empty">${esc(prices.loading ? t("loading_prices") : t("no_prices"))}</div></div>`;
  }
  const { now, stats, current, level } = prices;
  const levelColor = { cheap: "var(--tb-grid)", mid: "var(--secondary-text-color)", expensive: "var(--tb-expensive)" }[
    level
  ];
  const windowShown = prices.blocks.some((b) => b.to > prices.from && b.from < prices.to);
  const days = prices.days;
  const axis =
    days === 1 ? ["0", "6", "12", "18", `24 ${t("hours_suffix")}`] : ["0", "12", "24", "12", `24 ${t("hours_suffix")}`];
  return `
    <div class="panel">
      <div class="price-head">
        <div>
          <div class="kicker">${svgIcon(ICONS.euro)}<span>${esc(t("price_now"))} · ${fmtTime(current?.t ?? now)}</span></div>
          <div class="price-now">
            <span class="big">${fmtNum(current?.p, 1, lang)}</span><span class="unit">${esc(t("per_kwh"))}</span>
            ${level ? `<span class="chip ink" style="--c:${levelColor}">${esc(t(level))}</span>` : ""}
          </div>
        </div>
        <div class="stats">
          <div>${esc(t("min"))} <b>${fmtNum(stats.min, 1, lang)}</b></div>
          <div>${esc(t("avg"))} <b>${fmtNum(stats.avg, 1, lang)}</b></div>
          <div>${esc(t("max"))} <b>${fmtNum(stats.max, 1, lang)}</b></div>
        </div>
      </div>
      <div class="plot">
        ${priceChart({
          slots: prices.slots,
          from: prices.from,
          to: prices.to,
          now,
          blocks: prices.blocks,
          label: t("chart_label", { p: fmtNum(current?.p, 1, lang) }),
        })}
        <span class="hover-line" hidden></span>
        <span class="tip" hidden></span>
      </div>
      <div class="axis" aria-hidden="true">${axis.map((a) => `<span>${a}</span>`).join("")}</div>
      <div class="legend">
        ${windowShown ? `<span><span class="lg-win"></span>${esc(t("legend_window"))}</span>` : ""}
        <span><span class="lg-now"></span>${esc(t("legend_now"))}</span>
        <span><span class="lg-fc"></span>${esc(t("legend_forecast"))}</span>
      </div>
    </div>`;
};

export const reasons = (v) => {
  const { t, lang, config, live } = v;
  const chips = [];
  const ok = (id) => v.has(id);
  if (ok(config.deficit_entity)) {
    const d = v.num(config.deficit_entity);
    chips.push({
      k: t("deficit"),
      v: `${fmtNum(d, 2, lang)} kWh`,
      c: d > 0 ? "var(--tb-expensive)" : "var(--tb-batt)",
      e: config.deficit_entity,
    });
  }
  if (ok(config.pv_block_entity)) {
    const on = v.bool(config.pv_block_entity);
    const pv = live.pv != null ? ` · ${fmtW(live.pv, lang)}` : "";
    chips.push({
      k: t("pv_block"),
      v: `${on ? t("active") : t("free")}${pv}`,
      c: on ? "var(--tb-pv)" : "var(--tb-batt)",
      e: config.pv_block_entity,
    });
  }
  // Charging window chip: the current slot in the price window, else the configured entity.
  if (v.prices.inWindow != null || ok(config.window_entity)) {
    const on = v.prices.inWindow ?? v.bool(config.window_entity);
    chips.push({
      k: t("window"),
      v: on ? t("yes") : t("no"),
      c: on ? "var(--tb-grid)" : "var(--secondary-text-color)",
      e: config.window_entity || config.price_entity,
    });
  }
  if (ok(config.forecast_factor_entity)) {
    chips.push({
      k: t("forecast"),
      v: fmtNum(v.num(config.forecast_factor_entity), 2, lang),
      c: "var(--secondary-text-color)",
      e: config.forecast_factor_entity,
    });
  }
  if (live.mode && live.mode !== "auto") {
    chips.push({
      k: t("mode"),
      v: t(`mode_${live.mode}`),
      c: live.mode === "block" ? "var(--tb-block)" : "var(--tb-grid)",
      e: config.mode_entity,
    });
  }
  const reason = live.reason;
  if (!chips.length && !reason) return "";
  // The grid charge switch decides the question; without one, the status does.
  const charging = live.gridSwitch ?? (v.status === "grid" || v.status === "grid_forced");
  const decision = reason
    ? `<div class="decision clickable" style="--c:${STATUS_COLOR[v.status]}" data-more="${esc(config.reason_entity)}" title="${esc(reason)}">
        ${svgIcon(ICONS.decision)}<span>${esc(reason)}</span></div>`
    : "";
  return `
    <div>
      ${title("help", charging ? t("why_grid") : t("why_not_grid"))}
      ${decision}
      ${
        chips.length
          ? `<div class="chips">${chips
              .map(
                (c) =>
                  `<div class="reason clickable" style="--c:${c.c}" data-more="${esc(c.e)}"><span class="dot"></span><span class="k">${esc(c.k)}</span><b>${esc(c.v)}</b></div>`,
              )
              .join("")}</div>`
          : ""
      }
    </div>`;
};

export const controls = (v) => {
  const { t, lang, config, live } = v;
  const hasMode = v.has(config.mode_entity);
  // The slider sets the target in effect: the Force target while forcing, else the target SoC.
  const targetEntity = live.activeTargetEntity;
  const hasTarget = v.has(targetEntity);
  if (!hasMode && !hasTarget) return "";
  const modes = [
    ["auto", "var(--tb-grid)"],
    ["force", "var(--tb-grid)"],
    ["block", "var(--tb-block)"],
  ];
  const a = live.activeTargetAttrs || {};
  const target = v.dragTarget ?? live.activeTarget;
  const hint = modeHint(live, v.now, t, lang, v.hass.locale);
  return `
    <div>
      ${title("tower", t("grid_charging"), ' id="mode-label"')}
      ${
        hasMode
          ? `<div class="seg" role="group" aria-labelledby="mode-label">
              ${modes
                .map(
                  ([k, c]) =>
                    `<button type="button" data-mode="${k}" style="--c:${c}" aria-pressed="${live.mode === k}">${esc(t(`mode_${k}`))}</button>`,
                )
                .join("")}
            </div>
            ${hint ? `<div class="hint">${esc(hint)}</div>` : ""}`
          : ""
      }
      ${
        hasTarget
          ? `<div class="slider">
              <div class="slider-top"><label for="target">${esc(t(live.forcing ? "force_until" : "target_soc"))}</label><b class="target-val">${fmtNum(target, 0, lang)} %</b></div>
              <input id="target" type="range" data-entity="${esc(targetEntity)}" min="${a.min ?? 0}" max="${a.max ?? 100}" step="${a.step ?? 1}" value="${target ?? 0}">
            </div>`
          : ""
      }
    </div>`;
};

export const footer = (v) => {
  const { t, lang, config } = v;
  const items = [];
  if (v.has(config.savings_today_entity)) {
    const unit = v.hass.states[config.savings_today_entity].attributes?.unit_of_measurement;
    const cur = !unit || unit === "EUR" || unit === "€" ? "€" : unit;
    items.push([
      t("savings_today"),
      `${fmtNum(v.num(config.savings_today_entity), 2, lang)} ${cur}`,
      config.savings_today_entity,
    ]);
  }
  if (v.has(config.grid_kwh_today_entity))
    items.push([
      t("grid_today"),
      `${fmtNum(v.num(config.grid_kwh_today_entity), 2, lang)} kWh`,
      config.grid_kwh_today_entity,
    ]);
  const pv = v.num(config.pv_today_entity);
  const fc = v.num(config.pv_forecast_today_entity);
  if (pv != null || fc != null)
    items.push([
      t("pv_today"),
      `${fmtNum(pv, 1, lang)} / ${fmtNum(fc, 1, lang)} kWh`,
      config.pv_today_entity || config.pv_forecast_today_entity,
    ]);
  if (!items.length) return "";
  return `<div class="footer">${items
    .map(
      ([k, val, e]) =>
        `<div class="clickable" data-more="${esc(e)}"><div class="k">${esc(k)}</div><div class="v">${esc(val)}</div></div>`,
    )
    .join("")}</div>`;
};

// Mini card: ring, name, status pill, "price · level · PV · target", and the expand button.
export const mini = (v) => {
  const { t, lang, live, prices } = v;
  const parts = [];
  if (prices.current) {
    parts.push(`${esc(fmtNum(prices.current.p, 1, lang))} ct`);
    const c = { cheap: "var(--tb-grid)", mid: "var(--secondary-text-color)", expensive: "var(--tb-expensive)" }[
      prices.level
    ];
    if (prices.level) parts.push(`<span class="ink" style="--c:${c}">${esc(t(prices.level))}</span>`);
  }
  if (live.pv != null) parts.push(`${esc(t("pv"))} ${esc(fmtW(live.pv, lang))}`);
  const target = live.activeTarget;
  if (target != null)
    parts.push(`${esc(t(live.forcing ? "force_until" : "target"))} ${esc(fmtNum(target, 0, lang))} %`);
  const ringColor = live.soc != null && target != null && live.soc < target ? "var(--tb-grid)" : "var(--tb-batt)";
  const btn = v.inline
    ? `<button type="button" class="zoom" data-toggle aria-expanded="${!!v.expanded}" aria-label="${esc(t("open_details"))}">${svgIcon(ICONS.chevron)}</button>`
    : `<button type="button" class="zoom" data-open aria-haspopup="dialog" aria-label="${esc(t("open_details"))}">${svgIcon(ICONS.chevron)}</button>`;
  const ring = `
      <div class="mring clickable" data-more="${esc(v.config.soc_entity)}">
        ${socRing({ soc: live.soc, size: 56, stroke: 6, color: ringColor, marker: false, label: t("ring_label", { soc: fmtNum(live.soc, 0, lang), target: fmtNum(target, 0, lang) }) })}
        <div class="ringval"><div class="pct">${live.soc != null ? Math.round(live.soc) : "–"}<small>%</small></div></div>
      </div>`;
  // Illustrated: the banner with the expand / detail button in its corner, then the ring and the key figures.
  if (v.illustrated) {
    const zoom = v.inline
      ? `<button type="button" class="zoom" data-toggle aria-expanded="${!!v.expanded}" aria-label="${esc(t("open_details"))}">${svgIcon(ICONS.expand)}</button>`
      : `<button type="button" class="zoom" data-open aria-haspopup="dialog" aria-label="${esc(t("open_details"))}">${svgIcon(ICONS.expand)}</button>`;
    return `${banner(v, zoom)}
    <div class="mini">${ring}
      <div class="mmain">${parts.length ? `<div class="mdetail">${parts.join(" · ")}</div>` : ""}</div>
    </div>`;
  }
  return `
    <div class="mini">${ring}
      <div class="mmain">
        <div class="mtop"><span class="name">${esc(v.name)}</span>${pill(v)}</div>
        ${parts.length ? `<div class="mdetail">${parts.join(" · ")}</div>` : ""}
      </div>
      ${btn}
    </div>`;
};

// 24 h history of SoC, PV and grid charging (popup only).
export const history = (v) => {
  const h = v.history;
  if (!h) return "";
  const { t, lang } = v;
  // The heading is a button that folds the section; closed, nothing is fetched.
  const head = `<button type="button" class="section-title fold${h.open ? "" : " closed"}" data-fold="history" aria-expanded="${h.open}">
      ${svgIcon(ICONS.chart)}<span>${esc(t("history"))}</span>${svgIcon(ICONS.chevron, "icon chevron")}</button>`;
  if (!h.open) return `<div>${head}</div>`;
  if (h.loading && !h.soc) return `<div>${head}<div class="empty">${esc(t("loading_history"))}</div></div>`;
  const hasSoc = h.soc?.length > 0;
  const hasPower = h.pv?.length > 0 || h.grid?.length > 0;
  if (!hasSoc && !hasPower) return `<div>${head}<div class="empty">${esc(t("no_history"))}</div></div>`;
  const pmax = Math.max(100, ...(h.pv || []).map((p) => p.v), ...(h.grid || []).map((p) => p.v));
  const ticks = [0, 6, 12, 18, 24].map((i) => fmtTime(h.from + i * 3600000));
  const axis = `<div class="axis" aria-hidden="true">${ticks.map((x) => `<span>${x}</span>`).join("")}</div>`;
  const last = (arr) => arr?.[arr.length - 1]?.v;
  return `
    <div>
      ${head}
      ${
        hasSoc
          ? `<div class="hist">
              <div class="hist-row"><span>${esc(t("hist_soc"))}</span><b>${fmtNum(last(h.soc), 0, lang)} %</b></div>
              ${historyChart({ series: [{ points: h.soc, color: "var(--tb-batt)", area: true }], from: h.from, to: h.to, max: 100, label: t("hist_soc_label", { v: fmtNum(last(h.soc), 0, lang) }) })}
              ${axis}
            </div>`
          : ""
      }
      ${
        hasPower
          ? `<div class="hist">
              <div class="hist-row"><span>${esc(t("hist_power"))}</span><b>max ${fmtW(pmax, lang)}</b></div>
              ${historyChart({
                series: [
                  { points: h.pv || [], color: "var(--tb-pv)", area: true },
                  { points: h.grid || [], color: "var(--tb-grid)", area: true },
                ],
                from: h.from,
                to: h.to,
                max: pmax,
                label: t("hist_power_label"),
              })}
              ${axis}
              <div class="legend">
                ${h.pv?.length ? `<span><span class="dot" style="--c:var(--tb-pv)"></span>${esc(t("pv"))}</span>` : ""}
                ${h.grid?.length ? `<span><span class="dot" style="--c:var(--tb-grid)"></span>${esc(t("grid"))}</span>` : ""}
              </div>
            </div>`
          : ""
      }
    </div>`;
};

// Recent activity (mode, grid charging, targets) from the logbook; the heading folds it.
export const activity = (v) => {
  const a = v.activity;
  if (!a) return "";
  const { t, lang } = v;
  const head = `<button type="button" class="section-title fold${a.open ? "" : " closed"}" data-fold="activity" aria-expanded="${a.open}">
      ${svgIcon(ICONS.clock)}<span>${esc(t("activity"))}</span><span class="fold-note">${esc(t("activity_hours", { h: a.hours }))}</span>${svgIcon(ICONS.chevron, "icon chevron")}</button>`;
  if (!a.open) return `<div>${head}</div>`;
  if (a.loading && !a.rows?.length) return `<div>${head}<div class="empty">${esc(t("loading_activity"))}</div></div>`;
  if (!a.rows?.length) return `<div>${head}<div class="empty">${esc(t("no_activity", { h: a.hours }))}</div></div>`;
  const items = a.rows.map((r) => {
    const meta = [r.who ? t("act_by", { who: r.who }) : "", r.reason || ""].filter(Boolean).map(esc).join(" · ");
    return `<li class="clickable" data-more="${esc(r.entity)}" style="--c:${r.color}">
        <span class="act-dot" aria-hidden="true"></span>
        <div>
          <div class="act-top"><span class="act-title">${esc(r.title)}</span><time datetime="${new Date(r.t).toISOString()}">${esc(fmtWhen(r.t, v.now, lang, v.hass?.locale))}</time></div>
          ${meta ? `<div class="act-meta">${meta}</div>` : ""}
        </div>
      </li>`;
  });
  return `<div>${head}<ol class="act">${items.join("")}</ol></div>`;
};

export const RENDERERS = { header, battery, price, reasons, controls, footer, history, activity };
