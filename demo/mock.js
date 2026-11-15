import { computeWindow, normalizeSlots } from "../src/shared.js";

// Fake `hass` for the demo page and the screenshots: the entities of the author's installation,
// Tibber 15-minute prices of 14 Nov 2026 (ct/kWh) replayed on the current day.
export const PRICES = [
  39.32, 37.96, 37.46, 37.5, 37.91, 37.62, 37.25, 37.1, 36.98, 36.89, 36.57, 36.43, 37.09, 36.95, 36.88, 36.64, 36.42,
  36.35, 36.72, 36.73, 36.44, 36.67, 36.6, 37, 36.67, 37.94, 38.97, 39.69, 41.28, 42, 42.65, 42.01, 43.86, 41.92, 41.06,
  39.05, 38.27, 37.58, 36.26, 35.07, 35.33, 34.41, 34.48, 34.9, 33.13, 32.71, 32.79, 32.95, 32.73, 32.53, 32.54, 32.96,
  33.45, 33.66, 34.37, 34.24, 34.59, 36.55, 38.97, 41.26, 37.72, 39.56, 42.02, 43.67, 42.89, 44.19, 44.94, 45.41, 45.65,
  46.98, 47.11, 46.75, 46.82, 46.22, 45.5, 44.57, 44.72, 45.02, 44.45, 43.18, 41.36, 39.38, 39.49, 39.77, 39.38, 40,
  39.39, 38.7, 40.33, 38.9, 39.79, 38.64, 38.96, 38.14, 37.29, 36.73,
];

const dayPrices = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const out = [];
  for (let i = 0, t = d.getTime(); new Date(t).getDate() === d.getDate(); i++, t += 900000)
    out.push({ start_time: new Date(t).toISOString(), price: (PRICES[i % 96] + offset * 1.7) / 100 });
  return out;
};

// The price sensor of the README template: today / tomorrow, day figures and the rolling charging window.
const priceSensor = () => {
  const today = dayPrices(0);
  const tomorrow = dayPrices(1);
  const ps = today.map((e) => e.price);
  const all = normalizeSlots([...today, ...tomorrow]);
  const now = Date.now();
  const cur = all.find((x, i) => x.t <= now && (all[i + 1]?.t ?? Number.POSITIVE_INFINITY) > now);
  const ladefenster = [...computeWindow(all, now)].sort((a, b) => a - b).map((t) => new Date(t).toISOString());
  return s((cur?.p ?? 0) / 100, {
    unit_of_measurement: "EUR/kWh",
    today,
    tomorrow,
    min_today: Math.min(...ps),
    max_today: Math.max(...ps),
    avg_today: ps.reduce((a, b) => a + b, 0) / ps.length,
    ladefenster,
  });
};

export const SCENARIOS = {
  pv: {
    soc: 76,
    batt: 380,
    pv: 520,
    grid: 0,
    house: 140,
    sw: "off",
    mode: "auto",
    deficit: 0,
    block: "on",
    win: "True",
    reason: "PV liefert Strom",
  },
  grid: {
    soc: 41,
    batt: 910,
    pv: 60,
    grid: 850,
    house: 150,
    sw: "on",
    mode: "auto",
    deficit: 0.62,
    block: "off",
    win: "True",
    reason: "Günstiges Ladefenster, Defizit 0.6 kWh",
  },
  home: {
    soc: 58,
    batt: -420,
    pv: 0,
    grid: 0,
    house: 420,
    sw: "off",
    mode: "auto",
    deficit: 0,
    block: "off",
    win: "False",
    reason: "Abend: Preis nicht im Ladefenster",
  },
  forced: {
    soc: 52,
    batt: 880,
    pv: 40,
    grid: 840,
    house: 160,
    sw: "on",
    mode: "erzwingen",
    deficit: 0.3,
    block: "off",
    win: "False",
    reason: "Modus Erzwingen",
    until: "13:00",
  },
  blocked: {
    soc: 33,
    batt: 90,
    pv: 90,
    grid: 0,
    house: 130,
    sw: "off",
    mode: "sperren",
    deficit: 0.48,
    block: "off",
    win: "True",
    reason: "Modus Sperren",
    until: "13:00",
  },
};

