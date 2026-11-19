process.env.TZ = "Europe/Berlin";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  atTime,
  computeWindow,
  deriveFlows,
  deriveStatus,
  fmtNum,
  fmtW,
  HISTORY_SPAN,
  historyRequest,
  localIso,
  modeOf,
  msToNextQuarter,
  normalizeSlots,
  parseHistory,
  PriceSource,
  parseTibberResponse,
  priceLevel,
  priceLimitOf,
  priceStats,
  QUARTER,
  quarterStart,
  readLive,
  sharedPriceSource,
  shouldFetch,
  slotAt,
  splitDays,
  startOfDay,
  windowBlocks,
} from "../src/shared.js";

// A day of quarter-hour slots from local midnight, prices in EUR/kWh as Tibber returns them.
const day = (iso, price = (i) => 0.3 + (i % 7) / 100) => {
  const d0 = new Date(`${iso}T00:00:00`).getTime();
  const d1 = startOfDay(d0, 1);
  const out = [];
  for (let t = d0, i = 0; t < d1; t += QUARTER, i++)
    out.push({ start_time: new Date(t).toISOString(), price: price(i) });
  return out;
};

test("a normal day has 96 quarter hours, DST days 92 and 100", () => {
  assert.equal(day("2026-11-14").length, 96);
  assert.equal(day("2026-03-29").length, 92);
  assert.equal(day("2026-10-25").length, 100);
});

test("slots are normalised to ct/kWh and sorted", () => {
  const s = normalizeSlots([
    { start_time: "2026-11-14T00:15:00+01:00", price: 0.3271 },
    { start_time: "2026-11-14T00:00:00+01:00", price: "0.3932" },
    { start_time: "garbage", price: 1 },
    null,
  ]);
  assert.equal(s.length, 2);
  assert.ok(s[0].t < s[1].t);
  assert.ok(Math.abs(s[0].p - 39.32) < 1e-9);
});

test("prices already in ct/kWh stay as they are, other keys are configurable", () => {
  const s = normalizeSlots([{ start: "2026-11-14T00:00:00+01:00", value: 32.5 }], "start", "value");
  assert.equal(s[0].p, 32.5);
});

test("today / tomorrow split on the local clock", () => {
  const now = new Date("2026-11-14T11:20:00").getTime();
  const slots = normalizeSlots([...day("2026-11-13"), ...day("2026-11-14"), ...day("2026-11-15")]);
  const { today, tomorrow } = splitDays(slots, now);
  assert.equal(today.length, 96);
  assert.equal(tomorrow.length, 96);
  assert.equal(today[0].t, startOfDay(now));
});

test("quarter arithmetic follows the wall clock", () => {
  const t = new Date("2026-11-14T11:22:31").getTime();
  assert.equal(quarterStart(t), new Date("2026-11-14T11:15:00").getTime());
  assert.equal(msToNextQuarter(t), new Date("2026-11-14T11:30:00").getTime() - t);
  assert.equal(atTime(startOfDay(t), "06:00"), new Date("2026-11-14T06:00:00").getTime());
  // On the spring-forward day 06:00 is still 06:00 local time.
  const spring = new Date("2026-03-29T00:00:00").getTime();
  assert.equal(new Date(atTime(spring, "06:00")).getHours(), 6);
});

test("local ISO strings carry the offset", () => {
  assert.equal(localIso(new Date("2026-11-14T00:00:00").getTime()), "2026-11-14T00:00:00+01:00");
  assert.equal(localIso(new Date("2026-07-01T00:00:00").getTime()), "2026-07-01T00:00:00+02:00");
});

test("current slot, stats and level", () => {
  const slots = normalizeSlots(day("2026-11-14", (i) => (i === 45 ? 0.2 : 0.4)));
  const now = new Date("2026-11-14T11:20:00").getTime();
  const s = slotAt(slots, now);
  assert.equal(s.t, new Date("2026-11-14T11:15:00").getTime());
  const st = priceStats(slots);
  assert.equal(Math.round(st.min), 20);
  assert.equal(priceLevel(s.p, st, false), "cheap");
  assert.equal(priceLevel(40, st, false), "expensive");
  assert.equal(priceLevel(40, st, true), "cheap");
  assert.equal(priceLevel(30, st, false), "mid");
});

