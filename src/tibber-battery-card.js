/*
 * Tibber Battery Card for Home Assistant
 * https://github.com/hoentaex/ha-tibber-battery-card
 *
 * A home battery with a dynamic electricity tariff at a glance: state of charge, energy flows,
 * today's 15-minute prices with the charging window, why it is (not) charging from the grid,
 * and the grid-charge mode. The card holds no control logic: it shows states and sets helpers.
 *
 * Layout and look follow the cards of juju35 (https://github.com/juju35). MIT licence.
 */
import { slotIndexAt } from "./chart.js";
import { detectConfig, TibberBatteryCardEditor, TibberBatteryMiniCardEditor } from "./editor.js";
import "./popup.js";
import { mini, RENDERERS, STYLE } from "./sections.js";
import {
  boolOf,
  computeWindow,
  DEFAULTS,
  deriveFlows,
  deriveStatus,
  esc,
  fmtNum,
  fmtTime,
  HISTORY_SPAN,
  historyRequest,
  langOf,
  msToNextQuarter,
  numOf,
  parseHistory,
  priceLevel,
  priceStats,
  quarterStart,
  readLive,
  SECTIONS,
  sharedPriceSource,
  slotAt,
  startOfDay,
  stateOf,
  translator,
  windowBlocks,
} from "./shared.js";

const VERSION = __VERSION__;

// Config keys holding entity ids: their states decide when the card re-renders.
const entityIds = (config) =>
  Object.entries(config)
    .filter(([k, v]) => typeof v === "string" && /(_entity|_switch)$/.test(k))
    .map(([, v]) => v);

