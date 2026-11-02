// Sensor con mini gráfico: valor actual, unidad, tendencia y las últimas
// horas de historial. El historial se pide a HA
// (`history/history_during_period`) al mostrarse y cada 10 minutos.
// Si el sensor no es numérico, muestra el estado como texto, sin gráfico.

import { LitElement, html, css, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler } from '../../i18n';
import { tokens } from '../../styles';
import { domainIcon, entityName, formatNumber, isUnavailable, moreInfo, stateText } from '../../ha';

export interface SensorCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  hours?: number;
  color?: string;
  decimals?: number;
}

const REFRESH_MS = 10 * 60 * 1000;

/** Color por clase de dispositivo. */
function classColor(dc?: string): string {
  if (dc === 'temperature') return 'var(--_heat)';
  if (dc === 'humidity' || dc === 'moisture') return 'var(--_cyan)';
  if (dc === 'power' || dc === 'energy' || dc === 'current' || dc === 'voltage') return 'var(--_amb)';
  if (dc === 'battery') return 'var(--_ok)';
  return 'var(--_acc)';
}

@customElement('inventa-sensor-card')
export class InventaSensorCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: SensorCardConfig;
  @state() private _points: number[] = [];
  private _timer?: number;
  private _loadedFor = '';

  public static getStubConfig(hass?: HomeAssistant): Partial<SensorCardConfig> {
    const id = Object.keys(hass?.states || {}).find((e) => e.startsWith('sensor.') && !isNaN(parseFloat(hass!.states[e].state)));
    return { entity: id || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'sensor' } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            { name: 'hours', selector: { number: { min: 1, max: 168, mode: 'box' } } },
            { name: 'decimals', selector: { number: { min: 0, max: 3, mode: 'box' } } },
            { name: 'color', selector: { text: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', hours: 'hours' }),
    };
  }

  public setConfig(config: SensorCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `sensor.*`');
    this._config = { hours: 24, ...config };
    this._loadedFor = '';
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 4, rows: 'auto' };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => this._load(), REFRESH_MS);
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
    if (changed.has('hass')) {
      ensureTheme(this.hass);
      const key = `${this._config.entity}|${this._config.hours}`;
      if (this._loadedFor !== key) {
        this._loadedFor = key;
        this._load();
      } else if (this._points.length && changed.has('hass')) {
        // Agregar el valor actual al final para que el gráfico avance en vivo.
        const v = parseFloat(this.hass?.states[this._config.entity]?.state || '');
        if (Number.isFinite(v) && v !== this._points[this._points.length - 1]) this._points = [...this._points.slice(1), v];
      }
    }
  }

  private async _load(): Promise<void> {
    const hass = this.hass;
    const c = this._config;
    if (!hass?.callWS || !c) return;
    const start = new Date(Date.now() - (c.hours || 24) * 3600 * 1000).toISOString();
    try {
      const res = await hass.callWS<Record<string, Array<{ s: string }>>>({
        type: 'history/history_during_period',
        start_time: start,
        entity_ids: [c.entity],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      const pts = (res[c.entity] || []).map((p) => parseFloat(p.s)).filter((n) => Number.isFinite(n));
      // Reducir a ~60 puntos para un trazo liviano.
      const step = Math.max(1, Math.ceil(pts.length / 60));
      this._points = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
    } catch (e) {
      this._points = [];
    }
  }

  private _spark(color: string) {
    const p = this._points;
    if (p.length < 2) return nothing;
    const min = Math.min(...p);
    const max = Math.max(...p);
    const span = max - min || 1;
    const line = p.map((v, i) => `${i ? 'L' : 'M'}${((i / (p.length - 1)) * 100).toFixed(1)} ${(27 - ((v - min) / span) * 24).toFixed(1)}`).join(' ');
    return svg`<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path d="${line} L100 30 L0 30Z" fill=${color} opacity="0.12" />
      <path d=${line} fill="none" stroke=${color} stroke-width="1.6" vector-effect="non-scaling-stroke" />
    </svg>`;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const name = entityName(this.hass, c.entity, c.name);
    const na = isUnavailable(st);
    const value = st ? parseFloat(st.state) : NaN;
    const numeric = !na && Number.isFinite(value);
    const unit = st?.attributes.unit_of_measurement || '';
    const color = c.color || classColor(st?.attributes.device_class);

    // Tendencia: valor actual vs. el primero del período.
    let trend = '';
    if (numeric && this._points.length > 1 && this._points[0] !== 0) {
      const pct = ((value - this._points[0]) / Math.abs(this._points[0])) * 100;
      if (Math.abs(pct) >= 1) trend = `${pct > 0 ? '↑' : '↓'} ${Math.round(Math.abs(pct))} %`;
    }

    return html`<ha-card @click=${() => moreInfo(this, c.entity)}>
      <div class="top">
        <span class="lbl">${name}</span>
        ${trend ? html`<span class="pill">${trend}</span>` : html`<ha-icon .icon=${c.icon || domainIcon(c.entity, st)}></ha-icon>`}
      </div>
      <div class="big">
        ${numeric
          ? html`${formatNumber(this.hass, value, c.decimals ?? (Number.isInteger(value) ? 0 : 1))}${unit
                ? html`<span class="unit">${unit}</span>`
                : nothing}`
          : html`<span class="text">${st ? stateText(this.hass, st) : '—'}</span>`}
      </div>
      ${numeric ? this._spark(color) : nothing}
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 14px 16px 12px;
        cursor: pointer;
        height: 100%;
        box-sizing: border-box;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        --mdc-icon-size: 16px;
      }
      .top ha-icon {
        color: var(--_tx3);
      }
      .lbl {
        font-size: 12px;
        color: var(--_tx2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .big {
        font-size: 26px;
        font-weight: 500;
        color: var(--_tx);
        line-height: 1.25;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unit {
        font-size: 14px;
        color: var(--_tx2);
        margin-left: 4px;
      }
      .text {
        font-size: 18px;
      }
      .spark {
        display: block;
        width: 100%;
        height: 44px;
        margin-top: 6px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-sensor-card': InventaSensorCard;
  }
}