test("charging window: rolling 24 of the next 48 slots, merged into blocks", () => {
  // Cheap from 12:00 to 13:00 and 15:00 to 15:30, cheaper still at night (outside the next 12 h at 10:05).
  const price = (i) => (i < 24 ? 0.1 : (i >= 48 && i < 52) || (i >= 60 && i < 62) ? 0.2 : 0.4);
  const slots = normalizeSlots(day("2026-11-14", price));
  const now = new Date("2026-11-14T10:05:00").getTime();
  const win = computeWindow(slots, now, { count: 6, horizon: 48 });
  assert.equal(win.size, 6);
  for (const t of win) assert.ok(t >= quarterStart(now) && t < quarterStart(now) + 48 * QUARTER);
  const blocks = windowBlocks(slots, win);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].to - blocks[0].from, 4 * QUARTER);
  assert.equal(new Date(blocks[1].from).getHours(), 15);
});

test("charging window runs past midnight once tomorrow's prices are there", () => {
  const slots = normalizeSlots([...day("2026-11-14", () => 0.4), ...day("2026-11-15", () => 0.2)]);
  const win = computeWindow(slots, new Date("2026-11-14T20:10:00").getTime());
  assert.equal(win.size, 24);
  for (const t of win) assert.equal(new Date(t).getDate(), 15);
  // The current slot counts: at 20:10 the horizon ends at 08:00 tomorrow.
  assert.ok(Math.max(...win) < new Date("2026-11-15T08:00:00").getTime());
});

test("charging window without tomorrow's prices: min(24, slots left)", () => {
  const slots = normalizeSlots(day("2026-11-14"));
  assert.equal(computeWindow(slots, new Date("2026-11-14T21:00:00").getTime()).size, 12);
  assert.equal(computeWindow(slots, new Date("2026-11-14T23:50:00").getTime()).size, 1);
  assert.equal(computeWindow(slots, new Date("2026-11-14T15:00:00").getTime()).size, 24);
});

test("charging window across the DST change keeps 48 real quarter hours", () => {
  const slots = normalizeSlots([...day("2026-10-25", (i) => (i % 5) / 100 + 0.3)]);
  assert.equal(slots.length, 100);
  const now = new Date("2026-10-25T01:00:00").getTime();
  const win = computeWindow(slots, now, { count: 48, horizon: 48 });
  assert.equal(win.size, 48);
  assert.equal(Math.max(...win) - Math.min(...win), 47 * QUARTER);
});

test("own window matches the sensor's ladefenster attribute (real data)", () => {
  const fx = JSON.parse(readFileSync(new URL("./fixtures/tibber-2026-11-14.json", import.meta.url), "utf8"));
  const slots = normalizeSlots([...fx.today, ...fx.tomorrow]);
  const win = computeWindow(slots, Date.parse(fx.now));
  const expected = fx.ladefenster.map((x) => Date.parse(x)).sort((a, b) => a - b);
  assert.deepEqual(
    [...win].sort((a, b) => a - b),
    expected,
  );
});

test("price entity: attributes, default ladefenster attribute and day figures in ct", () => {
  const fx = JSON.parse(readFileSync(new URL("./fixtures/tibber-2026-11-14.json", import.meta.url), "utf8"));
  const { _note, now, ...attributes } = fx;
  const hass = { states: { "sensor.p": { state: "0.3864", attributes } } };
  const p = new PriceSource().get(hass, { price_entity: "sensor.p" }, Date.parse(now));
  assert.equal(p.today.length, 96);
  assert.equal(p.tomorrow.length, 96);
  assert.equal(p.window.length, 24);
  assert.ok(Math.abs(p.stats.min - 32.53) < 1e-9);
  assert.ok(Math.abs(p.stats.avg - 38.81) < 1e-9);
  const noWin = new PriceSource().get(hass, { price_entity: "sensor.p", window_attribute: "missing" }, Date.parse(now));
  assert.equal(noWin.window, undefined);
});

test("charging window on a 92-slot day", () => {
  const slots = normalizeSlots(day("2026-03-29"));
  assert.equal(slots.length, 92);
  const win = computeWindow(slots, new Date("2026-03-29T06:00:00").getTime());
  assert.equal(win.size, 24);
});

