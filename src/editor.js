// Visual editor (ha-form) for both cards, and the entity auto-detection behind getStubConfig.
import { DEFAULTS, langOf, SECTIONS } from "./shared.js";

const LABELS = {
  de: {
    name: "Name",
    subtitle: "Untertitel",
    g_battery: "Akku und Leistung",
    g_control: "Steuerung",
    g_reasons: "Gründe und Entscheidung",
    g_footer: "Tagesbilanz",
    g_prices: "Preise und Ladefenster",
    g_display: "Darstellung",
    g_advanced: "Erweitert",
    soc_entity: "Ladestand (%)",
    capacity_entity: "Kapazität (Entity, kWh)",
    capacity_kwh: "Kapazität (fester Wert, kWh)",
    battery_power_entity: "Akkuleistung (+ laden / − entladen)",
    invert_battery_power: "Vorzeichen der Akkuleistung umdrehen",
    pv_power_entity: "PV-Leistung",
    grid_charge_power_entity: "Netzladeleistung",
    house_power_entity: "Hausverbrauch",
    grid_charge_switch: "Netzladen an/aus",
    mode_entity: "Modus-Helfer (input_select)",
    target_soc_entity: "Ziel-SoC (input_number)",
    force_target_soc_entity: "Ziel-SoC für Erzwingen (input_number)",
    override_until_entity: "Ablauf von Erzwingen/Sperren (input_datetime)",
    reason_entity: "Grund der Entscheidung (Text)",
    deficit_entity: "Energie-Defizit (kWh)",
    pv_block_entity: "PV-Sperre aktiv",
    window_entity: "Aktuell im Ladefenster",
    forecast_factor_entity: "Forecast-Korrekturfaktor",
    savings_today_entity: "Ersparnis heute",
    grid_kwh_today_entity: "Netzladung heute (kWh)",
    pv_today_entity: "PV heute (kWh)",
    pv_forecast_today_entity: "PV-Prognose heute (kWh)",
    price_entity: "Preissensor (leer: tibber.get_prices)",
    cheap_slots: "Ladefenster: günstigste Viertelstunden",
    window_horizon_slots: "Ladefenster: Horizont in Viertelstunden",
    show_tomorrow: "Morgen-Preise anhängen",
    sections: "Abschnitte",
    animations: "Animationen",
    popup: "Detailansicht als Popup",
    show_history: "24-h-Verlauf auch in der Karte",
    history_collapsed: "24-h-Verlauf anfangs eingeklappt",
    language: "Sprache",
    lang_auto: "Automatisch",
    mode_auto: "Option für Auto",
    mode_force: "Option für Erzwingen",
    mode_block: "Option für Sperren",
    tibber_home: "Tibber-Zuhause (leer: das erste)",
    price_today_attribute: "Attribut Preise heute",
    price_tomorrow_attribute: "Attribut Preise morgen",
    price_time_key: "Feld Startzeit",
    price_value_key: "Feld Preis",
    window_attribute: "Attribut mit fertigem Ladefenster",
    s_header: "Kopf",
    s_battery: "Akku und Flüsse",
    s_price: "Strompreis",
    s_reasons: "Gründe",
    s_controls: "Bedienung",
    s_footer: "Tagesbilanz",
  },
  en: {
    name: "Name",
    subtitle: "Subtitle",
    g_battery: "Battery and power",
    g_control: "Control",
    g_reasons: "Reasons and decision",
    g_footer: "Daily totals",
    g_prices: "Prices and charging window",
    g_display: "Display",
    g_advanced: "Advanced",
    soc_entity: "State of charge (%)",
    capacity_entity: "Capacity (entity, kWh)",
    capacity_kwh: "Capacity (fixed value, kWh)",
    battery_power_entity: "Battery power (+ charging / − discharging)",
    invert_battery_power: "Invert the battery power sign",
    pv_power_entity: "PV power",
    grid_charge_power_entity: "Grid charge power",
    house_power_entity: "Home consumption",
    grid_charge_switch: "Grid charging on/off",
    mode_entity: "Mode helper (input_select)",
    target_soc_entity: "Target SoC (input_number)",
    force_target_soc_entity: "Target SoC for Force (input_number)",
    override_until_entity: "End of Force/Block (input_datetime)",
    reason_entity: "Reason of the decision (text)",
    deficit_entity: "Energy deficit (kWh)",
    pv_block_entity: "PV lock active",
    window_entity: "Currently in charging window",
    forecast_factor_entity: "Forecast correction factor",
    savings_today_entity: "Savings today",
    grid_kwh_today_entity: "Grid charge today (kWh)",
    pv_today_entity: "PV today (kWh)",
    pv_forecast_today_entity: "PV forecast today (kWh)",
    price_entity: "Price sensor (empty: tibber.get_prices)",
    cheap_slots: "Charging window: cheapest quarter hours",
    window_horizon_slots: "Charging window: horizon in quarter hours",
    show_tomorrow: "Append tomorrow's prices",
    sections: "Sections",
    animations: "Animations",
    popup: "Detail view as a popup",
    show_history: "24 h history in the card too",
    history_collapsed: "24 h history collapsed at first",
    language: "Language",
    lang_auto: "Automatic",
    mode_auto: "Option for Auto",
    mode_force: "Option for Force",
    mode_block: "Option for Block",
    tibber_home: "Tibber home (empty: the first one)",
    price_today_attribute: "Attribute for today's prices",
    price_tomorrow_attribute: "Attribute for tomorrow's prices",
    price_time_key: "Start time field",
    price_value_key: "Price field",
    window_attribute: "Attribute with a ready-made charging window",
    s_header: "Header",
    s_battery: "Battery and flows",
    s_price: "Price",
    s_reasons: "Reasons",
    s_controls: "Controls",
    s_footer: "Daily totals",
  },
};

