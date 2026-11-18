# Changelog

## 0.6.1 (2026-11-18)

- **Reason as a badge:** the controller's reason (`reason_entity`) is no longer a line with a check mark above the
  chips but the first chip itself: red "Blockiert: Preis über Grenze" while grid charging is off, blue "Lädt: …" while
  it runs. A red badge always means blocked, no red badge means it charges. Without a reason helper, Block mode shows
  as the red badge

## 0.6.0 (2026-11-18)

- **Illustrated header** on the card, the mini card and the detail popup, in the style of juju35's cards: a 90 px banner
  with the name and the status pill on the sky, the grid connection at the right (power pylon, meter cabinet with the
  Tibber Pulse, cable to the battery whose five LED segments show the state of charge) and the current price with
  what happens top right ("Netz → Akku +620 W", "wartet auf Ladefenster" …)
- Power flows in the picture: blue from the pylon through the meter into the battery while charging from the grid,
  green from the battery back to the house while it discharges; the ground strip under the banner in the state
  colour (blue grid, yellow PV, green discharge, amber blocked, grey idle)
- The status pill follows the name when both fit, else it goes under the subtitle (its dot alone when there is no
  room left); detail / close / expand buttons are frosted round buttons in the banner's corner; below 280 px the
  picture is left out
- Night picture with Home Assistant's dark theme; `illustration_theme: day | night` forces one, `illustration: false`
  keeps the classic header. Both options in the visual editor
- Mini card: the banner, then the state-of-charge ring and the key figures

## 0.5.0 (2026-11-15)

- New section `activity` ("Letzte Aktivitäten" / "Recent activity") at the bottom: Block / Force on, back to Auto,
  grid charging started / stopped, target SoC and Force target changes of the last 8 hours, newest first, each with
  who triggered it (user or automation) and the controller's reason at that moment; a click opens the entity
- Data from Home Assistant's logbook through a `logbook/event_stream` subscription while the section is open: new
  events appear live, no polling; folded, nothing is loaded
- Options `activity_collapsed` (start folded) and `activity_hours` (1–72, default 8), both in the visual editor
- Slider drags on a target within a minute count as one change; repeated states after a restart are skipped

## 0.4.0 (2026-11-15)

- `reason_entity`: the controller's decision as plain text ("Modus Sperren", "PV liefert Strom" …), shown as a line
  above the reason chips; the heading follows the grid charge switch ("Why is it (not) charging from the grid?")
- `override_until_entity`: end of Force / Block (`input_datetime` with date and time, or a timestamp sensor). The pill
  reads "Gesperrt bis 13:00" / "Netz lädt (erzwungen) bis 13:00", the hint under the mode switch "… · zurück auf Auto
  um 13:00." ("morgen 06:00", later with the date); past or invalid times are left out
- `force_target_soc_entity`: in Force mode the slider sets this target ("Erzwingen bis", min / max / step from the
  helper) and the SoC ring marks it; Force with the grid switch off reads "Erzwungen · Ziel erreicht"
- Mode hints no longer use fixed texts; "Auto" now reads "Controller entscheidet nach Preis, Ladefenster, Defizit und PV."
- Narrow cards shorten the pill to "Gesperrt" / "Erzwungen" with the full text as tooltip
- Times follow Home Assistant's locale and 12 / 24 h setting
- The target slider calls `number.set_value` for `number` entities (was always `input_number`)
- New cards also detect the Force target, the override end and the reason helper; a Force target is no longer picked
  as the regular target SoC

## 0.3.0 (2026-11-14)

- `show_history` (switch in the editor): the 24 h charts of the detail view (state of charge, PV and grid charging)
  also in the normal card, below the daily totals
- The "Last 24 hours" heading folds the section; `history_collapsed` (checkbox in the editor) starts it folded,
  and the history is only fetched once it is opened
- Icons in front of the section headings (price, reasons, grid charging, history), as in the Proxmox card

## 0.2.0 (2026-11-14)

- Charging window is now a rolling window, like the Home Assistant control logic: the `cheap_slots` (24) cheapest
  of the next `window_horizon_slots` (48) quarter hours from the current slot, running past midnight once
  tomorrow's prices are known, `min(24, available)` without them. `window_start` is gone.
- The price sensor's `ladefenster` attribute is used by default (`window_attribute`); the card only computes the
  window itself when it is missing. Blocks falling on tomorrow are drawn only with `show_tomorrow`.
- Min / Ø / Max from the sensor's `min_today` / `max_today` / `avg_today` when present
- "Charging window" chip shows whether the current slot is in the window; legend reads "Ladefenster"
- Upcoming price area a little fainter (45 %)
- README: template sensor with `today`, `tomorrow`, day figures and `ladefenster`

## 0.1.0 (2026-11-14)

- First version of the main card `custom:tibber-battery-card`: header with status pill, SoC ring with target marker,
  animated energy flows, 15-minute price chart with charging window, "why (not) charging" chips, grid-charge mode
  switch, target SoC slider and daily footer
- Prices from a sensor's attributes or directly from `tibber.get_prices`, cached and refreshed per quarter hour
- Mini card `custom:tibber-battery-mini-card`: one row with ring, name, status, price, PV and target; its button
  opens the detail dialog, or with `popup: false` expands the full card in place
- Detail dialog (also from the main card with `popup: true`): large price chart and 24 h history of SoC, PV and grid
  charging from the recorder
- Prices fetched once per Tibber home or price sensor and shared by every card on the page
- Visual editor for both cards (ha-form, entity selectors per domain, advanced section); new cards detect the
  battery, its Anker SOLIX sibling sensors, the helpers and a price sensor
- German and English, light and dark themes, `prefers-reduced-motion`
