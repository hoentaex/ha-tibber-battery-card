import assert from "node:assert/strict";
import { test } from "node:test";

// The editor module defines custom element classes: a bare HTMLElement is enough to load it.
globalThis.HTMLElement ??= class {};
const { detectConfig, editorSchema, fromFormData, toFormData } = await import("../src/editor.js");

const names = (schema) => schema.flatMap((s) => (s.schema ? names(s.schema) : s.name ? [s.name] : []));

test("the editor covers every option, with entity selectors", () => {
  const n = names(editorSchema("de"));
  for (const k of [
    "soc_entity",
    "mode_entity",
    "target_soc_entity",
    "price_entity",
    "sections",
    "popup",
    "mode_force",
    "tibber_home",
  ])
    assert.ok(n.includes(k), k);
  assert.ok(!names(editorSchema("en", { mini: true })).includes("sections"));
});

test("form data round trip keeps the YAML minimal", () => {
  const config = { soc_entity: "sensor.soc", mode_options: { block: "Sperren" }, window_horizon_slots: 32 };
  const data = toFormData(config);
  assert.equal(data.mode_block, "Sperren");
  assert.equal(data.mode_auto, "auto");
  assert.equal(data.window_horizon_slots, 32);
  assert.equal(data.window_attribute, "ladefenster");
  assert.equal(data.cheap_slots, 24);
  assert.deepEqual(fromFormData(data), config);
  assert.deepEqual(fromFormData(toFormData({ soc_entity: "s" }, true), true), { soc_entity: "s" });
  assert.deepEqual(fromFormData({ ...toFormData({}), name: "", popup: true }), { popup: true });
});

test("new cards find the battery, its sibling sensors and the helpers", () => {
  const st = (state, attributes = {}) => ({ state, attributes });
  const hass = {
    states: {
      "sensor.solarbank_ladestand": st("50", { unit_of_measurement: "%" }),
      "sensor.solarbank_akkuleistung": st("0"),
      "sensor.solarbank_solarleistung": st("0"),
      "sensor.solarbank_hausbedarf": st("0"),
      "input_select.netzlade_modus": st("auto", { options: ["auto", "erzwingen", "Sperren"] }),
      "input_number.target_evening_soc": st("70", { unit_of_measurement: "%" }),
      "sensor.preise": st("0.3", { today: [{ start_time: "x", price: 0.3 }] }),
    },
  };
  const c = detectConfig(hass);
  assert.equal(c.soc_entity, "sensor.solarbank_ladestand");
  assert.equal(c.battery_power_entity, "sensor.solarbank_akkuleistung");
  assert.equal(c.pv_power_entity, "sensor.solarbank_solarleistung");
  assert.equal(c.house_power_entity, "sensor.solarbank_hausbedarf");
  assert.equal(c.grid_charge_power_entity, undefined);
  assert.equal(c.mode_entity, "input_select.netzlade_modus");
  assert.deepEqual(c.mode_options, { block: "Sperren" });
  assert.equal(c.target_soc_entity, "input_number.target_evening_soc");
  assert.equal(c.price_entity, "sensor.preise");
  assert.deepEqual(detectConfig({ states: {} }), {});
});
