# Changelog

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