// input_datetime state as Home Assistant sends it: local "YYYY-MM-DD HH:MM:SS" plus the epoch timestamp.
const datetimeState = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  const state = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
  return s(state, { has_date: true, has_time: true, timestamp: Math.floor(ms / 1000) });
};

// Override end of a scenario: "HH:MM" today, else (Auto) an end that has passed already.
const untilOf = (sc) => {
  const d = new Date();
  if (!sc.until) return d.getTime() - 3600000;
  const [h, m] = sc.until.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

const s = (state, attributes = {}) => ({ state: String(state), attributes, last_updated: new Date().toISOString() });

export const makeStates = (sc) => ({
  "sensor.tibber_preise_15min": priceSensor(),
  "sensor.solarbank_2_e1600_ac_ladestand": s(sc.soc, { unit_of_measurement: "%", device_class: "battery" }),
  "input_number.tibber_anker_capacity_kwh": s(1.6, { min: 0.5, max: 10, step: 0.1, unit_of_measurement: "kWh" }),
  "sensor.solarbank_2_e1600_ac_akkuleistung": s(sc.batt, { unit_of_measurement: "W" }),
  "sensor.solarbank_2_e1600_ac_solarleistung": s(sc.pv, { unit_of_measurement: "W" }),
  "sensor.solarbank_2_e1600_ac_netzaufladung": s(sc.grid, { unit_of_measurement: "W" }),
  "sensor.solarbank_2_e1600_ac_hausbedarf": s(sc.house, { unit_of_measurement: "W" }),
  "switch.solarbank_2_e1600_ac_notladeoption": s(sc.sw),
  "input_select.tibber_netzlade_modus": s(sc.mode, { options: ["auto", "erzwingen", "sperren"] }),
  "input_number.tibber_target_evening_soc": s("70.0", { min: 20, max: 100, step: 1, unit_of_measurement: "%" }),
  "input_number.tibber_erzwingen_ziel_soc": s("100.0", { min: 20, max: 100, step: 5, unit_of_measurement: "%" }),
  "input_datetime.tibber_override_ablauf": datetimeState(untilOf(sc)),
  "input_text.tibber_netzlade_grund": s(sc.reason ?? ""),
  "sensor.tibber_energie_defizit_heute_kwh": s(sc.deficit, { unit_of_measurement: "kWh" }),
  "binary_sensor.pv_berlin_erzeugung_aktiv": s(sc.block),
  "sensor.tibber_aktuell_in_top6_gunstig_heute": s(sc.win),
  "sensor.pv_forecast_korrekturfaktor_berlin": s(1.51),
  "sensor.tibber_ersparnis_heute": s(0.009, { unit_of_measurement: "EUR" }),
  "input_number.tibber_grid_charge_kwh_today": s(0.312, { unit_of_measurement: "kWh" }),
  "sensor.pv_power_from_solar_daily": s(4.51, { unit_of_measurement: "kWh" }),
  "sensor.energy_production_today": s(3.02, { unit_of_measurement: "kWh" }),
});

export const CONFIG = {
  type: "custom:tibber-battery-card",
  name: "Akku Berlin",
  subtitle: "Tibber · Solarbank 2 E1600",
  price_entity: "sensor.tibber_preise_15min",
  soc_entity: "sensor.solarbank_2_e1600_ac_ladestand",
  capacity_entity: "input_number.tibber_anker_capacity_kwh",
  battery_power_entity: "sensor.solarbank_2_e1600_ac_akkuleistung",
  pv_power_entity: "sensor.solarbank_2_e1600_ac_solarleistung",
  grid_charge_power_entity: "sensor.solarbank_2_e1600_ac_netzaufladung",
  house_power_entity: "sensor.solarbank_2_e1600_ac_hausbedarf",
  grid_charge_switch: "switch.solarbank_2_e1600_ac_notladeoption",
  mode_entity: "input_select.tibber_netzlade_modus",
  target_soc_entity: "input_number.tibber_target_evening_soc",
  force_target_soc_entity: "input_number.tibber_erzwingen_ziel_soc",
  override_until_entity: "input_datetime.tibber_override_ablauf",
  reason_entity: "input_text.tibber_netzlade_grund",
  deficit_entity: "sensor.tibber_energie_defizit_heute_kwh",
  pv_block_entity: "binary_sensor.pv_berlin_erzeugung_aktiv",
  window_entity: "sensor.tibber_aktuell_in_top6_gunstig_heute",
  forecast_factor_entity: "sensor.pv_forecast_korrekturfaktor_berlin",
  savings_today_entity: "sensor.tibber_ersparnis_heute",
  grid_kwh_today_entity: "input_number.tibber_grid_charge_kwh_today",
  pv_today_entity: "sensor.pv_power_from_solar_daily",
  pv_forecast_today_entity: "sensor.energy_production_today",
};

// 24 h of plausible history in the compressed format ({s, lu}): night discharge, PV around noon, grid charge at 12:00.
const fakeHistory = (msg) => {
  const end = Date.parse(msg.end_time);
  const start = Date.parse(msg.start_time);
  const rows = { soc: [], pv: [], grid: [] };
  let soc = 40;
  for (let t = start; t <= end; t += 900000) {
    const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    const pv = h > 8 && h < 16.5 ? Math.max(0, Math.round(620 * Math.sin(((h - 8) / 8.5) * Math.PI))) : 0;
    const grid = h >= 12 && h < 13 ? 850 : 0;
    soc = Math.max(10, Math.min(100, soc + (pv > 150 ? 1.6 : 0) + (grid ? 4 : 0) - (h > 17 || h < 7 ? 0.9 : 0)));
    const lu = t / 1000;
    rows.soc.push({ s: String(Math.round(soc)), lu });
    rows.pv.push({ s: String(pv), lu });
    rows.grid.push({ s: String(grid), lu });
  }
  const ids = {
    soc: "sensor.solarbank_2_e1600_ac_ladestand",
    pv: "sensor.solarbank_2_e1600_ac_solarleistung",
    grid: "sensor.solarbank_2_e1600_ac_netzaufladung",
  };
  return Object.fromEntries(
    Object.entries(ids)
      .filter(([, id]) => msg.entity_ids.includes(id))
      .map(([k, id]) => [id, rows[k]]),
  );
};

// A hass object whose services change its own states and notify `onChange`.
export const makeHass = (scenario, { language = "de", onChange } = {}) => {
  let current;
  const hass = {
    language,
    locale: { language },
    states: makeStates(SCENARIOS[scenario] || SCENARIOS.pv),
    services: { tibber: { get_prices: {} }, input_select: {}, input_number: {} },
    async callWS(msg) {
      if (msg.type === "call_service" && msg.domain === "tibber")
        return { response: { prices: { "Casa Berlin": [...dayPrices(0), ...dayPrices(1)] } } };
      if (msg.type === "history/history_during_period") return fakeHistory(msg);
      throw new Error(`unsupported ${msg.type}`);
    },
    callService(domain, _service, data) {
      const next = { ...current, states: { ...current.states } };
      const id = data.entity_id;
      const old = next.states[id];
      if (domain === "input_select") {
        next.states[id] = s(data.option, old.attributes);
        // Like the controller in Home Assistant: Force/Block run 3 h, the reason follows the mode.
        const ablauf = "input_datetime.tibber_override_ablauf";
        const grund = "input_text.tibber_netzlade_grund";
        if (data.option !== "auto") next.states[ablauf] = datetimeState(Date.now() + 3 * 3600000);
        const text = { erzwingen: "Modus Erzwingen", sperren: "Modus Sperren" }[data.option];
        next.states[grund] = s(text ?? "PV liefert Strom");
        next.states["switch.solarbank_2_e1600_ac_notladeoption"] = s(data.option === "erzwingen" ? "on" : "off");
      }
      if (domain === "input_number") next.states[id] = s(data.value, old.attributes);
      current = next;
      onChange?.(next);
      return Promise.resolve();
    },
  };
  current = hass;
  return hass;
};
