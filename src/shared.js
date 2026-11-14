// Shared logic of the Tibber Battery Card: strings, formatting, entity access, prices and status.
// Everything here is pure (no DOM), so it is tested directly with node:test.

export const QUARTER = 15 * 60 * 1000;

export const SECTIONS = ["header", "battery", "price", "reasons", "controls", "footer"];

export const DEFAULTS = {
  sections: SECTIONS,
  animations: true,
  popup: false,
  show_history: false,
  show_tomorrow: false,
  cheap_slots: 24,
  window_horizon_slots: 48,
  window_attribute: "ladefenster",
  price_today_attribute: "today",
  price_tomorrow_attribute: "tomorrow",
  price_time_key: "start_time",
  price_value_key: "price",
  invert_battery_power: false,
  mode_options: { auto: "auto", force: "erzwingen", block: "sperren" },
};

export const STRINGS = {
  de: {
    default_name: "Heimspeicher",
    st_pv: "PV lädt",
    st_grid: "Netz lädt",
    st_grid_forced: "Netz lädt (erzwungen)",
    st_discharging: "Akku versorgt Haus",
    st_blocked: "Gesperrt",
    st_idle: "Bereit",
    soc: "Ladestand",
    target: "Ziel",
    target_soc: "Ziel-SoC bis Abend",
    pv_to_batt: "PV → Akku",
    batt_to_house: "Akku → Haus",
    grid_to_batt: "Netz → Akku",
    house: "Hausverbrauch",
    price_now: "Strompreis jetzt",
    per_kwh: "ct/kWh",
    cheap: "günstig",
    mid: "mittel",
    expensive: "teuer",
    min: "Min",
    avg: "Ø",
    max: "Max",
    hours_suffix: "Uhr",
    legend_window: "Ladefenster",
    legend_now: "jetzt",
    legend_forecast: "Prognose",
    no_prices: "Keine Preise verfügbar",
    loading_prices: "Preise werden geladen …",
    chart_label: "Strompreis in 15-Minuten-Schritten, aktuell {p} ct/kWh, Ladefenster markiert",
    why_grid: "Warum lädt er aus dem Netz?",
    why_not_grid: "Warum lädt er nicht aus dem Netz?",
    deficit: "Defizit",
    pv_block: "PV-Sperre",
    active: "aktiv",
    free: "frei",
    window: "Ladefenster",
    yes: "ja",
    no: "nein",
    forecast: "Forecast ×",
    mode: "Modus",
    grid_charging: "Netzladen",
    mode_auto: "Auto",
    mode_force: "Erzwingen",
    mode_block: "Sperren",
    hint_auto: "Controller entscheidet nach Defizit, Preis und PV.",
    hint_force: "Lädt aus dem Netz bis zum Ziel-SoC.",
    hint_block: "Kein Laden aus dem Netz.",
    savings_today: "Ersparnis heute",
    grid_today: "Netzladung heute",
    pv_today: "PV Ist / Prognose",
    ring_label: "Ladestand {soc} %, Ziel {target} %",
    open_details: "Details öffnen",
    close: "Schließen",
    history: "Letzte 24 Stunden",
    hist_soc: "Ladestand",
    hist_power: "PV und Netzladung",
    pv: "PV",
    grid: "Netz",
    loading_history: "Verlauf wird geladen …",
    no_history: "Kein Verlauf verfügbar",
    hist_soc_label: "Ladestand der letzten 24 Stunden, aktuell {v} %",
    hist_power_label: "PV-Leistung und Netzladung der letzten 24 Stunden",
  },
  en: {
    default_name: "Home battery",
    st_pv: "PV charging",
    st_grid: "Grid charging",
    st_grid_forced: "Grid charging (forced)",
    st_discharging: "Battery powers home",
    st_blocked: "Blocked",
    st_idle: "Ready",
    soc: "State of charge",
    target: "Target",
    target_soc: "Target SoC by evening",
    pv_to_batt: "PV → battery",
    batt_to_house: "Battery → home",
    grid_to_batt: "Grid → battery",
    house: "Home consumption",
    price_now: "Price now",
    per_kwh: "ct/kWh",
    cheap: "cheap",
    mid: "normal",
    expensive: "expensive",
    min: "Min",
    avg: "Avg",
    max: "Max",
    hours_suffix: "h",
    legend_window: "Charging window",
    legend_now: "now",
    legend_forecast: "upcoming",
    no_prices: "No prices available",
    loading_prices: "Loading prices …",
    chart_label: "Electricity price in 15-minute steps, now {p} ct/kWh, charging window marked",
    why_grid: "Why is it charging from the grid?",
    why_not_grid: "Why is it not charging from the grid?",
    deficit: "Deficit",
    pv_block: "PV lock",
    active: "active",
    free: "off",
    window: "Charging window",
    yes: "yes",
    no: "no",
    forecast: "Forecast ×",
    mode: "Mode",
    grid_charging: "Grid charging",
    mode_auto: "Auto",
    mode_force: "Force",
    mode_block: "Block",
    hint_auto: "The controller decides from deficit, price and PV.",
    hint_force: "Charges from the grid up to the target SoC.",
    hint_block: "No charging from the grid.",
    savings_today: "Savings today",
    grid_today: "Grid charge today",
    pv_today: "PV actual / forecast",
    ring_label: "State of charge {soc} %, target {target} %",
    open_details: "Open details",
    close: "Close",
    history: "Last 24 hours",
    hist_soc: "State of charge",
    hist_power: "PV and grid charging",
    pv: "PV",
    grid: "Grid",
    loading_history: "Loading history …",
    no_history: "No history available",
    hist_soc_label: "State of charge over the last 24 hours, now {v} %",
    hist_power_label: "PV power and grid charging over the last 24 hours",
  },
};