export class TibberBatteryCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._bound = false;
  }

  static getConfigElement() {
    return document.createElement("tibber-battery-card-editor");
  }

  static getStubConfig(hass) {
    return { type: "custom:tibber-battery-card", ...detectConfig(hass) };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    const sections = Array.isArray(config.sections) ? config.sections.filter((s) => SECTIONS.includes(s)) : SECTIONS;
    this._config = {
      ...DEFAULTS,
      ...config,
      sections,
      mode_options: { ...DEFAULTS.mode_options, ...(config.mode_options || {}) },
    };
    this._prices = sharedPriceSource(this._config);
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._schedule();
    if (this._hass && this._config) this._render(true);
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
    this._timer = undefined;
    this._dialog?.close();
  }

  // Wakes up at every full quarter hour: the now marker moves and prices may be due.
  _schedule() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._render(true);
      this._schedule();
    }, msToNextQuarter(Date.now()) + 500);
  }

  getCardSize() {
    const s = this._config?.sections || SECTIONS;
    const size = { header: 1, battery: 3, price: 4, reasons: 1, controls: 2, footer: 1 };
    return s.reduce((n, k) => n + (size[k] || 0), 0) + (this._config?.show_history ? 4 : 0);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _signature(now) {
    const st = this._hass.states;
    const parts = entityIds(this._config).map((id) => {
      const s = st[id];
      return s ? `${s.state}|${s.last_updated}` : "-";
    });
    return [
      quarterStart(now),
      this._prices.cache?.fetchedAt,
      this._prices.cache?.failedAt,
      this._hass.locale?.language,
      this._hass.themes?.darkMode,
      this._hist?.fetchedAt,
      this._hist?.loading,
      this._expanded,
      this._histOpen,
      ...parts,
    ].join(";");
  }

  _view(now) {
    const hass = this._hass;
    const config = this._config;
    const lang = langOf(config, hass);
    const t = translator(lang);
    const live = readLive(hass, config);
    const status = deriveStatus(live);
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      hass,
      config,
      lang,
      t,
      live,
      status,
      now,
      flows: deriveFlows(live),
      name: config.name ?? t("default_name"),
      subtitle: config.subtitle,
      animate: config.animations !== false && !reduced,
      prices: this._priceView(now),
      // A value being set only counts for the helper it was set on (the mode may switch meanwhile).
      dragTarget: this._dragEntity === live.activeTargetEntity ? this._dragTarget : undefined,
      popupButton: !!config.popup && !config._detail,
      closeButton: !!config._detail,
      history: config._detail || config.show_history ? this._historySection(now) : undefined,
      inline: config.popup === false,
      expanded: this._expanded,
      has: (id) => !!stateOf(hass, id),
      num: (id) => numOf(hass, id),
      bool: (id) => boolOf(hass, id),
    };
  }

  _priceView(now) {
    const config = this._config;
    const hass = this._hass;
    const hasTibber = !!hass.services?.tibber?.get_prices;
    const expected = !!config.price_entity || hasTibber;
    if (!expected) return { slots: [], expected: false };
    const p = this._prices.get(hass, config, now, () => this._render(true));
    const showTomorrow = config.show_tomorrow && p.tomorrow.length > 0;
    const slots = showTomorrow ? [...p.today, ...p.tomorrow] : p.today;
    if (!slots.length) return { slots: [], expected, loading: p.loading };
    const all = [...p.today, ...p.tomorrow];
    // The sensor's own window first (same blocks as the automations use), else the same rule computed here.
    const win = p.window
      ? new Set(p.window)
      : computeWindow(all, now, {
          count: Number(config.cheap_slots ?? 24) || 0,
          horizon: Number(config.window_horizon_slots ?? 48) || 0,
        });
    const days = showTomorrow ? 2 : 1;
    const stats = p.stats ?? priceStats(p.today.length ? p.today : slots);
    const current = slotAt(all, now);
    return {
      slots,
      expected,
      now,
      days,
      from: startOfDay(now),
      to: startOfDay(now, days),
      // Blocks over all known slots; the chart clips them to the days shown.
      blocks: windowBlocks(all, win),
      inWindow: current ? win.has(current.t) : undefined,
      stats,
      current,
      level: current ? priceLevel(current.p, stats, win.has(current.t)) : undefined,
    };
  }

  _render(force = false) {
    if (!this._hass || !this._config || this._dragging) return;
    const now = Date.now();
    const sig = this._signature(now);
    if (!force && sig === this._sig) return;
    this._sig = sig;
    let v;
    try {
      v = this._view(now);
    } catch (err) {
      console.error("tibber-battery-card:", err);
      return;
    }
    this._lastView = v;
    const html = this._content(v);
    const focus = this.shadowRoot.activeElement;
    const focusKey = focus?.hasAttribute?.("data-fold")
      ? "[data-fold]"
      : focus?.dataset?.mode
        ? `[data-mode="${focus.dataset.mode}"]`
        : focus?.id
          ? `#${focus.id}`
          : "";
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="${this._config._detail ? "detail" : ""}">${html}</ha-card>`;
    if (this._dialog) this._dialog.hass = this._hass;
    if (focusKey) this.shadowRoot.querySelector(focusKey)?.focus();
    this._bind();
  }

  // Header and sections of the full card.
  _content(v, withHeader = true) {
    // The 24 h charts: always in the detail view, in the normal view with show_history.
    const withHistory = this._config._detail || this._config.show_history;
    const order = [...this._config.sections, ...(withHistory ? ["history"] : [])];
    const head = withHeader && order.includes("header") ? RENDERERS.header(v) : "";
    const body = order
      .filter((s) => s !== "header")
      .map((s) => {
        try {
          return RENDERERS[s](v);
        } catch (err) {
          console.error(`tibber-battery-card: section ${s}`, err);
          return "";
        }
      })
      .filter(Boolean)
      .join("");
    return `${head}<div class="content"${head || !withHeader ? "" : ' style="padding-top:16px"'}>${body}</div>`;
  }

  // The history section: open or folded (history_collapsed sets the start, the heading toggles it).
  _historySection(now) {
    const open = this._histOpen ?? !this._config.history_collapsed;
    if (!open) return { open: false };
    const h = this._historyView(now);
    return h ? { ...h, open: true } : undefined;
  }

  // 24 h history for the detail view, fetched on open and refreshed every 5 minutes.
  _historyView(now) {
    const c = this._config;
    const ids = [c.soc_entity, c.pv_power_entity, c.grid_charge_power_entity].filter(
      (id) => id && this._hass.states[id],
    );
    if (!ids.length || !this._hass.callWS) return undefined;
    const stale = !this._hist || (!this._hist.loading && now - (this._hist.fetchedAt || 0) > 5 * 60 * 1000);
    if (stale) {
      this._hist = { ...(this._hist || {}), loading: true };
      const scale = (id) => (this._hass.states[id]?.attributes?.unit_of_measurement === "kW" ? 1000 : 1);
      this._hass
        .callWS(historyRequest(ids, now))
        .then((res) => {
          this._hist = {
            from: now - HISTORY_SPAN,
            to: now,
            soc: parseHistory(res?.[c.soc_entity]),
            pv: c.pv_power_entity ? parseHistory(res?.[c.pv_power_entity], scale(c.pv_power_entity)) : [],
            grid: c.grid_charge_power_entity
              ? parseHistory(res?.[c.grid_charge_power_entity], scale(c.grid_charge_power_entity))
              : [],
            fetchedAt: Date.now(),
          };
        })
        .catch((err) => {
          console.warn("tibber-battery-card: history failed", err?.message || err);
          this._hist = { from: now - HISTORY_SPAN, to: now, soc: [], pv: [], grid: [], fetchedAt: Date.now() };
        })
        .finally(() => this._render(true));
    }
    return { from: now - HISTORY_SPAN, to: now, ...this._hist };
  }

  _openPopup(opener) {
    if (this._dialog) return;
    const v = this._lastView;
    const { type: _t, ...config } = this._config;
    this._dialog = document.createElement("tibber-battery-dialog");
    this._dialog.addEventListener("closed", () => {
      this._dialog = undefined;
    });
    this._dialog.open({ config, hass: this._hass, opener, label: v?.name || "" });
  }

  // Event delegation on the shadow root, bound once.
  _bind() {
    if (this._bound) return;
    this._bound = true;
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => {
      const open = e.target.closest?.("[data-open]");
      if (open) {
        this._openPopup(open);
        return;
      }
      if (e.target.closest?.("[data-fold]")) {
        this._histOpen = !(this._histOpen ?? !this._config.history_collapsed);
        this._render(true);
        return;
      }
      if (e.target.closest?.("[data-toggle]")) {
        this._expanded = !this._expanded;
        this._render(true);
        return;
      }
      if (e.target.closest?.("[data-close]")) {
        this.dispatchEvent(new CustomEvent("tibber-battery-close", { bubbles: true, composed: true }));
        return;
      }
      const mode = e.target.closest?.("[data-mode]");
      if (mode) {
        const option = this._config.mode_options[mode.dataset.mode];
        if (this._config.mode_entity && option != null)
          this._hass.callService("input_select", "select_option", { entity_id: this._config.mode_entity, option });
        return;
      }
      const more = e.target.closest?.("[data-more]");
      if (more?.dataset.more) {
        this.dispatchEvent(
          new CustomEvent("hass-more-info", { detail: { entityId: more.dataset.more }, bubbles: true, composed: true }),
        );
      }
    });
    root.addEventListener("pointerdown", (e) => {
      if (e.target.id === "target") this._dragging = true;
    });
    root.addEventListener("input", (e) => {
      if (e.target.id !== "target") return;
      this._dragTarget = Number(e.target.value);
      this._dragEntity = e.target.dataset.entity;
      const lbl = root.querySelector(".target-val");
      if (lbl) lbl.textContent = `${fmtNum(this._dragTarget, 0, this._lastView?.lang)} %`;
    });
    root.addEventListener("change", (e) => {
      if (e.target.id !== "target") return;
      this._dragging = false;
      const value = Number(e.target.value);
      this._dragTarget = value;
      // The slider names its helper: the Force target while forcing, else the target SoC.
      const entity = e.target.dataset.entity || this._config.target_soc_entity;
      const domain = entity.split(".")[0] === "number" ? "number" : "input_number";
      this._hass.callService(domain, "set_value", { entity_id: entity, value });
      // The helper's new state replaces the local value; give up on it after a few seconds.
      clearTimeout(this._dragTimer);
      this._dragTimer = setTimeout(() => {
        this._dragTarget = undefined;
        this._render(true);
      }, 4000);
    });
    const endDrag = () => {
      if (!this._dragging) return;
      this._dragging = false;
      this._render(true);
    };
    root.addEventListener("pointerup", () => setTimeout(endDrag, 0));
    root.addEventListener("pointercancel", endDrag);
    root.addEventListener("pointermove", (e) => this._tip(e));
    root.addEventListener("pointerleave", () => this._tip(null), true);
  }

  // Hover tooltip over the price chart: time and price of the slot under the pointer.
  _tip(e) {
    const plot = this.shadowRoot.querySelector(".plot");
    if (!plot) return;
    const tip = plot.querySelector(".tip");
    const line = plot.querySelector(".hover-line");
    const p = this._lastView?.prices;
    if (!e || !p?.slots?.length || !plot.contains(e.target)) {
      tip.hidden = true;
      line.hidden = true;
      return;
    }
    const r = plot.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const i = slotIndexAt(p.slots, p.from, p.to, frac);
    if (i < 0) return;
    const s = p.slots[i];
    const x = Math.max(36, Math.min(r.width - 36, frac * r.width));
    tip.textContent = `${fmtTime(s.t)} · ${fmtNum(s.p, 1, this._lastView.lang)} ct`;
    tip.style.left = `${x}px`;
    line.style.left = `${frac * r.width}px`;
    tip.hidden = false;
    line.hidden = false;
  }
}

// One row: ring, name, status, price and the button opening the detail popup (or, with popup: false,
// expanding the full card in place).
export class TibberBatteryMiniCard extends TibberBatteryCard {
  static getConfigElement() {
    return document.createElement("tibber-battery-mini-card-editor");
  }

  static getStubConfig(hass) {
    return { ...TibberBatteryCard.getStubConfig(hass), type: "custom:tibber-battery-mini-card" };
  }

  setConfig(config) {
    super.setConfig({ popup: true, ...config });
  }

  getCardSize() {
    return this._expanded ? 1 + super.getCardSize() : 1;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _content(v) {
    return `${mini(v)}${this._expanded && !this._config.popup ? super._content(v, false) : ""}`;
  }
}

if (!customElements.get("tibber-battery-card")) customElements.define("tibber-battery-card", TibberBatteryCard);
if (!customElements.get("tibber-battery-mini-card"))
  customElements.define("tibber-battery-mini-card", TibberBatteryMiniCard);
if (!customElements.get("tibber-battery-card-editor"))
  customElements.define("tibber-battery-card-editor", TibberBatteryCardEditor);
if (!customElements.get("tibber-battery-mini-card-editor"))
  customElements.define("tibber-battery-mini-card-editor", TibberBatteryMiniCardEditor);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "tibber-battery-card",
    name: "Tibber Battery Card",
    description: "Home battery with Tibber 15-minute prices, charging window and grid-charge mode",
  },
  {
    type: "tibber-battery-mini-card",
    name: "Tibber Battery Mini Card",
    description: "One-row home battery status with price; opens the detail view",
  },
])
  if (!window.customCards.some((c) => c.type === card.type))
    window.customCards.push({
      ...card,
      preview: true,
      documentationURL: "https://github.com/hoentaex/ha-tibber-battery-card",
    });

console.info(`%c TIBBER-BATTERY-CARD %c ${esc(VERSION)} `, "color:#fff;background:#5fd08a;font-weight:700", "");
