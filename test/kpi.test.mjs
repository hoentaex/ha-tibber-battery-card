import assert from "node:assert/strict";
import { test } from "node:test";
import { fillRows, kpiGrid } from "../src/kpi.js";

test("rows are always full: the last tile of a short row widens", () => {
  // Tank: level (wide) + four tiles in three columns.
  assert.deepEqual(fillRows([2, 1, 1, 1, 1], 3), [2, 1, 1, 1, 1]);
  // Without the price: the last delivery takes the free column.
  assert.deepEqual(fillRows([2, 1, 1, 1], 3), [2, 1, 1, 2]);
  // Without price and range.
  assert.deepEqual(fillRows([2, 1, 1], 3), [2, 1, 3]);
  // Two columns: level alone, then pairs; an odd one out spans both.
  assert.deepEqual(fillRows([2, 1, 1, 1], 2), [2, 1, 1, 2]);
  assert.deepEqual(fillRows([1, 1, 1], 2), [1, 1, 2]);
  assert.deepEqual(fillRows([1], 3), [3]);
  assert.deepEqual(fillRows([], 3), []);
});

test("a wide tile that does not fit the rest of a row: the tile before it closes the row", () => {
  // 1 + 1 + wide in three columns: the wide tile moves on, the second tile widens to fill row one.
  assert.deepEqual(fillRows([1, 1, 2, 1], 3), [1, 2, 2, 1]);
});

test("tiles without a value are left out, spans for two and three columns", () => {
  const html = kpiGrid([
    { k: "A", v: "1", icon: "M0,0", c: "red", wide: true },
    { k: "B", v: null, icon: "M0,0", c: "red" },
    { k: "C", v: "3", icon: "M0,0", c: "red" },
    { k: "D", v: "", icon: "M0,0", c: "red" },
  ]);
  assert.equal((html.match(/class="kpi[ "]/g) || []).length, 2);
  assert.doesNotMatch(html, /"kk">B</);
  // A (wide) + C: in three columns C takes the last one; in two columns C fills its own row.
  assert.match(html, /--s2:2;--s3:2[^>]*>\s*<span class="ki">[\s\S]*?>A</);
  assert.match(html, /--s2:2;--s3:1/);
  assert.equal(kpiGrid([{ k: "X", v: null }]), "");
});

test("a tile with an entity is a button for Home Assistant's dialog; values are escaped", () => {
  const html = kpiGrid([{ k: "Preis", v: "<b>", icon: "M0,0", c: "blue", more: "sensor.heizol_tagespreis" }]);
  assert.match(html, /<button class="kpi" type="button" data-more="sensor.heizol_tagespreis"/);
  assert.match(html, /&lt;b&gt;/);
});