const ent = (name, domain, extra = {}) => ({ name, selector: { entity: { domain, ...extra } } });
const SENSOR_NUM = ["sensor", "input_number", "number"];

export const editorSchema = (lang, { mini = false } = {}) => {
  const L = LABELS[lang] || LABELS.en;
  return [
    { name: "name", selector: { text: {} } },
    { name: "subtitle", selector: { text: {} } },
    { name: "soc_entity", required: true, selector: { entity: { domain: SENSOR_NUM } } },
    {
      type: "expandable",
      name: "",
      title: L.g_battery,
      flatten: true,
      schema: [
        ent("battery_power_entity", ["sensor"]),
        { name: "invert_battery_power", selector: { boolean: {} } },
        ent("pv_power_entity", ["sensor"]),
        ent("grid_charge_power_entity", ["sensor"]),
        ent("house_power_entity", ["sensor"]),
        ent("grid_charge_switch", ["switch", "input_boolean", "binary_sensor"]),
        ent("capacity_entity", SENSOR_NUM),
        {
          name: "capacity_kwh",
          selector: { number: { min: 0, max: 100, step: 0.1, mode: "box", unit_of_measurement: "kWh" } },
        },
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_control,
      flatten: true,
      schema: [
        ent("mode_entity", ["input_select", "select"]),
        ent("target_soc_entity", ["input_number", "number"]),
        ent("force_target_soc_entity", ["input_number", "number"]),
        ent("override_until_entity", ["input_datetime", "sensor"]),
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_reasons,
      flatten: true,
      schema: [
        ent("reason_entity", ["input_text", "sensor", "text"]),
        ent("deficit_entity", SENSOR_NUM),
        ent("pv_block_entity", ["binary_sensor", "input_boolean", "sensor", "switch"]),
        ent("window_entity", ["binary_sensor", "input_boolean", "sensor"]),
        ent("forecast_factor_entity", SENSOR_NUM),
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_footer,
      flatten: true,
      schema: [
        ent("savings_today_entity", SENSOR_NUM),
        ent("grid_kwh_today_entity", SENSOR_NUM),
        ent("pv_today_entity", SENSOR_NUM),
        ent("pv_forecast_today_entity", SENSOR_NUM),
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_prices,
      flatten: true,
      schema: [
        ent("price_entity", ["sensor"]),
        { name: "cheap_slots", selector: { number: { min: 0, max: 96, step: 1, mode: "box" } } },
        { name: "window_horizon_slots", selector: { number: { min: 1, max: 192, step: 1, mode: "box" } } },
        { name: "show_tomorrow", selector: { boolean: {} } },
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_display,
      flatten: true,
      schema: [
        ...(mini
          ? []
          : [
              {
                name: "sections",
                selector: {
                  select: {
                    multiple: true,
                    mode: "list",
                    options: SECTIONS.map((s) => ({ value: s, label: L[`s_${s}`] })),
                  },
                },
              },
            ]),
        {
          type: "grid",
          name: "",
          schema: [
            { name: "animations", selector: { boolean: {} } },
            { name: "popup", selector: { boolean: {} } },
            { name: "show_history", selector: { boolean: {} } },
            { name: "history_collapsed", selector: { boolean: {} } },
          ],
        },
        {
          name: "language",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "", label: L.lang_auto },
                { value: "de", label: "Deutsch" },
                { value: "en", label: "English" },
              ],
            },
          },
        },
      ],
    },
    {
      type: "expandable",
      name: "",
      title: L.g_advanced,
      flatten: true,
      schema: [
        {
          type: "grid",
          name: "",
          schema: ["mode_auto", "mode_force", "mode_block"].map((name) => ({ name, selector: { text: {} } })),
        },
        { name: "tibber_home", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: ["price_today_attribute", "price_tomorrow_attribute", "price_time_key", "price_value_key"].map(
            (name) => ({
              name,
              selector: { text: {} },
            }),
          ),
        },
        { name: "window_attribute", selector: { text: {} } },
      ],
    },
  ];
};

const MODE_KEYS = { mode_auto: "auto", mode_force: "force", mode_block: "block" };

// Defaults shown in the form (and dropped again from the YAML when left as they are).
const formDefaults = (mini) => {
  const d = { ...DEFAULTS, popup: mini };
  delete d.mode_options;
  for (const [k, v] of Object.entries(MODE_KEYS)) d[k] = DEFAULTS.mode_options[v];
  return d;
};

// Card config → form data: defaults filled in, mode_options flattened.
export const toFormData = (config, mini = false) => {
  const data = { ...formDefaults(mini), ...config };
  delete data.mode_options;
  for (const [k, v] of Object.entries(MODE_KEYS))
    if (config.mode_options?.[v] != null) data[k] = config.mode_options[v];
  if (!data.language) data.language = "";
  return data;
};

// Form data → minimal card config: empty values and defaults dropped, mode_options rebuilt.
export const fromFormData = (data, mini = false) => {
  const defaults = formDefaults(mini);
  const config = {};
  const modes = {};
  for (const [k, v] of Object.entries(data)) {
    const empty = v === "" || v === undefined || v === null || (Array.isArray(v) && !v.length);
    if (k in MODE_KEYS) {
      if (!empty && v !== defaults[k]) modes[MODE_KEYS[k]] = v;
      continue;
    }
    if (empty) continue;
    if (k === "sections" && Array.isArray(v) && v.length === SECTIONS.length && v.every((s, i) => s === SECTIONS[i]))
      continue;
    if (k in defaults && JSON.stringify(v) === JSON.stringify(defaults[k])) continue;
    config[k] = v;
  }
  if (Object.keys(modes).length) config.mode_options = modes;
  return config;
};

class EditorBase extends HTMLElement {
  static get mini() {
    return false;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    const mini = this.constructor.mini;
    const lang = langOf(this._config, this._hass);
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => (LABELS[langOf(this._config, this._hass)] || LABELS.en)[s.name] ?? s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const { type } = this._config;
        const config = { type, ...fromFormData({ ...ev.detail.value, type: undefined }, mini) };
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const data = toFormData(this._config, mini);
    const key = JSON.stringify(data);
    if (key !== this._dataKey) {
      this._dataKey = key;
      this._form.data = data;
    }
    if (lang !== this._lang) {
      this._lang = lang;
      this._form.schema = editorSchema(lang, { mini });
    }
  }
}

export class TibberBatteryCardEditor extends EditorBase {}
export class TibberBatteryMiniCardEditor extends EditorBase {
  static get mini() {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Auto-detection for new cards
// ---------------------------------------------------------------------------

// Sibling entities of a battery, by the ids the Anker SOLIX integration uses (German and English names)
// and common generic suffixes.
const SIBLINGS = {
  battery_power_entity: ["akkuleistung", "battery_power"],
  pv_power_entity: ["solarleistung", "solar_power", "pv_power"],
  grid_charge_power_entity: ["netzaufladung", "grid_to_battery_power", "ac_charge_power"],
  house_power_entity: ["hausbedarf", "home_demand", "home_load_power"],
};

export const detectConfig = (hass) => {
  const states = hass?.states || {};
  const ids = Object.keys(states);
  const config = {};
  const soc =
    ids.find((id) => id.startsWith("sensor.") && /(ladestand|state_of_charge|_soc)$/.test(id)) ||
    ids.find((id) => id.startsWith("sensor.") && states[id].attributes?.device_class === "battery");
  if (!soc) return config;
  config.soc_entity = soc;
  const prefix = soc.replace(/_(ladestand|state_of_charge|soc|battery)$/, "_");
  for (const [key, names] of Object.entries(SIBLINGS)) {
    const id = names.map((n) => `sensor.${prefix.slice("sensor.".length)}${n}`).find((x) => states[x]);
    if (id) config[key] = id;
  }
  const mode = ids.find((id) => {
    if (!id.startsWith("input_select.")) return false;
    const opts = (states[id].attributes?.options || []).map((o) => String(o).toLowerCase());
    return opts.length === 3 && opts.includes("auto");
  });
  if (mode) {
    config.mode_entity = mode;
    const opts = states[mode].attributes.options.map(String);
    const force = opts.find((o) => /erzwing|force|forc/i.test(o));
    const block = opts.find((o) => /sperr|block|lock|off/i.test(o));
    const auto = opts.find((o) => o.toLowerCase() === "auto");
    const m = {};
    if (auto && auto !== DEFAULTS.mode_options.auto) m.auto = auto;
    if (force && force !== DEFAULTS.mode_options.force) m.force = force;
    if (block && block !== DEFAULTS.mode_options.block) m.block = block;
    if (Object.keys(m).length) config.mode_options = m;
  }
  // SoC targets: the Force one by name, the regular one is any other.
  const socTargets = ids.filter(
    (id) => id.startsWith("input_number.") && /soc/.test(id) && states[id].attributes?.unit_of_measurement === "%",
  );
  const isForce = (id) => /erzwing|force/.test(id);
  const target = socTargets.find((id) => !isForce(id));
  if (target) config.target_soc_entity = target;
  const forceTarget = socTargets.find(isForce);
  if (forceTarget) config.force_target_soc_entity = forceTarget;
  const until = ids.find(
    (id) => id.startsWith("input_datetime.") && states[id].attributes?.has_date && /override|ablauf|until/.test(id),
  );
  if (until) config.override_until_entity = until;
  const reason = ids.find((id) => id.startsWith("input_text.") && /grund|reason/.test(id));
  if (reason) config.reason_entity = reason;
  const price = ids.find((id) => {
    const a = states[id].attributes || {};
    return id.startsWith("sensor.") && Array.isArray(a.today) && a.today[0]?.start_time !== undefined;
  });
  if (price) config.price_entity = price;
  return config;
};
