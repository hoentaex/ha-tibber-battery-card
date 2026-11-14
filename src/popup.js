// Full-screen detail dialog: the main card in detail mode (large price chart, 24 h history).
// It lives on document.body, so no transformed dashboard ancestor can clip it; the theme colours of the
// card that opened it are copied over, since view themes are set below body.

const THEME_VARS = [
  "--primary-text-color",
  "--secondary-text-color",
  "--disabled-text-color",
  "--primary-color",
  "--card-background-color",
  "--ha-card-background",
  "--secondary-background-color",
  "--divider-color",
  "--tb-pv",
  "--tb-grid",
  "--tb-batt",
  "--tb-expensive",
  "--tb-block",
];

const DIALOG_STYLE = `
  :host { position: fixed; inset: 0; z-index: 9999; display: block; }
  .backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, .5); display: flex; align-items: center; justify-content: center;
              padding: 24px; box-sizing: border-box; animation: tb-fade .15s ease; }
  .panel { width: min(640px, 100%); max-height: 100%; overflow: auto; overscroll-behavior: contain; border-radius: 16px;
           background: var(--ha-card-background, var(--card-background-color, #fff)); box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
           --ha-card-box-shadow: none; --ha-card-border-width: 0; --ha-card-border-radius: 16px; }
  @media (max-width: 600px) {
    .backdrop { padding: 0; }
    .panel { width: 100%; height: 100%; max-height: none; border-radius: 0; --ha-card-border-radius: 0; }
  }
  @keyframes tb-fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .backdrop { animation: none; } }
`;

export class TibberBatteryDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._onKey = (e) => {
      if (e.key === "Escape") this.close();
    };
  }

  set hass(hass) {
    if (this._card) this._card.hass = hass;
  }

  open({ config, hass, opener, label }) {
    this._opener = opener;
    const host = opener?.getRootNode?.()?.host;
    if (host) {
      const cs = getComputedStyle(host);
      for (const name of THEME_VARS) {
        const val = cs.getPropertyValue(name).trim();
        if (val) this.style.setProperty(name, val);
      }
      this.style.fontFamily = cs.fontFamily;
      this.style.color = cs.getPropertyValue("--primary-text-color");
    }
    this.shadowRoot.innerHTML = `<style>${DIALOG_STYLE}</style>
      <div class="backdrop"><div class="panel" role="dialog" aria-modal="true"></div></div>`;
    const panel = this.shadowRoot.querySelector(".panel");
    panel.setAttribute("aria-label", label);
    this._card = document.createElement("tibber-battery-card");
    this._card.setConfig({ ...config, type: "custom:tibber-battery-card", popup: false, _detail: true });
    this._card.hass = hass;
    panel.append(this._card);
    this.shadowRoot.querySelector(".backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.close();
    });
    this._card.addEventListener("tibber-battery-close", () => this.close());
    document.addEventListener("keydown", this._onKey);
    this._overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.append(this);
    // Focus the close button once the card has rendered.
    requestAnimationFrame(() => this._card.shadowRoot?.querySelector("[data-close]")?.focus());
  }

  close() {
    document.removeEventListener("keydown", this._onKey);
    document.body.style.overflow = this._overflow ?? "";
    this.remove();
    this._card = undefined;
    this.dispatchEvent(new CustomEvent("closed"));
    this._opener?.focus?.();
  }
}

if (!customElements.get("tibber-battery-dialog")) customElements.define("tibber-battery-dialog", TibberBatteryDialog);
