process.env.TZ = "Europe/Berlin";

import assert from "node:assert/strict";
import { test } from "node:test";
import { battery, controls, header, mini, reasons } from "../src/sections.js";
import {
  deriveFlows,
  deriveStatus,
  fmtUntil,
  modeHint,
  readLive,
  statusText,
  textOf,
  timeOf,
  translator,
} from "../src/shared.js";

const NOW = new Date(2026, 10, 15, 11, 20).getTime();
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m).getTime();
const de = translator("de");
const en = translator("en");
const st = (state, attributes = {}) => ({ state, attributes });

test("{zeit}: today, tomorrow, later, past and invalid", () => {
  assert.equal(fmtUntil(at(15, 13), NOW, "de"), "13:00");
  assert.equal(fmtUntil(at(16, 6, 30), NOW, "de"), "morgen 06:30");
  assert.equal(fmtUntil(at(17, 13), NOW, "de"), "17.11. 13:00");
  assert.equal(fmtUntil(at(15, 11), NOW, "de"), undefined);
  assert.equal(fmtUntil(NOW, NOW, "de"), undefined);
  assert.equal(fmtUntil(Number.NaN, NOW, "de"), undefined);
  assert.equal(fmtUntil(undefined, NOW, "de"), undefined);
  assert.equal(fmtUntil(at(16, 13), NOW, "en", { language: "en-GB" }), "tomorrow 13:00");
  assert.equal(fmtUntil(at(15, 13), NOW, "en", { language: "en", time_format: "12" }), "1:00 PM");
  assert.equal(fmtUntil(at(15, 13), NOW, "de", { language: "de", time_format: "24" }), "13:00");
});

test("override end: input_datetime with and without timestamp, timestamp sensor", () => {
  const hass = {
    states: {
      "input_datetime.a": st("2026-11-15 13:00:00", { has_date: true, has_time: true, timestamp: 1794744000 }),
      "input_datetime.b": st("2026-11-15 13:00:00", { has_date: true, has_time: true }),
      "input_datetime.c": st("13:00:00", { has_date: false, has_time: true, timestamp: 46800 }),
      "input_datetime.d": st("kaputt", { has_date: true }),
      "sensor.ende": st("2026-11-15T12:00:00+00:00", { device_class: "timestamp" }),
      "sensor.weg": st("unavailable"),
    },
  };
  assert.equal(timeOf(hass, "input_datetime.a"), at(15, 13));
  assert.equal(timeOf(hass, "input_datetime.b"), at(15, 13));
  assert.equal(timeOf(hass, "input_datetime.c"), undefined);
  assert.equal(timeOf(hass, "input_datetime.d"), undefined);
  assert.equal(timeOf(hass, "sensor.ende"), at(15, 13));
  assert.equal(timeOf(hass, "sensor.weg"), undefined);
  assert.equal(timeOf(hass, undefined), undefined);
});

test("hint per mode, with and without end time and Force target", () => {
  const hint = (live) => modeHint(live, NOW, de, "de");
  assert.equal(
    hint({ mode: "auto", until: at(15, 13) }),
    "Controller entscheidet nach Preis, Ladefenster, Defizit und PV.",
  );
  assert.equal(
    hint({ mode: "force", forceTarget: 100, until: at(15, 13) }),
    "Lädt aus dem Netz bis 100 % · zurück auf Auto um 13:00.",
  );
  assert.equal(hint({ mode: "force", forceTarget: 100 }), "Lädt aus dem Netz bis 100 %.");
  assert.equal(hint({ mode: "force", until: at(15, 13) }), "Lädt aus dem Netz (erzwungen) · zurück auf Auto um 13:00.");
  assert.equal(hint({ mode: "force" }), "Lädt aus dem Netz (erzwungen).");
  assert.equal(hint({ mode: "block", until: at(15, 13) }), "Kein Laden aus dem Netz · zurück auf Auto um 13:00.");
  assert.equal(hint({ mode: "block", until: at(16, 1) }), "Kein Laden aus dem Netz · zurück auf Auto um morgen 01:00.");
  // Past end, HA has not switched back yet: no time.
  assert.equal(hint({ mode: "block", until: at(15, 11) }), "Kein Laden aus dem Netz.");
  assert.equal(hint({}), undefined);
  assert.equal(
    modeHint({ mode: "block", until: at(15, 13) }, NOW, en, "en", { language: "en-GB" }),
    "No charging from the grid · back to Auto at 13:00.",
  );
});

