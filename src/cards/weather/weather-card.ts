// Tiempo: condición actual y pronóstico de los próximos días.
//
// El pronóstico se pide con la suscripción `weather/subscribe_forecast`
// (HA 2023.9+); sin pronóstico, la tarjeta muestra solo la condición actual.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, lang, t } from '../../i18n';
import { tokens } from '../../styles';
import { formatNumber, isUnavailable, moreInfo } from '../../ha';
import { weatherIconStyles, weatherSvg } from './weather-icons';

export interface WeatherCardConfig {
  type: string;
  entity: string;
  name?: string;
  show_forecast?: boolean;
  forecast_days?: number;
}

interface Forecast {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
}

function wxIcon(cond: string | undefined, cls = '') {
  return html`<span class="wxi ${cls}">${weatherSvg(cond)}</span>`;
}

@customElement('inventa-weather-card')
export class InventaWeatherCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: WeatherCardConfig;
  @state() private _forecast?: Forecast[];
  private _unsub?: Promise<() => void>;
  private _subscribedTo?: string;

  public static getStubConfig(hass?: HomeAssistant): Partial<WeatherCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('weather.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'weather' } } },
        { name: 'name', selector: { text: {} } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'show_forecast', selector: { boolean: {} } },
            { name: 'forecast_days', selector: { number: { min: 1, max: 7, mode: 'box' } } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: WeatherCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `weather.*`');
    this._config = { show_forecast: true, forecast_days: 5, ...config };
    if (this.isConnected) this._subscribe();
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._subscribe();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  private _unsubscribe(): void {
    this._unsub?.then((u) => u()).catch(() => undefined);
    this._unsub = undefined;
    this._subscribedTo = undefined;
  }

  private _subscribe(): void {
    const c = this._config;
    if (!c || !this.hass?.connection || c.show_forecast === false) return;
    if (this._subscribedTo === c.entity) return;
    this._unsubscribe();
    this._subscribedTo = c.entity;
    this._unsub = this.hass.connection.subscribeMessage<{ forecast: Forecast[] }>((msg) => (this._forecast = msg.forecast), {
      type: 'weather/subscribe_forecast',
      forecast_type: 'daily',
      entity_id: c.entity,
    });
    this._unsub.catch(() => (this._forecast = []));
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity];
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) {
      ensureTheme(this.hass);
      if (!this._subscribedTo && this.isConnected) this._subscribe();
    }
  }

  private _cond(cond?: string): string {
    return cond ? t(this.hass, `wx_${cond.replace(/-/g, '_')}` as any) : '';
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    if (isUnavailable(st)) {
      return html`<ha-card class="msg">${c.name || c.entity} · ${t(this.hass, 'unavailable')}</ha-card>`;
    }
    const a = st.attributes;
    const days = (this._forecast || []).slice(0, c.forecast_days || 5);
    const showFc = c.show_forecast !== false && days.length > 0;

    return html`<ha-card @click=${() => moreInfo(this, c.entity)}>
      <div class="wx ${showFc ? 'with-fc' : ''}">
      <div class="now">
        <div class="place">${c.name || t(this.hass, 'weather_title')}</div>
        <div class="temp-row">
          ${wxIcon(st.state)}
          <span class="temp">${a.temperature != null ? `${formatNumber(this.hass, a.temperature, 0)}°` : '—'}</span>
        </div>
        <div class="cond">${this._cond(st.state)}${a.humidity != null ? html` · 💧 ${a.humidity}%` : nothing}</div>
      </div>
      ${showFc
        ? html`<div class="sep"></div>
            <div class="fc">
              ${days.map((d) => {
                const day = new Date(d.datetime).toLocaleDateString(lang(this.hass), { weekday: 'short' }).replace('.', '');
                return html`<div class="day">
                  <span class="dn">${day}</span>
                  ${wxIcon(d.condition, 'small')}
                  <b>${d.temperature != null ? `${Math.round(d.temperature)}°` : '—'}</b>
                  <span class="lo">${d.templow != null ? `${Math.round(d.templow)}°` : ''}</span>
                </div>`;
              })}
            </div>`
        : nothing}
      </div>
    </ha-card>`;
  }

  static styles = [
    tokens,
    weatherIconStyles,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      ha-card {
        padding: 14px 18px;
        cursor: pointer;
      }
      .wx {
        display: grid;
        gap: 14px;
        align-items: center;
      }
      .wx.with-fc {
        grid-template-columns: auto 1px minmax(0, 1fr);
        column-gap: 24px;
      }
      ha-card.msg {
        cursor: default;
        color: var(--_tx3);
        font-size: 13px;
      }
      .place,
      .cond {
        font-size: 12px;
        color: var(--_tx3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .temp-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .temp {
        font-size: 34px;
        font-weight: 400;
        color: var(--_tx);
        line-height: 1.2;
      }
      .wxi {
        display: inline-block;
        width: 52px;
        height: 52px;
        flex: none;
      }
      .wxi.small {
        width: 36px;
        height: 36px;
        margin: 2px 0;
      }
      .sep {
        background: var(--_line);
        align-self: stretch;
      }
      .fc {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        text-align: center;
        font-size: 12px;
      }
      .day {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        min-width: 0;
      }
      .dn {
        color: var(--_tx3);
        text-transform: capitalize;
      }
      .day b {
        font-weight: 500;
        color: var(--_tx);
      }
      .lo {
        color: var(--_tx3);
      }

      /* Angosta: pronóstico debajo */
      @container (max-width: 380px) {
        .wx.with-fc {
          grid-template-columns: minmax(0, 1fr);
        }
        .sep {
          height: 1px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-weather-card': InventaWeatherCard;
  }
}
