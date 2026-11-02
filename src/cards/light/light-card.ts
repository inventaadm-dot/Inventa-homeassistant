// Luz / interruptor: tocar la tarjeta enciende o apaga; mantener presionado
// abre "más información". Si la luz admite brillo, muestra una barra para
// regularlo. Funciona también con switch, fan e input_boolean.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { domain, entityName, isUnavailable, moreInfo } from '../../ha';

export interface LightCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  show_brightness?: boolean;
  hide_unavailable?: boolean;
}

const DIMMABLE = ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white'];

@customElement('inventa-light-card')
export class InventaLightCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: LightCardConfig;
  /** Brillo mientras se arrastra la barra (para no saltar con cada actualización). */
  @state() private _dragPct?: number;
  private _press = new Press(
    () => this._toggle(),
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<LightCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('light.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: ['light', 'switch', 'fan', 'input_boolean'] } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            { name: 'show_brightness', selector: { boolean: {} } },
            { name: 'hide_unavailable', selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: LightCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad (light, switch…)');
    this._config = { show_brightness: true, ...config };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 3, rows: 1 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  private _toggle(): void {
    if (isUnavailable(this.hass?.states[this._config.entity])) return;
    this.hass?.callService('homeassistant', 'toggle', { entity_id: this._config.entity });
  }

  private _setBrightness(e: Event): void {
    const pct = Number((e.target as HTMLInputElement).value);
    this._dragPct = undefined;
    this.hass?.callService('light', 'turn_on', { entity_id: this._config.entity, brightness_pct: pct });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    if (na && c.hide_unavailable) {
      this.style.display = 'none';
      return nothing;
    }
    this.style.display = '';

    const on = st?.state === 'on';
    const modes: string[] = st?.attributes.supported_color_modes || [];
    const dimmable = domain(c.entity) === 'light' && modes.some((m) => DIMMABLE.includes(m));
    const pct = this._dragPct ?? (on && st.attributes.brightness != null ? Math.round((st.attributes.brightness / 255) * 100) : 0);
    const showSlider = c.show_brightness !== false && dimmable && !na;
    // Siempre una ampolleta (como en la galería), aunque sea un interruptor; `icon` la cambia.
    const icon = c.icon || (domain(c.entity) === 'fan' ? 'mdi:fan' : on ? 'mdi:lightbulb' : 'mdi:lightbulb-outline');
    const status = na ? t(this.hass, 'unavailable') : on ? (dimmable && pct ? `${t(this.hass, 'on')} · ${pct}%` : t(this.hass, 'on')) : t(this.hass, 'off');

    const p = this._press;
    return html`<ha-card
      class="${on ? 'on' : ''} ${na ? 'na' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${on ? 'true' : 'false'}
      aria-label=${`${entityName(this.hass, c.entity, c.name)}: ${status}`}
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @pointercancel=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
      @keydown=${p.key}
    >
      <div class="row">
      <div class="bulb"><ha-icon .icon=${icon}></ha-icon></div>
      <div class="info">
        <div class="n">${entityName(this.hass, c.entity, c.name)}</div>
        ${showSlider
          ? html`<input
              class="slider"
              type="range"
              min="1"
              max="100"
              .value=${String(pct || 1)}
              style="--pct:${on || this._dragPct != null ? pct : 0}%"
              aria-label=${`${entityName(this.hass, c.entity, c.name)} %`}
              @click=${stop}
              @pointerdown=${stop}
              @keydown=${stop}
              @input=${(e: Event) => (this._dragPct = Number((e.target as HTMLInputElement).value))}
              @change=${this._setBrightness}
            />`
          : html`<div class="s">${status}</div>`}
      </div>
      </div>
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 10px 12px;
        border-radius: 14px;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        height: 100%;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 100%;
      }
      ha-card.on {
        border-color: var(--_lonb);
      }
      ha-card.na {
        opacity: 0.5;
      }
      .bulb {
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: var(--_card2);
        color: var(--_tx3);
        --mdc-icon-size: 18px;
        transition: background 0.2s, color 0.2s;
      }
      .on .bulb {
        background: var(--_lon);
        color: var(--_amb);
      }
      ha-card:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
      .info {
        flex: 1;
        min-width: 0;
      }
      .n {
        font-size: 13px;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .s {
        font-size: 11px;
        color: var(--_tx3);
      }
      .slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        margin: 7px 0 2px;
        border-radius: 3px;
        background: linear-gradient(to right, var(--_amb) var(--pct), var(--_line) var(--pct));
        cursor: pointer;
      }
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--_tx);
        border: 2px solid var(--_card);
      }
      .slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--_tx);
        border: 2px solid var(--_card);
      }
      .slider:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 3px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-light-card': InventaLightCard;
  }
}