test("pill text for every mode × switch × end time", () => {
  const until = { valid: at(15, 13), past: at(15, 9), none: undefined };
  const rows = [];
  for (const mode of ["auto", "force", "block"])
    for (const gridSwitch of [true, false, undefined])
      for (const [k, u] of Object.entries(until)) {
        const s = deriveStatus({ mode, gridSwitch, grid: 0, batt: 0 });
        rows.push([mode, gridSwitch, k, statusText(s, u, NOW, de, "de").full]);
      }
  const text = (mode, sw, k) => rows.find((r) => r[0] === mode && r[1] === sw && r[2] === k)[3];
  for (const k of ["valid", "past", "none"]) {
    assert.equal(text("auto", true, k), "Netz lädt");
    assert.equal(text("auto", false, k), "Bereit");
    assert.equal(text("force", false, k), "Erzwungen · Ziel erreicht");
  }
  for (const sw of [true, false, undefined]) {
    assert.equal(text("block", sw, "valid"), "Gesperrt bis 13:00");
    assert.equal(text("block", sw, "past"), "Gesperrt");
    assert.equal(text("block", sw, "none"), "Gesperrt");
  }
  for (const sw of [true, undefined]) {
    assert.equal(text("force", sw, "valid"), "Netz lädt (erzwungen) bis 13:00");
    assert.equal(text("force", sw, "past"), "Netz lädt (erzwungen)");
    assert.equal(text("force", sw, "none"), "Netz lädt (erzwungen)");
  }
  // Short forms for narrow cards, the full text stays as tooltip.
  const b = statusText("blocked", until.valid, NOW, de, "de");
  assert.deepEqual(b, { full: "Gesperrt bis 13:00", short: "Gesperrt", title: "Gesperrt bis 13:00" });
  assert.equal(statusText("grid_forced", until.valid, NOW, de, "de").short, "Erzwungen");
  assert.equal(statusText("forced_done", undefined, NOW, de, "de").short, "Erzwungen");
  assert.equal(statusText("grid_forced", until.valid, NOW, en, "en").full, "Grid charging (forced) until 1:00 PM");
});

// A view model as the card builds it, for the section renderers.
const CONFIG = {
  soc_entity: "sensor.soc",
  mode_entity: "input_select.mode",
  mode_options: { auto: "auto", force: "erzwingen", block: "sperren" },
  target_soc_entity: "input_number.target",
  force_target_soc_entity: "input_number.force",
  override_until_entity: "input_datetime.until",
  reason_entity: "input_text.reason",
  grid_charge_switch: "switch.grid",
  deficit_entity: "sensor.deficit",
};
const view = (states, config = CONFIG) => {
  const hass = {
    states: {
      "sensor.soc": st("45"),
      "input_number.target": st("70", { min: 0, max: 100, step: 1 }),
      "input_number.force": st("100", { min: 20, max: 100, step: 5 }),
      "input_datetime.until": st("2026-11-15 13:00:00", { has_date: true, has_time: true, timestamp: 1794744000 }),
      "input_text.reason": st("Modus Sperren"),
      "switch.grid": st("off"),
      "sensor.deficit": st("0.9"),
      ...states,
    },
    locale: { language: "de" },
  };
  const live = readLive(hass, config);
  const ok = (id) => !!id && !!hass.states[id] && !["unavailable", "unknown", ""].includes(hass.states[id].state);
  return {
    hass,
    config,
    lang: "de",
    t: de,
    live,
    status: deriveStatus(live),
    now: NOW,
    flows: deriveFlows(live),
    name: "Akku",
    prices: { slots: [] },
    has: ok,
    num: (id) => (ok(id) ? Number.parseFloat(hass.states[id].state) : undefined),
    bool: (id) => (ok(id) ? hass.states[id].state === "on" : undefined),
  };
};