test("price fetch: on a new day, while tomorrow is missing after 13:00, once per quarter", () => {
  const at = (s) => new Date(`2026-11-14T${s}`).getTime();
  assert.equal(shouldFetch(undefined, at("10:00:00")), true);
  const cache = { day: "2026-11-14", today: [1], tomorrow: [], fetchedAt: at("10:00:00") };
  assert.equal(shouldFetch(cache, at("10:20:00")), false, "tomorrow not expected before 13:00");
  assert.equal(shouldFetch(cache, at("13:05:00")), true);
  assert.equal(shouldFetch({ ...cache, fetchedAt: at("13:05:00") }, at("13:10:00")), false, "same quarter");
  assert.equal(shouldFetch({ ...cache, tomorrow: [1] }, at("18:00:00")), false);
  assert.equal(shouldFetch({ ...cache, tomorrow: [1] }, new Date("2026-11-15T00:00:10").getTime()), true, "new day");
  assert.equal(shouldFetch({ ...cache, day: "2026-11-13", failedAt: at("10:01:00") }, at("10:05:00")), false);
});

test("tibber.get_prices response: named home, else the first one", () => {
  const res = { response: { prices: { "Casa Berlin": [1], Other: [2] } } };
  assert.deepEqual(parseTibberResponse(res, "Other"), [2]);
  assert.deepEqual(parseTibberResponse(res, undefined), [1]);
  assert.deepEqual(parseTibberResponse({}, undefined), []);
});

test("PriceSource fetches once, caches, and reads entities without service calls", async () => {
  const now = new Date("2026-11-14T11:20:00").getTime();
  let calls = 0;
  const hass = {
    states: {},
    callWS: async (msg) => {
      calls++;
      assert.equal(msg.service, "get_prices");
      assert.equal(msg.return_response, true);
      return { response: { prices: { Home: [...day("2026-11-14"), ...day("2026-11-15")] } } };
    },
  };
  const src = new PriceSource();
  const first = src.get(hass, {}, now);
  assert.equal(first.loading, true);
  src.get(hass, {}, now);
  await src.pending;
  assert.equal(calls, 1);
  const p = src.get(hass, {}, now);
  assert.equal(p.today.length, 96);
  assert.equal(p.tomorrow.length, 96);
  assert.equal(calls, 1);

  const entHass = {
    states: {
      "sensor.p": {
        state: "0.3",
        attributes: { today: day("2026-11-14"), tomorrow: [], ladefenster: ["2026-11-14T12:00:00+01:00"] },
      },
    },
    callWS: () => assert.fail("no service call with a price entity"),
  };
  const e = new PriceSource().get(entHass, { price_entity: "sensor.p", window_attribute: "ladefenster" }, now);
  assert.equal(e.today.length, 96);
  assert.deepEqual(e.window, [new Date("2026-11-14T12:00:00").getTime()]);
});

test("status pill: mode first, then grid switch, then power signs", () => {
  assert.equal(deriveStatus({ mode: "block", gridSwitch: true, batt: 500 }), "blocked");
  assert.equal(deriveStatus({ mode: "force" }), "grid_forced");
  assert.equal(deriveStatus({ mode: "auto", gridSwitch: true, batt: 800 }), "grid");
  assert.equal(deriveStatus({ grid: 850, batt: 900 }), "grid");
  assert.equal(deriveStatus({ batt: -420 }), "discharging");
  assert.equal(deriveStatus({ batt: 380, pv: 520 }), "pv");
  assert.equal(deriveStatus({ batt: 0, pv: 520 }), "idle");
  assert.equal(deriveStatus({ pv: 520 }), "pv");
  assert.equal(deriveStatus({}), "idle");
});

test("flows from the battery power sign", () => {
  assert.deepEqual(deriveFlows({ batt: 380, pv: 520, grid: 0, house: 140 }), {
    pvToBatt: 380,
    battToHouse: 0,
    gridToBatt: 0,
    house: 140,
  });
  const f = deriveFlows({ batt: 910, pv: 60, grid: 850 });
  assert.equal(f.pvToBatt, 60);
  assert.equal(f.gridToBatt, 850);
  assert.equal(deriveFlows({ batt: -420 }).battToHouse, 420);
  assert.equal(deriveFlows({}).pvToBatt, undefined);
});

