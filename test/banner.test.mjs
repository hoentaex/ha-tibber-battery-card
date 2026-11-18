import assert from "node:assert/strict";
import { test } from "node:test";
import { gridScene, isNight, readout, sceneState } from "../src/banner.js";
import { translator } from "../src/shared.js";

test("night picture follows the dark theme unless forced", () => {
  assert.equal(isNight({ themes: { darkMode: true } }, {}), true);
  assert.equal(isNight({ themes: { darkMode: false } }, {}), false);
  assert.equal(isNight({ themes: { darkMode: true } }, { illustration_theme: "day" }), false);
  assert.equal(isNight({}, { illustration_theme: "night" }), true);
});

test("card status maps to the scene: grid, PV, discharge, blocked, idle", () => {
  assert.equal(sceneState("grid"), "grid");
  assert.equal(sceneState("grid_forced"), "grid");
  assert.equal(sceneState("pv"), "pv");
  assert.equal(sceneState("discharging"), "discharge");
  assert.equal(sceneState("blocked"), "blocked");
  assert.equal(sceneState("forced_done"), "idle");
  assert.equal(sceneState("idle"), "idle");
});

const view = (status, extra = {}) => ({
  status,
  t: translator("de"),
  lang: "de",
  live: { soc: 76 },
  flows: { gridToBatt: 620, pvToBatt: 380, battToHouse: 240 },
  prices: { current: { p: 32.7 }, inWindow: true },
  ...extra,
});

test("the readout shows the price and what happens", () => {
  assert.deepEqual(readout(view("grid")), { state: "grid", top: "32,7 ct", what: "Netz → Akku +620 W" });
  assert.equal(readout(view("discharging")).what, "Akku → Haus 240 W");
  assert.equal(readout(view("blocked")).what, "Netzladen gesperrt");
  assert.equal(
    readout(view("idle", { prices: { current: { p: 38.4 }, inWindow: false } })).what,
    "wartet auf Ladefenster",
  );
  // No price: the state of charge instead.
  assert.equal(readout(view("idle", { prices: {} })).top, "76 %");
});

test("the scene: flows by state, five LED segments for the state of charge, no ids", () => {
  const grid = gridScene("grid", 76, "32,7 ct", "Netz → Akku");
  assert.equal((grid.match(/tb-flow grid/g) || []).length, 2);
  assert.equal((grid.match(/class="tb-seg on/g) || []).length, 4);
  assert.match(grid, /tb-seg on pulse/);
  const out = gridScene("discharge", 76, "", "");
  assert.match(out, /tb-flow out/);
  assert.doesNotMatch(out, /tb-flow grid|tb-seg[^"]* pulse/);
  assert.doesNotMatch(gridScene("idle", null, "", ""), /tb-flow|tb-seg on/);
  assert.doesNotMatch(grid, /\sid="/);
  // The readout comes last: drawn over the house wall.
  assert.ok(grid.lastIndexOf("tb-rd2") > grid.lastIndexOf("tb-house"));
  assert.match(gridScene("idle", 50, "<b>", ""), /&lt;b&gt;/);
});