test("slider and ring follow the Force target only while forcing", () => {
  const force = view({ "input_select.mode": st("erzwingen") });
  assert.equal(force.live.activeTarget, 100);
  assert.equal(force.live.activeTargetEntity, "input_number.force");
  const c = controls(force);
  assert.match(c, /data-entity="input_number.force"/);
  assert.match(c, /min="20" max="100" step="5" value="100"/);
  assert.match(c, />Erzwingen bis</);
  // Ring caption (text without tags) and the ring's marker label.
  const text = (html) => html.replace(/<[^>]+>/g, "");
  assert.match(text(battery(force)), /Erzwingen bis 100 %/);
  assert.match(battery(force), /Ladestand 45 %, Ziel 100 %/);

  for (const mode of ["auto", "sperren"]) {
    const v = view({ "input_select.mode": st(mode) });
    assert.equal(v.live.activeTarget, 70);
    assert.match(controls(v), /data-entity="input_number.target"/);
    assert.match(controls(v), />Ziel-SoC bis Abend</);
    assert.match(text(battery(v)), /Ziel 70 %/);
  }
  // Force without its own target helper: the regular target stays.
  const { force_target_soc_entity: _f, ...noForce } = CONFIG;
  const v = view({ "input_select.mode": st("erzwingen") }, noForce);
  assert.equal(v.live.activeTargetEntity, "input_number.target");
  assert.match(controls(v), /Lädt aus dem Netz \(erzwungen\) · zurück auf Auto um 13:00\./);
});

test("controls show the hint with the end time, no fixed reset texts", () => {
  const c = controls(view({ "input_select.mode": st("sperren") }));
  assert.match(c, /Kein Laden aus dem Netz · zurück auf Auto um 13:00\./);
  assert.doesNotMatch(c, /Reset um/);
});

test("reason badge: red while blocked, grid colour while charging, none without a reason", () => {
  const r = reasons(view({ "input_select.mode": st("sperren") }));
  assert.doesNotMatch(r, /class="decision/);
  assert.match(r, /class="reason clickable blocker" style="--c:var\(--tb-stop\)"/);
  assert.match(r, /Blockiert<\/span><b>Modus Sperren<\/b>/);
  assert.ok(r.indexOf("blocker") < r.indexOf("Defizit"));
  assert.match(r, /Warum lädt er nicht aus dem Netz\?/);
  const on = reasons(view({ "switch.grid": st("on"), "input_text.reason": st("Tagladen läuft") }));
  assert.match(on, /Warum lädt er aus dem Netz\?/);
  assert.match(on, /Lädt<\/span><b>Tagladen läuft<\/b>/);
  assert.doesNotMatch(on, /blocker|--tb-stop/);
  for (const s of ["unavailable", "unknown", "", "   "])
    assert.doesNotMatch(reasons(view({ "input_text.reason": st(s) })), /blocker/, s);
  const { reason_entity: _r, ...noReason } = CONFIG;
  assert.doesNotMatch(reasons(view({}, noReason)), /blocker/);
  // Without a reason helper, Block mode still shows as the red badge.
  assert.match(
    reasons(view({ "input_select.mode": st("sperren") }, noReason)),
    /blocker[^>]*><span class="dot"><\/span><span class="k">Modus/,
  );
  assert.equal(textOf({ states: { "input_text.x": st("  PV liefert Strom ") } }, "input_text.x"), "PV liefert Strom");
});

test("header and mini pill: full text, short form and tooltip", () => {
  const v = view({ "input_select.mode": st("sperren") });
  const h = header(v);
  assert.match(h, /title="Gesperrt bis 13:00"/);
  assert.match(h, /<span class="st-full">Gesperrt bis 13:00<\/span><span class="st-short">Gesperrt<\/span>/);
  const m = mini(view({ "input_select.mode": st("erzwingen"), "switch.grid": st("on") }));
  assert.match(m, /Netz lädt \(erzwungen\) bis 13:00/);
  assert.match(m, /st-short">Erzwungen</);
  assert.match(m, /Erzwingen bis 100 %/);
});
