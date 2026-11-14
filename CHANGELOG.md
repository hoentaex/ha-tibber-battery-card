# Changelog

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
