process.env.TZ = "Europe/Berlin";

import assert from "node:assert/strict";
import { test } from "node:test";
import { activityEntities, activityHours, activityRequest, actorOf, buildActivity, fmtWhen } from "../src/activity.js";
import { activity } from "../src/sections.js";
import { translator } from "../src/shared.js";

const NOW = new Date(2026, 10, 15, 14, 30).getTime();
const at = (h, m = 0, s = 0, d = 15) => new Date(2026, 10, d, h, m, s).getTime() / 1000;
const de = translator("de");
const en = translator("en");

const CONFIG = {
  mode_entity: "input_select.mode",
  grid_charge_switch: "input_boolean.grid",
  target_soc_entity: "input_number.target",
  force_target_soc_entity: "input_number.force",
  reason_entity: "input_text.reason",
  mode_options: { auto: "auto", force: "erzwingen", block: "sperren" },
};
const HASS = {
  user: { id: "u-me", name: "Ich" },
  states: {
    "person.alex": {
      entity_id: "person.alex",
      state: "home",
      attributes: { user_id: "u-alex", friendly_name: "Alex" },
    },
    "automation.controller": {
      entity_id: "automation.controller",
      state: "on",
      attributes: { friendly_name: "Tibber Netzlade-Controller" },
    },
  },
};
const build = (entries, extra = {}) =>
  buildActivity(entries, { config: CONFIG, hass: HASS, now: NOW, t: de, lang: "de", ...extra });

// The real morning of 15.11.2026 as the logbook delivers it.
const ENTRIES = [
  { entity_id: "input_select.mode", state: "sperren", when: at(10, 47, 8), context_user_id: "u-alex" },
  { entity_id: "input_text.reason", state: "Modus Sperren", when: at(10, 47, 8.1) },
  {
    entity_id: "input_select.mode",
    state: "auto",
    when: at(12, 8, 57),
    context_event_type: "automation_triggered",
    context_entity_id: "automation.controller",
    context_name: "Tibber Netzlade-Controller",
  },
  { entity_id: "input_text.reason", state: "6-h-Block aktiv", when: at(12, 8, 57.9) },
  { entity_id: "input_number.target", state: "75.0", when: at(12, 46, 20), context_user_id: "u-me" },
  { entity_id: "input_number.target", state: "80.0", when: at(12, 46, 46), context_user_id: "u-me" },
  { entity_id: "input_text.reason", state: "Günstiges Ladefenster, Defizit 1.12 kWh", when: at(12, 50, 7.5) },
  { entity_id: "input_boolean.grid", state: "on", when: at(12, 50, 7.9), context_entity_id: "automation.controller" },
  { entity_id: "input_text.reason", state: "Tagladen läuft", when: at(12, 50, 8.1) },
  { entity_id: "input_text.reason", state: "Preis über Grenze", when: at(13, 45, 0.3) },
  { entity_id: "input_boolean.grid", state: "off", when: at(13, 45, 0.8), context_entity_id: "automation.controller" },
  { entity_id: "input_select.mode", state: "unavailable", when: at(13, 50) },
];

test("rows: mode, switch and targets, newest first, reasons attached, drags merged", () => {
  const rows = build(ENTRIES);
  assert.deepEqual(
    rows.map((r) => [r.title, r.who, r.reason]),
    [
      ["Netzladen beendet", "Tibber Netzlade-Controller", "Preis über Grenze"],
      ["Netzladen gestartet", "Tibber Netzlade-Controller", "Tagladen läuft"],
      ["Ziel-SoC auf 80 %", "Ich", undefined],
      ["Zurück auf Auto", "Tibber Netzlade-Controller", "6-h-Block aktiv"],
      ["Sperre aktiviert", "Alex", "Modus Sperren"],
    ],
  );
  assert.equal(rows[0].entity, "input_boolean.grid");
  assert.equal(rows[4].color, "var(--tb-block)");
  assert.equal(rows[1].color, "var(--tb-grid)");
});

