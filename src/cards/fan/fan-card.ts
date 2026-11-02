// Ventilador: tocar enciende/apaga, velocidad por pasos (tocar un segmento) y
// oscilación. Mantener presionado abre "más información". El ícono gira
// mientras está encendido.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { entityName, isUnavailable, moreInfo } from '../../ha';

export interface FanCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
}

const SET_SPEED = 1;
const OSCILLATE = 2;

@customElement('inventa-fan-card')
export class InventaFanCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: FanCardConfig;
  private _press = new Press(
    () => !isUnavailable(this.hass?.states[this._config.entity]) && this.hass?.callService('fan', 'toggle', { entity_id: this._config.entity }),
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<FanCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('fan.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'fan' } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: FanCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `fan.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 4, rows: 'auto' };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const on = st?.state === 'on';
    const a = st?.attributes || {};
    const f = Number(a.supported_features || 0);
    const step = Number(a.percentage_step) || 25;
    const steps = Math.min(6, Math.max(1, Math.round(100 / step)));
    const pct = on ? Number(a.percentage ?? 100) : 0;
    const level = Math.round(pct / (100 / steps));
    const name = entityName(this.hass, c.entity, c.name);
    const status = na
      ? t(this.hass, 'unavailable')
      : !on
        ? t(this.hass, 'off')
        : f & SET_SPEED
          ? t(this.hass, 'speed_of', { n: level, total: steps })
          : t(this.hass, 'on');
    const p = this._press;

    return html`<ha-card
      class="${on ? 'on' : ''} ${na ? 'na' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${on ? 'true' : 'false'}
      aria-label=${`${name}: ${status}`}
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
      @keydown=${p.key}
    >
      <div class="top">
        <div class="ico ${on ? 'spin' : ''}"><ha-icon .icon=${c.icon || 'mdi:fan'}></ha-icon></div>
        <div class="info">
          <div class="n">${name}</div>
          <div class="s">${status}</div>
        </div>
        ${f & OSCILLATE && !na
          ? html`<button
              class="chip ${a.oscillating ? 'on' : ''}"
              @pointerdown=${stop}
              @click=${(e: Event) => {
                stop(e);
                this.hass?.callService('fan', 'oscillate', { entity_id: c.entity, oscillating: !a.oscillating });
              }}
            >
              ${t(this.hass, 'oscillate')}
            </button>`
          : nothing}
      </div>
      ${f & SET_SPEED && !na
        ? html`<div class="segs">
            ${Array.from(
              { length: steps },
              (_, i) => html`<button
                class=${i < level ? 'on' : ''}
                aria-label=${t(this.hass, 'speed_of', { n: i + 1, total: steps })}
                @pointerdown=${stop}
                @click=${(e: Event) => {
                  stop(e);
                  this.hass?.callService('fan', 'set_percentage', { entity_id: c.entity, percentage: Math.round(((i + 1) * 100) / steps) });
                }}
              ></button>`,
            )}
          </div>`
        : nothing}
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 12px 14px;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.na {
        opacity: 0.5;
      }
      ha-card:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ico {
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: var(--_card2);
        color: var(--_tx3);
        --mdc-icon-size: 18px;
      }
      .on .ico {
        background: color-mix(in srgb, var(--_cyan) 18%, var(--_card2));
        color: var(--_cyan);
      }
      .spin ha-icon {
        animation: spin 1.6s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .spin ha-icon {
          animation: none;
        }
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
      .chip {
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        border-radius: 999px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        color: var(--_tx2);
        cursor: pointer;
      }
      .chip.on {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .segs {
        display: flex;
        gap: 6px;
        margin-top: 12px;
      }
      .segs button {
        flex: 1;
        height: 22px;
        border-radius: 7px;
        border: none;
        padding: 0;
        background: var(--_line);
        cursor: pointer;
      }
      .segs button.on {
        background: var(--_cyan);
      }
      .segs button:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-fan-card': InventaFanCard;
  }
}
