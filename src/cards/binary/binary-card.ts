// Sensor binario: puerta, ventana, movimiento, humo, agua… Resalta en ámbar
// (aviso) o rojo (alarma) según la clase cuando está activo, y muestra desde
// cuándo está así. El texto del estado ("Abierta", "Despejado"…) lo traduce
// Home Assistant según la clase del sensor.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { entityName, isUnavailable, moreInfo, relativeTime, stateText } from '../../ha';

export interface BinaryCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
}

/** Clases que, activas, son una alarma (rojo). */
const ALARM = ['smoke', 'gas', 'carbon_monoxide', 'moisture', 'safety', 'tamper', 'heat', 'problem'];
/** Clases donde "activo" es lo bueno (verde). */
const GOOD = ['connectivity', 'plug', 'power', 'running', 'update'];

const ICONS: Record<string, [string, string]> = {
  door: ['mdi:door-open', 'mdi:door-closed'],
  garage_door: ['mdi:garage-open-variant', 'mdi:garage-variant'],
  window: ['mdi:window-open-variant', 'mdi:window-closed-variant'],
  opening: ['mdi:square-outline', 'mdi:square'],
  motion: ['mdi:motion-sensor', 'mdi:motion-sensor-off'],
  occupancy: ['mdi:home-account', 'mdi:home-outline'],
  presence: ['mdi:home-account', 'mdi:home-outline'],
  smoke: ['mdi:smoke-detector-variant-alert', 'mdi:smoke-detector-variant'],
  gas: ['mdi:alert-circle', 'mdi:check-circle-outline'],
  carbon_monoxide: ['mdi:smoke-detector-alert', 'mdi:smoke-detector'],
  moisture: ['mdi:water-alert', 'mdi:water-off-outline'],
  connectivity: ['mdi:lan-connect', 'mdi:lan-disconnect'],
  battery: ['mdi:battery-alert-variant-outline', 'mdi:battery'],
  lock: ['mdi:lock-open-variant-outline', 'mdi:lock-outline'],
  plug: ['mdi:power-plug', 'mdi:power-plug-off'],
  power: ['mdi:power-plug', 'mdi:power-plug-off'],
  vibration: ['mdi:vibrate', 'mdi:crop-portrait'],
  sound: ['mdi:music-note', 'mdi:music-note-off'],
};

@customElement('inventa-binary-card')
export class InventaBinaryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: BinaryCardConfig;
  private _timer?: number;

  public static getStubConfig(hass?: HomeAssistant): Partial<BinaryCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('binary_sensor.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'binary_sensor' } } },
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

  public setConfig(config: BinaryCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `binary_sensor.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 3, rows: 1 };
  }

  connectedCallback(): void {
    super.connectedCallback();
    // "hace X min" avanza aunque el estado no cambie.
    this._timer = window.setInterval(() => this.requestUpdate(), 60 * 1000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
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
    const dc = st?.attributes.device_class as string | undefined;
    const level = na || !on ? '' : ALARM.includes(dc || '') ? 'alert' : GOOD.includes(dc || '') ? 'good' : 'warn';
    const pair = ICONS[dc || ''] || ['mdi:checkbox-marked-circle', 'mdi:checkbox-blank-circle-outline'];
    const icon = c.icon || st?.attributes.icon || (on ? pair[0] : pair[1]);
    const status = na ? t(this.hass, 'unavailable') : stateText(this.hass, st);
    const since = st && !na ? ` · ${relativeTime(this.hass, st.last_changed)}` : '';

    return html`<ha-card class="${level} ${na ? 'na' : ''}" @click=${() => moreInfo(this, c.entity)}>
      <div class="row">
        <div class="ico"><ha-icon .icon=${icon}></ha-icon></div>
        <div class="info">
          <div class="n">${entityName(this.hass, c.entity, c.name)}</div>
          <div class="s">${status}${since}</div>
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
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.na {
        opacity: 0.5;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 100%;
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
      .warn {
        border-color: color-mix(in srgb, var(--_amb) 45%, var(--_line));
      }
      .warn .ico {
        background: var(--_wbg);
        color: var(--_amb);
      }
      .warn .s {
        color: var(--_amb);
      }
      .alert {
        border-color: color-mix(in srgb, var(--_na) 50%, var(--_line));
      }
      .alert .ico {
        background: var(--_nabg);
        color: var(--_na);
      }
      .alert .s {
        color: var(--_na);
        font-weight: 500;
      }
      .good .ico {
        background: var(--_okbg);
        color: var(--_ok);
      }
      .info {
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-binary-card': InventaBinaryCard;
  }
}
