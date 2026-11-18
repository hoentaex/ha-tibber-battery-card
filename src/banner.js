// Illustrated header ("banner"), in the style of juju35's cards: the grid connection of the house in a 90 px banner.
// A power pylon on the left feeds the house wall, where the meter cabinet with the Tibber Pulse hangs; a cable runs
// down to the battery, whose five LED segments show its state of charge. The current price and what the battery does
// stand top right, in the state colour; a 10 px ground strip under the banner carries that colour too.
import { esc, fmtNum, fmtW } from "./shared.js";

// Night picture: forced by illustration_theme, else Home Assistant's dark theme alone.
export const isNight = (hass, config) => {
  if (config.illustration_theme === "night") return true;
  if (config.illustration_theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

// Card status → scene: which way the power flows and the colour of the ground strip and the readout.
//   grid       grid charging (Auto or Force): blue, from the pylon through the meter into the battery
//   pv         PV charging: yellow, no grid flow
//   discharge  battery powers the home: green, from the battery back through the meter
//   blocked    grid charging blocked: amber
//   idle       nothing flows (also Force with its target reached): grey
export const sceneState = (status) =>
  ({
    grid: "grid",
    grid_forced: "grid",
    pv: "pv",
    discharging: "discharge",
    blocked: "blocked",
  })[status] || "idle";

// The two lines top right: the current price (else the battery power) and what happens.
export const readout = (v) => {
  const { t, lang, flows, prices, status } = v;
  const state = sceneState(status);
  const price = prices.current ? `${fmtNum(prices.current.p, 1, lang)} ct` : undefined;
  let what;
  if (state === "grid") what = `${t("grid_to_batt")} ${fmtW(flows.gridToBatt, lang, true)}`;
  else if (state === "pv") what = `${t("pv_to_batt")} ${fmtW(flows.pvToBatt, lang, true)}`;
  else if (state === "discharge") what = `${t("batt_to_house")} ${fmtW(flows.battToHouse, lang)}`;
  else if (state === "blocked") what = t("bn_blocked");
  else what = prices.inWindow === false ? t("bn_waiting") : t("st_idle");
  return { state, top: price ?? (v.live.soc != null ? `${Math.round(v.live.soc)} %` : ""), what };
};

// The scene, 200 × 80, drawn at the right of the banner (preserveAspectRatio xMaxYMax) on the ground strip.
export const gridScene = (state, soc, top, what) => {
  const lit = soc == null ? 0 : Math.max(0, Math.min(5, Math.round(soc / 20)));
  const charging = state === "grid" || state === "pv";
  const segs = [0, 1, 2, 3, 4]
    .map(
      (k) =>
        `<rect class="tb-seg${k < lit ? " on" : ""}${charging && k === lit - 1 ? " pulse" : ""}" x="${160 + k * 5.6}" y="64.5" width="4.4" height="3" rx="1"/>`,
    )
    .join("");
  const flowIn = state === "grid";
  const flowOut = state === "discharge";
  return `<svg class="scene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <g class="tb-stars"><circle cx="70" cy="8" r=".9"/><circle cx="112" cy="5" r=".8"/><circle cx="60" cy="22" r=".9"/></g>
    <g class="tb-pylon">
      <path d="M84 80L92 12L100 80M86.6 58H97.4M88.6 40H95.4M86.6 58L95.4 40M97.4 58L88.6 40M84 80L97.4 58M100 80L86.6 58"/>
      <path d="M78 18H106M82 27H102M92 12V8"/>
    </g>
    <g class="tb-ins"><rect x="77" y="18" width="2" height="3" rx=".6"/><rect x="105" y="18" width="2" height="3" rx=".6"/><rect x="81" y="27" width="2" height="3" rx=".6"/><rect x="101" y="27" width="2" height="3" rx=".6"/></g>
    <path class="tb-wire" d="M78 21Q50 30 20 22M82 30Q50 38 14 33M106 21Q118 30 126 36"/>
    ${flowIn ? `<path class="tb-flow grid" d="M106 21Q118 30 126 36"/>` : ""}
    <rect class="tb-house" x="118" y="0" width="82" height="80"/>
    <rect class="tb-edge" x="117" y="0" width="2" height="80"/>
    <rect class="tb-meter" x="124" y="30" width="22" height="30" rx="2"/>
    <rect class="tb-meter-d" x="128" y="35" width="14" height="6" rx="1"/>
    <path class="tb-meter-n" d="M130 38H140"/>
    <rect class="tb-pulse" x="129" y="45" width="12" height="10" rx="3"/>
    <circle class="tb-pulse-led" cx="135" cy="50" r="1.6"/>
    <path class="tb-cable" d="M135 60V70H150"/>
    ${flowIn ? `<path class="tb-flow grid" d="M135 60V70H150"/>` : ""}${flowOut ? `<path class="tb-flow out" d="M150 70H135V60"/>` : ""}
    <ellipse class="tb-shadow" cx="171" cy="79.4" rx="24" ry="2"/>
    <rect class="tb-box" x="150" y="55" width="44" height="23" rx="4.5"/>
    <rect class="tb-box-top" x="153" y="56.2" width="38" height="1.6" rx=".8"/>
    ${segs}
    <text class="tb-rd ${state}" x="194" y="16" text-anchor="end">${esc(top)}</text>
    <text class="tb-rd2" x="194" y="26" text-anchor="end">${esc(what)}</text>
  </svg>`;
};

export const BANNER_STYLE = `
  .banner { position: relative; overflow: hidden; height: 90px; --g: 10px; --sw: min(200px, 54cqw); color: #0d2a45; --sky-muted: #3b5b78;
            background: linear-gradient(90deg, #f1f8ff 0%, #e2f1fd 34%, #b9def8 70%, #9fd0f3 100%); }
  .banner.night { color: #fff; --sky-muted: rgba(255,255,255,.78);
                  background: linear-gradient(90deg, #1b2f52 0%, #15284a 36%, #0f1f3d 72%, #0a1830 100%); }
  .banner .scene { position: absolute; right: 0; bottom: var(--g); height: calc(100% - var(--g)); width: var(--sw); overflow: visible;
                   -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,.35) 0, rgba(0,0,0,.35) 12%, #000 42%);
                   mask-image: linear-gradient(90deg, rgba(0,0,0,.35) 0, rgba(0,0,0,.35) 12%, #000 42%); }
  .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: var(--g); --t: rgba(255,255,255,.55); }
  .banner.night .ground { --t: rgba(255,255,255,.22); }
  .ground.grid { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #8cc0f5, #2f80ed); box-shadow: inset 0 2px 0 #b9d8fa; }
  .night .ground.grid { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #1f3e66, #16304f); box-shadow: inset 0 2px 0 #2a4d7a; }
  .ground.pv { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #ffd978, #f2a516); box-shadow: inset 0 2px 0 #ffe9a8; }
  .night .ground.pv { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #6b5420, #4d3a12); box-shadow: inset 0 2px 0 #7d6428; }
  .ground.discharge { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #8fd47a, #43a047); box-shadow: inset 0 2px 0 #b5e3a5; }
  .night .ground.discharge { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #2a5a2c, #1c4220); box-shadow: inset 0 2px 0 #356a38; }
  .ground.blocked { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #ffd27a, #e8960c); box-shadow: inset 0 2px 0 #ffe3a8; }
  .night .ground.blocked { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #6b4f1a, #4f3810); box-shadow: inset 0 2px 0 #7d6026; }
  .ground.idle { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #d3d8de, #aab2bb); box-shadow: inset 0 2px 0 #e6e9ed; }
  .night .ground.idle { background-image: repeating-linear-gradient(90deg, var(--t) 0 1px, transparent 1px 12px), linear-gradient(90deg, #3a414b, #2b3139); box-shadow: inset 0 2px 0 #4a525d; }
  .banner .head { position: absolute; z-index: 1; left: 0; top: 0; bottom: var(--g); right: calc(var(--sw) - 60px); display: flex; align-items: center;
                  gap: 10px; padding: 8px 8px 8px 14px; min-width: 0; }
  .banner .logo { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 28%, transparent);
                  color: color-mix(in srgb, var(--c) 82%, #0d2a45); }
  .banner .logo .icon { width: 24px; height: 24px; }
  .banner.night .logo { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); color: color-mix(in srgb, var(--c) 75%, #fff); }
  .banner .titles { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: center; align-self: stretch; }
  .banner .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .banner .name { flex: 0 1 auto; min-width: 0; }
  .banner .sub { font-size: 13px; color: var(--sky-muted); }
  .banner .chip { flex: none; margin: 0; padding: 1px 8px; font-size: 11px; line-height: 16px; max-width: none;
                  background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
  .banner.night .chip { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #fff); }
  .banner .titles.below .trow { display: contents; }
  .banner .titles.below .chip { order: 9; align-self: flex-start; margin-top: 3px; }
  .banner .titles.dotonly .chip { padding: 4px; } .banner .titles.dotonly .chip > span:last-child { display: none; }
  .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; margin: 0; width: 24px; height: 24px; border-radius: 50%; color: #33506b;
                  background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .banner .zoom .icon { width: 16px; height: 16px; }
  .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
  .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
  .banner:has(> .zoom) .scene { right: 34px; }
  /* The house wall goes on under the corner button, up to the banner's edge. */
  .banner .wallx { display: none; position: absolute; top: 0; right: 0; bottom: var(--g); width: 34px; background: #eef1f4; }
  .banner.night .wallx { background: #222a37; }
  .banner:has(> .zoom) .wallx { display: block; }
  .banner:has(> .zoom) .head { right: calc(var(--sw) - 24px); }
  .banner + .content { padding-top: 16px; }
  .banner + .mini { padding-top: 10px; }
  @container (max-width: 280px) { .banner .scene, .banner .wallx { display: none !important; } .banner .head, .banner:has(> .zoom) .head { right: 30px; } }
  @container (max-width: 200px) { .banner .chip { padding: 4px; } .banner .chip > span:last-child { display: none; } }
  /* The scene */
  .tb-stars { display: none; } .night .tb-stars { display: inline; }
  .tb-stars circle { fill: #fff; animation: tb-blink 2.6s ease-in-out infinite; }
  .tb-stars circle:nth-child(2) { animation-delay: .9s; } .tb-stars circle:nth-child(3) { animation-delay: 1.7s; }
  .tb-pylon path { fill: none; stroke: #8794a3; stroke-width: 1.1; stroke-linejoin: round; } .night .tb-pylon path { stroke: #4d5d76; }
  .tb-ins rect { fill: #6b7785; } .night .tb-ins rect { fill: #5b6b84; }
  .tb-wire { fill: none; stroke: #6b7785; stroke-width: .7; } .night .tb-wire { stroke: #4d5d76; }
  .tb-house { fill: #eef1f4; } .night .tb-house { fill: #222a37; }
  .tb-edge { fill: #d3d9e0; } .night .tb-edge { fill: #2e3848; }
  .tb-meter { fill: #d9dee4; stroke: #b5bec8; } .night .tb-meter { fill: #2f3846; stroke: #46536a; }
  .tb-meter-d { fill: #1f2a36; } .tb-meter-n { stroke: #8ff0b0; stroke-width: 1.2; stroke-dasharray: 1.4 .8; }
  .tb-pulse { fill: #fff; stroke: #b5bec8; } .night .tb-pulse { fill: #e6eaee; stroke: #8995a3; }
  .tb-pulse-led { fill: #1a6dff; animation: tb-blink 1.1s ease-in-out infinite; }
  .tb-cable { fill: none; stroke: #5d6672; stroke-width: 1.6; stroke-linecap: round; } .night .tb-cable { stroke: #7a8494; }
  .tb-flow { fill: none; stroke-width: 2; stroke-dasharray: 3 4; stroke-linecap: round; animation: tb-dash .8s linear infinite; }
  .tb-flow.grid { stroke: #2f80ed; } .tb-flow.out { stroke: #43c463; }
  .tb-shadow { fill: #000; opacity: .14; } .night .tb-shadow { opacity: .35; }
  .tb-box { fill: #2f3540; } .night .tb-box { fill: #1c2129; stroke: #3c4452; stroke-width: .8; }
  .tb-box-top { fill: rgba(255,255,255,.18); }
  .tb-seg { fill: #4a525e; } .tb-seg.on { fill: #5fd08a; } .tb-seg.pulse { animation: tb-blink 1.4s ease-in-out infinite; }
  .tb-rd { font: 700 13px var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
  .tb-rd.grid { fill: #2f80ed; } .night .tb-rd.grid { fill: #8cc0f5; }
  .tb-rd.pv { fill: #c98a00; } .night .tb-rd.pv { fill: #ffc54d; }
  .tb-rd.discharge { fill: #2e9d4f; } .night .tb-rd.discharge { fill: #74d894; }
  .tb-rd.blocked { fill: #c27c0e; } .night .tb-rd.blocked { fill: #f2b85a; }
  .tb-rd.idle { fill: #6b7785; } .night .tb-rd.idle { fill: #aab4c0; }
  .tb-rd2 { font: 500 7.2px var(--paper-font-body1_-_font-family, Roboto, sans-serif); fill: #3b5b78; } .night .tb-rd2 { fill: rgba(255,255,255,.75); }
  @keyframes tb-dash { to { stroke-dashoffset: -14; } }
  @keyframes tb-blink { 50% { opacity: .25; } }
`;