export const langOf = (config, hass) => {
  const l = (config?.language || hass?.locale?.language || hass?.language || "en").slice(0, 2);
  return STRINGS[l] ? l : "en";
};

export const translator = (lang) => (key, vars) => {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const fmtNum = (n, digits, lang) =>
  n == null || !Number.isFinite(n)
    ? "–"
    : n.toLocaleString(lang === "de" ? "de-DE" : "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtW = (w, lang, sign = false) => {
  if (w == null || !Number.isFinite(w)) return "–";
  const r = Math.round(w);
  const s = Math.abs(r) >= 10000 ? `${fmtNum(r / 1000, 1, lang)} kW` : `${fmtNum(Math.abs(r), 0, lang)} W`;
  if (r === 0) return s;
  if (r < 0) return `−${s}`;
  return sign ? `+${s}` : s;
};

export const fmtTime = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const BAD = new Set(["unavailable", "unknown", "none", ""]);

export const stateOf = (hass, id) => {
  if (!id) return undefined;
  const st = hass?.states?.[id];
  return st && !BAD.has(String(st.state).toLowerCase()) ? st : undefined;
};

export const numOf = (hass, id) => {
  const st = stateOf(hass, id);
  if (!st) return undefined;
  const n = Number.parseFloat(String(st.state).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

// Power in W, kW converted.
export const powerOf = (hass, id) => {
  const n = numOf(hass, id);
  if (n == null) return undefined;
  const unit = hass.states[id].attributes?.unit_of_measurement;
  return unit === "kW" ? n * 1000 : n;
};

export const boolOf = (hass, id) => {
  const st = stateOf(hass, id);
  if (!st) return undefined;
  const v = String(st.state).toLowerCase();
  if (["on", "true", "yes", "ja", "1", "home", "open"].includes(v)) return true;
  if (["off", "false", "no", "nein", "0"].includes(v)) return false;
  return undefined;
};

// Mode key ("auto" | "force" | "block") of the mode helper, through the configured option names.
export const modeOf = (hass, config) => {
  const st = stateOf(hass, config.mode_entity);
  if (!st) return undefined;
  const opts = { ...DEFAULTS.mode_options, ...config.mode_options };
  const v = String(st.state).toLowerCase();
  return Object.keys(opts).find((k) => String(opts[k]).toLowerCase() === v);
};

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export const startOfDay = (ms, addDays = 0) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + addDays);
  return d.getTime();
};

export const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const quarterStart = (ms) => {
  // Quarter hours are aligned on the wall clock; every offset in use is a multiple of 15 min.
  const off = new Date(ms).getTimezoneOffset() * 60000;
  return Math.floor((ms - off) / QUARTER) * QUARTER + off;
};

export const msToNextQuarter = (ms) => quarterStart(ms) + QUARTER - ms;

// "HH:MM" on the day of `dayStart` (DST safe: built from the wall clock).
export const atTime = (dayStart, hhmm) => {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map((x) => Number.parseInt(x, 10) || 0);
  const d = new Date(dayStart);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

// Local ISO string with offset, as Home Assistant services expect it.
export const localIso = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(Math.abs(n)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00${off >= 0 ? "+" : "-"}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

// List of {start_time, price} entries → sorted [{t, p}] with p in ct/kWh.
// Prices below 5 are taken as EUR/kWh (Tibber), anything above as ct/kWh already.
export const normalizeSlots = (list, timeKey = "start_time", valueKey = "price") => {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const raw = e[timeKey] ?? e.start ?? e.startsAt ?? e.time;
    const t = typeof raw === "number" ? raw : Date.parse(raw);
    const p = Number.parseFloat(e[valueKey] ?? e.value ?? e.total);
    if (Number.isFinite(t) && Number.isFinite(p)) out.push({ t, p });
  }
  out.sort((a, b) => a.t - b.t);
  const max = Math.max(...out.map((s) => Math.abs(s.p)), 0);
  if (max < 5) for (const s of out) s.p *= 100;
  return out;
};

// Prices read from an entity's attributes, no service call.
export const pricesFromEntity = (hass, config) => {
  const st = hass?.states?.[config.price_entity];
  if (!st) return undefined;
  const a = st.attributes || {};
  const tk = config.price_time_key || DEFAULTS.price_time_key;
  const vk = config.price_value_key || DEFAULTS.price_value_key;
  const today = normalizeSlots(a[config.price_today_attribute || DEFAULTS.price_today_attribute], tk, vk);
  const tomorrow = normalizeSlots(a[config.price_tomorrow_attribute || DEFAULTS.price_tomorrow_attribute], tk, vk);
  const winRaw = a[config.window_attribute ?? DEFAULTS.window_attribute];
  const window = Array.isArray(winRaw)
    ? winRaw.map((x) => (typeof x === "object" ? Date.parse(x?.[tk]) : Date.parse(x))).filter(Number.isFinite)
    : undefined;
  // Day figures from the sensor when it has them, in the unit the slots were converted to.
  const rawToday = a[config.price_today_attribute || DEFAULTS.price_today_attribute];
  const rawMax = Array.isArray(rawToday)
    ? Math.max(0, ...rawToday.map((e) => Math.abs(Number.parseFloat(e?.[vk])) || 0))
    : 0;
  const f = rawMax < 5 ? 100 : 1;
  const num = (k) => (Number.isFinite(Number.parseFloat(a[k])) ? Number.parseFloat(a[k]) * f : undefined);
  const stats =
    num("min_today") != null && num("max_today") != null && num("avg_today") != null
      ? { min: num("min_today"), max: num("max_today"), avg: num("avg_today") }
      : undefined;
  return { today, tomorrow, window, stats };
};

// Splits one list of slots into today / tomorrow relative to `now`.
export const splitDays = (slots, now) => {
  const d0 = startOfDay(now);
  const d1 = startOfDay(now, 1);
  const d2 = startOfDay(now, 2);
  return {
    today: slots.filter((s) => s.t >= d0 && s.t < d1),
    tomorrow: slots.filter((s) => s.t >= d1 && s.t < d2),
  };
};

// When the price cache must be refreshed (service fallback only).
export const shouldFetch = (cache, now) => {
  if (!cache) return true;
  if (cache.failedAt && quarterStart(cache.failedAt) === quarterStart(now)) return false;
  if (cache.day !== dayKey(now)) return true;
  if (!cache.today?.length) return quarterStart(cache.fetchedAt) !== quarterStart(now);
  const hour = new Date(now).getHours();
  if (!cache.tomorrow?.length && hour >= 13) return quarterStart(cache.fetchedAt) !== quarterStart(now);
  return false;
};

// Extracts the home's price list from a tibber.get_prices response.
export const parseTibberResponse = (res, home) => {
  const prices = res?.response?.prices ?? res?.prices;
  if (!prices || typeof prices !== "object") return [];
  const key = home && prices[home] ? home : Object.keys(prices)[0];
  return key ? prices[key] : [];
};

// Price cache with the tibber.get_prices fallback. One instance per card.
export class PriceSource {
  constructor() {
    this.cache = undefined;
    this.pending = undefined;
    this.listeners = new Set();
  }

  // Returns the prices to show now, and starts a fetch when needed; `onUpdate` runs once a fetch lands.
  get(hass, config, now, onUpdate) {
    if (config.price_entity) {
      const p = pricesFromEntity(hass, config);
      if (p) {
        const all = [...p.today, ...p.tomorrow];
        // Rolling sensors (yesterday/today) are tolerated: slots are re-split on the clock.
        return { ...splitDays(all, now), window: p.window, stats: p.stats, source: "entity" };
      }
      return { today: [], tomorrow: [], source: "entity", missing: true };
    }
    if (shouldFetch(this.cache, now) && !this.pending && hass?.callWS) this.fetch(hass, config, now);
    if (this.pending && onUpdate) this.listeners.add(onUpdate);
    if (!this.cache) return { today: [], tomorrow: [], source: "tibber", loading: !!this.pending };
    return { ...splitDays([...this.cache.today, ...this.cache.tomorrow], now), source: "tibber" };
  }

  async fetch(hass, config, now) {
    const day = dayKey(now);
    this.pending = hass
      .callWS({
        type: "call_service",
        domain: "tibber",
        service: "get_prices",
        service_data: { start: localIso(startOfDay(now)), end: localIso(startOfDay(now, 2)) },
        return_response: true,
      })
      .then((res) => {
        const slots = normalizeSlots(parseTibberResponse(res, config.tibber_home));
        const { today, tomorrow } = splitDays(slots, now);
        this.cache = { day, today, tomorrow, fetchedAt: Date.now() };
      })
      .catch((err) => {
        this.cache = { ...(this.cache || { day, today: [], tomorrow: [] }), failedAt: Date.now() };
        console.warn("tibber-battery-card: tibber.get_prices failed", err?.message || err);
      })
      .finally(() => {
        this.pending = undefined;
        const ls = [...this.listeners];
        this.listeners.clear();
        for (const fn of ls) fn();
      });
    return this.pending;
  }
}

// One price source per Tibber home / price sensor, shared by every card on the page (main, mini, popup).
const SOURCES = new Map();
export const sharedPriceSource = (config) => {
  const key = config.price_entity ? `e:${config.price_entity}` : `t:${config.tibber_home || ""}`;
  if (!SOURCES.has(key)) SOURCES.set(key, new PriceSource());
  return SOURCES.get(key);
};

export const priceStats = (slots) => {
  if (!slots.length) return undefined;
  const ps = slots.map((s) => s.p);
  return { min: Math.min(...ps), max: Math.max(...ps), avg: ps.reduce((a, b) => a + b, 0) / ps.length };
};

export const slotAt = (slots, now) => {
  const q = quarterStart(now);
  // Hourly sources: the slot that started last before now.
  let found;
  for (const s of slots) {
    if (s.t <= now) found = s;
    else break;
  }
  return slots.find((s) => s.t === q) ?? found;
};

// Rolling charging window, the same rule as the Home Assistant side: the `count` cheapest of the next
// `horizon` quarter hours from the current slot on (24 of 48 = 6 h out of the next 12 h). It runs past
// midnight once tomorrow's prices are there; with fewer slots left it takes min(count, available).
// Returns a Set of start times.
export const computeWindow = (slots, now, { count = 24, horizon = 48 } = {}) => {
  if (!slots.length || count <= 0 || horizon <= 0) return new Set();
  const cur = slotAt(slots, now);
  const start = cur ? slots.indexOf(cur) : slots.findIndex((s) => s.t > now);
  if (start < 0) return new Set();
  const pick = slots
    .slice(start, start + horizon)
    .sort((a, b) => a.p - b.p || a.t - b.t)
    .slice(0, count);
  return new Set(pick.map((s) => s.t));
};

// Contiguous window slots merged into [from, to) blocks.
export const windowBlocks = (slots, windowSet) => {
  const blocks = [];
  for (let i = 0; i < slots.length; i++) {
    if (!windowSet.has(slots[i].t)) continue;
    const end = slots[i + 1]?.t ?? slots[i].t + QUARTER;
    const last = blocks[blocks.length - 1];
    if (last && last.to === slots[i].t) last.to = end;
    else blocks.push({ from: slots[i].t, to: end });
  }
  return blocks;
};

// "cheap" | "mid" | "expensive" for the current price.
export const priceLevel = (price, stats, inWindow) => {
  if (price == null || !stats) return undefined;
  if (inWindow) return "cheap";
  const span = stats.max - stats.min;
  if (span <= 0) return "mid";
  const r = (price - stats.min) / span;
  return r <= 1 / 3 ? "cheap" : r >= 2 / 3 ? "expensive" : "mid";
};

// ---------------------------------------------------------------------------
// Battery state
// ---------------------------------------------------------------------------

const ACTIVE_W = 10;

// Reads every live value the card shows; missing entities give undefined, never an error.
export const readLive = (hass, config) => {
  let batt = powerOf(hass, config.battery_power_entity);
  if (batt != null && config.invert_battery_power) batt = -batt;
  const soc = numOf(hass, config.soc_entity);
  const capacity = numOf(hass, config.capacity_entity) ?? (Number.parseFloat(config.capacity_kwh) || undefined);
  const targetSt = stateOf(hass, config.target_soc_entity);
  return {
    soc,
    capacity,
    kwh: soc != null && capacity != null ? (soc / 100) * capacity : undefined,
    target: numOf(hass, config.target_soc_entity),
    targetAttrs: targetSt?.attributes,
    batt,
    pv: powerOf(hass, config.pv_power_entity),
    grid: powerOf(hass, config.grid_charge_power_entity),
    house: powerOf(hass, config.house_power_entity),
    gridSwitch: boolOf(hass, config.grid_charge_switch),
    mode: modeOf(hass, config),
  };
};

// Status pill: mode helper first, then the grid charge switch, then the power signs.
export const deriveStatus = ({ mode, gridSwitch, grid, batt, pv }) => {
  if (mode === "block") return "blocked";
  if (mode === "force") return "grid_forced";
  if (gridSwitch === true || (grid ?? 0) > ACTIVE_W) return "grid";
  if (batt != null) {
    if (batt < -ACTIVE_W) return "discharging";
    if (batt > ACTIVE_W) return "pv";
    return "idle";
  }
  return (pv ?? 0) > ACTIVE_W ? "pv" : "idle";
};

// Energy flows in W (all ≥ 0).
export const deriveFlows = ({ batt, pv, grid, house }) => {
  const g = Math.max(0, grid ?? 0);
  let pvToBatt;
  if (batt != null) pvToBatt = Math.max(0, batt - g);
  else pvToBatt = pv != null ? Math.max(0, pv) : undefined;
  if (pvToBatt != null && pv != null) pvToBatt = Math.min(pvToBatt, Math.max(0, pv));
  return {
    pvToBatt,
    battToHouse: batt != null ? Math.max(0, -batt) : undefined,
    gridToBatt: grid != null ? g : undefined,
    house: house != null ? Math.max(0, house) : undefined,
  };
};

export const STATUS_COLOR = {
  pv: "var(--tb-pv)",
  grid: "var(--tb-grid)",
  grid_forced: "var(--tb-grid)",
  discharging: "var(--tb-batt)",
  blocked: "var(--tb-block)",
  idle: "var(--secondary-text-color)",
};

// ---------------------------------------------------------------------------
// History (popup)
// ---------------------------------------------------------------------------

export const HISTORY_SPAN = 24 * 3600 * 1000;

// history/history_during_period message for the last 24 h of the given entities.
export const historyRequest = (ids, now) => ({
  type: "history/history_during_period",
  start_time: new Date(now - HISTORY_SPAN).toISOString(),
  end_time: new Date(now).toISOString(),
  entity_ids: ids,
  minimal_response: true,
  no_attributes: true,
  significant_changes_only: false,
});

// One entity's history → [{t, v}] (numeric states only), compressed ({s, lu}) or full ({state, last_changed}) rows.
export const parseHistory = (rows, scale = 1) => {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const raw = r.s ?? r.state;
    const t = r.lu != null ? r.lu * 1000 : r.lc != null ? r.lc * 1000 : Date.parse(r.last_changed ?? r.last_updated);
    const v = Number.parseFloat(String(raw).replace(",", "."));
    if (Number.isFinite(t) && Number.isFinite(v)) out.push({ t, v: v * scale });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
};
