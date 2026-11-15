// "Recent activity": Home Assistant logbook entries of the mode helper, the grid-charge switch and the
// two target helpers, turned into rows (newest first) with who triggered them and the controller's reason
// at that moment. Pure, no DOM: the card feeds it the entries of a logbook/event_stream subscription.
import { DEFAULTS, fmtClock, fmtNum, startOfDay, STRINGS } from "./shared.js";

export const ACTIVITY_HOURS = 8;

const BAD = new Set(["unavailable", "unknown", "none", ""]);
// A reason written up to this long after a change still belongs to it (the controller writes it right after).
const REASON_LAG = 5000;
// Slider moves on the same target within this time count as one change.
const MERGE = 60000;

export const activityHours = (config) => {
  const h = Number(config?.activity_hours);
  return Number.isFinite(h) && h > 0 ? Math.min(h, 72) : ACTIVITY_HOURS;
};

// Entities the section watches, by role. The section needs the mode helper or the switch.
export const activityEntities = (config) => {
  const roles = {
    mode: config.mode_entity,
    switch: config.grid_charge_switch,
    target: config.target_soc_entity,
    force: config.force_target_soc_entity,
    reason: config.reason_entity,
  };
  return Object.fromEntries(Object.entries(roles).filter(([, id]) => !!id));
};

// logbook/event_stream message for the watched entities of the last `hours`.
export const activityRequest = (ids, now, hours) => ({
  type: "logbook/event_stream",
  start_time: new Date(now - hours * 3600000).toISOString(),
  entity_ids: ids,
});

// Who triggered an entry: a user (person name, else the user's own name, else "user"), an automation or a
// script (its name). Device changes without context stay anonymous.
export const actorOf = (e, hass, t) => {
  const uid = e.context_user_id;
  if (uid) {
    const person = Object.values(hass?.states || {}).find(
      (s) => s.attributes?.user_id === uid && s.entity_id?.startsWith?.("person."),
    );
    const name = person?.attributes?.friendly_name || (hass?.user?.id === uid ? hass.user.name : undefined);
    return name || t("act_user");
  }
  const src = e.context_entity_id;
  if (src && /^(automation|script)\./.test(src))
    return hass?.states?.[src]?.attributes?.friendly_name || e.context_name || e.context_entity_id_name || src;
  if (e.context_event_type === "automation_triggered" || e.context_event_type === "script_started")
    return e.context_name || undefined;
  return undefined;
};

const modeKey = (state, config) => {
  const opts = { ...DEFAULTS.mode_options, ...config.mode_options };
  const v = String(state).toLowerCase();
  return Object.keys(opts).find((k) => String(opts[k]).toLowerCase() === v);
};

const onOff = (state) => {
  const v = String(state).toLowerCase();
  if (["on", "true", "1"].includes(v)) return true;
  if (["off", "false", "0"].includes(v)) return false;
  return undefined;
};

// "13:00" today, "gestern 23:10" yesterday, else date and time.
export const fmtWhen = (ms, now, lang, locale) => {
  const clock = fmtClock(ms, lang, locale);
  const day = startOfDay(ms);
  if (day === startOfDay(now)) return clock;
  if (day === startOfDay(now, -1)) return `${STRINGS[lang]?.yesterday ?? STRINGS.en.yesterday} ${clock}`;
  const tag = lang === "de" ? "de-DE" : "en-GB";
  return `${new Intl.DateTimeFormat(tag, { day: "2-digit", month: "2-digit" }).format(new Date(ms))} ${clock}`;
};

// Logbook entries → rows, newest first: {t, entity, kind, title, color, who, reason}.
export const buildActivity = (entries, { config, hass, now, hours = ACTIVITY_HOURS, t, lang, currentReason }) => {
  const roles = activityEntities(config);
  const role = Object.fromEntries(Object.entries(roles).map(([r, id]) => [id, r]));
  const list = (entries || [])
    .filter((e) => e && role[e.entity_id] && Number.isFinite(Number(e.when)) && !BAD.has(String(e.state ?? "")))
    .map((e) => ({ ...e, ms: Number(e.when) * 1000 }))
    .sort((a, b) => a.ms - b.ms);

  const reasons = list.filter((e) => role[e.entity_id] === "reason");
  // The reason that held right after `ms`; without any reason change in the window the current text held all along.
  const reasonAt = (ms) => {
    let r;
    for (const e of reasons) if (e.ms <= ms + REASON_LAG) r = e;
    if (r) return String(r.state).trim() || undefined;
    return reasons.length ? undefined : currentReason;
  };

  const rows = [];
  const last = {};
  for (const e of list) {
    const r = role[e.entity_id];
    if (r === "reason") continue;
    // The logbook only lists changes, but a restart can repeat a state: skip repeats.
    if (last[e.entity_id] === e.state) continue;
    last[e.entity_id] = e.state;
    const who = actorOf(e, hass, t);
    if (r === "mode") {
      const m = modeKey(e.state, config);
      if (!m) continue;
      const color = { auto: "var(--secondary-text-color)", force: "var(--tb-grid)", block: "var(--tb-block)" }[m];
      rows.push({
        t: e.ms,
        entity: e.entity_id,
        kind: `mode_${m}`,
        title: t(`act_mode_${m}`),
        color,
        who,
        reason: reasonAt(e.ms),
      });
    } else if (r === "switch") {
      const on = onOff(e.state);
      if (on == null) continue;
      rows.push({
        t: e.ms,
        entity: e.entity_id,
        kind: on ? "grid_on" : "grid_off",
        title: t(on ? "act_grid_on" : "act_grid_off"),
        color: on ? "var(--tb-grid)" : "var(--secondary-text-color)",
        who,
        reason: reasonAt(e.ms),
      });
    } else {
      const n = Number.parseFloat(String(e.state).replace(",", "."));
      if (!Number.isFinite(n)) continue;
      const kind = r === "force" ? "force_target" : "target";
      const row = {
        t: e.ms,
        entity: e.entity_id,
        kind,
        title: t(r === "force" ? "act_force_target" : "act_target", { v: fmtNum(n, 0, lang) }),
        color: "var(--tb-batt)",
        who,
      };
      // One drag of the slider: keep the last value only.
      const prev = rows[rows.length - 1];
      if (prev?.kind === kind && e.ms - prev.t < MERGE) rows[rows.length - 1] = row;
      else rows.push(row);
    }
  }
  const from = now - hours * 3600000;
  return rows.filter((row) => row.t >= from && row.t <= now + 60000).reverse();
};