test("rows: window, repeats, unknown options and the reason without changes", () => {
  // Only the last 2 hours.
  assert.deepEqual(
    build(ENTRIES, { hours: 2 }).map((r) => r.kind),
    ["grid_off", "grid_on", "target"],
  );
  // A restart repeating the same state is no new activity.
  const repeat = [
    { entity_id: "input_boolean.grid", state: "on", when: at(11) },
    { entity_id: "input_boolean.grid", state: "on", when: at(11, 5) },
    { entity_id: "input_select.mode", state: "irgendwas", when: at(11, 6) },
  ];
  const rows = build(repeat, { currentReason: "PV liefert Strom" });
  assert.equal(rows.length, 1);
  // No reason change in the window: the current text held all along.
  assert.equal(rows[0].reason, "PV liefert Strom");
  assert.equal(rows[0].who, undefined);
  assert.deepEqual(build([]), []);
  assert.deepEqual(build(undefined), []);
});

test("actor: person, own user, unknown user, automation, none", () => {
  assert.equal(actorOf({ context_user_id: "u-alex" }, HASS, de), "Alex");
  assert.equal(actorOf({ context_user_id: "u-me" }, HASS, de), "Ich");
  assert.equal(actorOf({ context_user_id: "u-x" }, HASS, de), "Nutzer");
  assert.equal(actorOf({ context_entity_id: "automation.controller" }, HASS, de), "Tibber Netzlade-Controller");
  assert.equal(actorOf({ context_entity_id: "script.gone", context_name: "Altes Skript" }, HASS, de), "Altes Skript");
  assert.equal(actorOf({ context_event_type: "automation_triggered", context_name: "X" }, HASS, de), "X");
  assert.equal(actorOf({}, HASS, de), undefined);
});

test("entities, hours and the stream request", () => {
  assert.deepEqual(Object.keys(activityEntities(CONFIG)), ["mode", "switch", "target", "force", "reason"]);
  assert.deepEqual(activityEntities({ soc_entity: "sensor.soc" }), {});
  assert.equal(activityHours({}), 8);
  assert.equal(activityHours({ activity_hours: 12 }), 12);
  assert.equal(activityHours({ activity_hours: "x" }), 8);
  assert.equal(activityHours({ activity_hours: 500 }), 72);
  const req = activityRequest(["input_select.mode"], NOW, 8);
  assert.equal(req.type, "logbook/event_stream");
  assert.equal(Date.parse(req.start_time), NOW - 8 * 3600000);
  assert.deepEqual(req.entity_ids, ["input_select.mode"]);
});

test("time of a row: today, yesterday, older", () => {
  assert.equal(fmtWhen(at(13, 45) * 1000, NOW, "de"), "13:45");
  assert.equal(fmtWhen(at(23, 10, 0, 14) * 1000, NOW, "de"), "gestern 23:10");
  assert.equal(fmtWhen(at(9, 0, 0, 12) * 1000, NOW, "de"), "12.11. 09:00");
  assert.equal(fmtWhen(at(23, 10, 0, 14) * 1000, NOW, "en", { language: "en-GB" }), "yesterday 23:10");
});

test("section: folded, loading, empty and the timeline", () => {
  const v = (a) => ({ t: de, lang: "de", now: NOW, hass: HASS, activity: a });
  assert.equal(activity({ t: de }), "");
  const closed = activity(v({ open: false, hours: 8 }));
  assert.match(closed, /data-fold="activity" aria-expanded="false"/);
  assert.match(closed, /Letzte Aktivitäten/);
  assert.doesNotMatch(closed, /<ol/);
  assert.match(activity(v({ open: true, hours: 8, loading: true, rows: [] })), /Aktivitäten werden geladen/);
  assert.match(activity(v({ open: true, hours: 8, rows: [] })), /Keine Aktivitäten in den letzten 8 Stunden/);
  const html = activity(v({ open: true, hours: 8, rows: build(ENTRIES) }));
  assert.equal((html.match(/<li /g) || []).length, 5);
  assert.match(html, /Sperre aktiviert<\/span><time[^>]*>10:47<\/time>/);
  assert.match(html, /durch Alex · Modus Sperren/);
  assert.match(html, /data-more="input_boolean.grid"/);
  // A row without who and reason has no meta line.
  const bare = activity(v({ open: true, hours: 8, rows: [{ t: NOW, entity: "x.y", title: "T", color: "red" }] }));
  assert.doesNotMatch(bare, /act-meta/);
  assert.match(
    activity({ ...v({ open: true, hours: 8, rows: [] }), t: en, lang: "en" }),
    /No activity in the last 8 hours/,
  );
});