test("live values tolerate missing and unavailable entities", () => {
  const hass = {
    states: {
      "sensor.soc": { state: "76", attributes: {} },
      "sensor.batt": { state: "unavailable", attributes: {} },
      "sensor.pv": { state: "0.52", attributes: { unit_of_measurement: "kW" } },
      "input_select.mode": { state: "Sperren", attributes: {} },
    },
  };
  const live = readLive(hass, {
    soc_entity: "sensor.soc",
    capacity_kwh: 1.6,
    battery_power_entity: "sensor.batt",
    pv_power_entity: "sensor.pv",
    mode_entity: "input_select.mode",
  });
  assert.equal(live.soc, 76);
  assert.ok(Math.abs(live.kwh - 1.216) < 1e-9);
  assert.equal(live.batt, undefined);
  assert.equal(live.pv, 520);
  assert.equal(live.mode, "block");
  assert.equal(modeOf(hass, { mode_entity: "input_select.mode", mode_options: { block: "Sperren" } }), "block");
  assert.equal(readLive({ states: {} }, {}).soc, undefined);
});

test("number formatting per language", () => {
  assert.equal(fmtNum(32.71, 1, "de"), "32,7");
  assert.equal(fmtNum(32.71, 1, "en"), "32.7");
  assert.equal(fmtNum(undefined, 1, "de"), "–");
  assert.equal(fmtW(380, "de", true), "+380 W");
  assert.equal(fmtW(-420, "de"), "−420 W");
  assert.equal(fmtW(0, "de", true), "0 W");
});

test("history request covers the last 24 h of the given entities", () => {
  const now = new Date("2026-11-14T11:20:00").getTime();
  const msg = historyRequest(["sensor.soc"], now);
  assert.equal(msg.type, "history/history_during_period");
  assert.equal(Date.parse(msg.end_time) - Date.parse(msg.start_time), HISTORY_SPAN);
  assert.deepEqual(msg.entity_ids, ["sensor.soc"]);
  assert.equal(msg.no_attributes, true);
});

test("history rows: compressed and full format, non-numeric states dropped, kW scaled", () => {
  const pts = parseHistory(
    [
      { s: "0.5", lu: 1794650000 },
      { s: "unavailable", lu: 1794650100 },
      { state: "0.25", last_changed: "2026-11-14T10:00:00+01:00" },
    ],
    1000,
  );
  assert.equal(pts.length, 2);
  assert.ok(pts[0].t < pts[1].t);
  assert.equal(pts.find((p) => p.t === 1794650000000).v, 500);
  assert.deepEqual(parseHistory(undefined), []);
});

test("price sources are shared per home / sensor and notify every waiting card", async () => {
  assert.equal(sharedPriceSource({}), sharedPriceSource({ tibber_home: "" }));
  assert.notEqual(sharedPriceSource({}), sharedPriceSource({ tibber_home: "Other" }));
  assert.notEqual(sharedPriceSource({}), sharedPriceSource({ price_entity: "sensor.p" }));
  const src = sharedPriceSource({ tibber_home: "Listeners" });
  const now = new Date("2026-11-14T11:20:00").getTime();
  let calls = 0;
  let notified = 0;
  const hass = {
    states: {},
    callWS: async () => {
      calls++;
      return { response: { prices: { Listeners: day("2026-11-14") } } };
    },
  };
  src.get(hass, { tibber_home: "Listeners" }, now, () => notified++);
  src.get(hass, { tibber_home: "Listeners" }, now, () => notified++);
  await src.pending;
  assert.equal(calls, 1);
  assert.equal(notified, 2);
});

test("price limit: lowest of the entities in ct/kWh, EUR converted, broken ones skipped", () => {
  const st = (state, unit) => ({ state, attributes: unit ? { unit_of_measurement: unit } : {} });
  const hass = {
    states: {
      "input_number.thr": st("0.311", "EUR/kWh"),
      "input_number.gv": st("0.3533"),
      "input_number.ct": st("29.5", "ct/kWh"),
      "input_number.off": st("unavailable"),
    },
  };
  assert.equal(priceLimitOf(hass, { price_limit_entity: "input_number.thr" }).toFixed(2), "31.10");
  assert.equal(priceLimitOf(hass, { price_limit_entity: ["input_number.thr", "input_number.gv"] }).toFixed(2), "31.10");
  assert.equal(priceLimitOf(hass, { price_limit_entity: ["input_number.gv", "input_number.ct"] }), 29.5);
  assert.equal(priceLimitOf(hass, { price_limit_entity: ["input_number.off", "sensor.missing"] }), undefined);
  assert.equal(priceLimitOf(hass, {}), undefined);
});
