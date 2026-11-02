// Indicador de resumen: agrega varias entidades (promedio, suma o
// activos/total) o muestra el valor de una sola, con barra continua o
// segmentada.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ActionConfig, HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { runAction } from '../../actions';
import { docHass, labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { domain, formatNumber, isActive, isUnavailable, moreInfo } from '../../ha';
import { climateTemp, type ClimateScales } from '../../climate-scale';

export type StatMode = 'average' | 'sum' | 'count' | 'value';
export type StatBar = 'continuous' | 'segments' | 'none';

export interface StatCardConfig {
  type: string;
  name?: string;
  icon?: string;
  entity?: string;
  entities?: string[];
  mode?: StatMode;
  /** Leer un atributo en vez del estado (p. ej. `current_temperature` de un clima). */
  attribute?: string;
  /** Factor forzado por clima (las temperaturas de climas que reportan mal se corrigen solas). */
  scales?: ClimateScales;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  bar?: StatBar;
  color?: string;
  tap_action?: ActionConfig;
}

const SEGMENT_LIMIT = 20;

/** Color por defecto según lo que se cuenta. */
function defaultColor(ids: string[]): string {
  const d = ids.length ? domain(ids[0]) : '';
  if (d === 'light') return 'var(--_amb)';
  if (d === 'climate' || d === 'fan') return 'var(--_cyan)';
  if (d === 'binary_sensor') return 'var(--_heat)';
  return 'var(--_acc)';
}

@customElement('inventa-stat-card')
export class InventaStatCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: StatCardConfig;

  public static getStubConfig(hass?: HomeAssistant): Partial<StatCardConfig> {
    const lights = Object.keys(hass?.states || {}).filter((e) => e.startsWith('light.')).slice(0, 10);
    return lights.length ? { name: t(hass, 'stat_lights'), icon: 'mdi:lightbulb-outline', entities: lights } : { entities: [] };
  }

  public static getConfigForm() {
    const opts = (keys: string[], prefix: string) => keys.map((v) => ({ value: v, label: t(docHass(), `${prefix}${v}` as any) }));
    return {
      schema: [
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
          ],
        },
        { name: 'entities', selector: { entity: { multiple: true } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'mode', selector: { select: { mode: 'dropdown', options: opts(['average', 'sum', 'count', 'value'], 'mode_') } } },
            { name: 'bar', selector: { select: { mode: 'dropdown', options: opts(['continuous', 'segments', 'none'], 'bar_') } } },
          ],
        },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'attribute', selector: { text: {} } },
            { name: 'unit', selector: { text: {} } },
            { name: 'decimals', selector: { number: { min: 0, max: 3, mode: 'box' } } },
            { name: 'color', selector: { text: {} } },
            { name: 'min', selector: { number: { mode: 'box' } } },
            { name: 'max', selector: { number: { mode: 'box' } } },
          ],
        },
        { name: 'tap_action', selector: { ui_action: {} } },
      ],
      computeLabel: labeler({ name: 'card_name', entities: 'entities_list' }),
    };
  }

  public setConfig(config: StatCardConfig): void {
    if (!config) throw new Error('Configuración inválida');
    if (config.entities && !Array.isArray(config.entities)) throw new Error('`entities` debe ser una lista');
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions() {
    return { columns: 3, min_columns: 3, rows: 'auto' };
  }

  private get _ids(): string[] {
    const c = this._config;
    return [...(c.entity ? [c.entity] : []), ...(c.entities || [])];
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass) return true;
    return this._ids.some((e) => old.states[e] !== this.hass!.states[e]) || old.locale?.language !== this.hass.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  private _mode(ids: string[]): StatMode {
    if (this._config.mode) return this._config.mode;
    if (ids.length === 1) return 'value';
    const numeric = ids.every((e) => {
      const st = this.hass?.states[e];
      const v = this._config.attribute ? st?.attributes[this._config.attribute] : st?.state;
      return isUnavailable(st) || !isNaN(parseFloat(v));
    });
    return numeric ? 'average' : 'count';
  }

  private _numbers(ids: string[]): number[] {
    const attr = this._config.attribute;
    return ids
      .map((e) => this.hass?.states[e])
      .filter((st) => !isUnavailable(st))
      .map((st) => (attr ? (climateTemp(this.hass, st, attr, this._config.scales?.[st!.entity_id]) ?? NaN) : parseFloat(st!.state)))
      .filter((n) => Number.isFinite(n));
  }

  private _onTap(ids: string[]): void {
    if (this._config.tap_action) runAction(this, this._config.tap_action, ids[0]);
    else if (ids.length === 1) moreInfo(this, ids[0]);
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const ids = this._ids;
    const mode = this._mode(ids);
    const color = c.color || defaultColor(ids);
    const first = this.hass.states[ids[0]];
    const unit = c.unit ?? (mode === 'count' ? '' : c.attribute ? '' : first?.attributes.unit_of_measurement || '');

    let value = '—';
    let total: number | undefined;
    let ratio = 0;
    let active = 0;

    if (mode === 'count') {
      const avail = ids.filter((e) => !isUnavailable(this.hass!.states[e]));
      active = avail.filter((e) => isActive(this.hass!.states[e])).length;
      total = avail.length;
      value = String(active);
      ratio = total ? active / total : 0;
    } else {
      const nums = this._numbers(ids);
      if (nums.length) {
        const n = mode === 'sum' ? nums.reduce((a, b) => a + b, 0) : mode === 'average' ? nums.reduce((a, b) => a + b, 0) / nums.length : nums[0];
        value = formatNumber(this.hass, n, c.decimals ?? (Number.isInteger(n) && mode !== 'average' ? 0 : 1));
        const isTemp = /°/.test(unit);
        const min = c.min ?? (isTemp ? 10 : 0);
        const max = c.max ?? (isTemp ? 35 : 100);
        ratio = Math.min(1, Math.max(0, (n - min) / (max - min || 1)));
      }
    }

    const bar: StatBar = c.bar || (mode === 'count' ? (total && total <= SEGMENT_LIMIT ? 'segments' : 'continuous') : 'continuous');
    const clickable = !!c.tap_action || ids.length === 1;

    return html`<ha-card class=${clickable ? 'clickable' : ''} @click=${() => clickable && this._onTap(ids)}>
      <div class="top">
        <span class="lbl">${c.name || (ids.length === 1 ? first?.attributes.friendly_name : '') || ''}</span>
        ${c.icon ? html`<ha-icon .icon=${c.icon}></ha-icon>` : nothing}
      </div>
      <div class="big">
        ${value}${unit && value !== '—' ? html`<span class="unit">${unit.startsWith('°') ? unit : ` ${unit}`}</span>` : nothing}
        ${total !== undefined ? html`<span class="of">/ ${total}</span>` : nothing}
      </div>
      ${bar === 'segments' && total
        ? html`<div class="segs">${Array.from({ length: total }, (_, i) => html`<i style=${i < active ? `background:${color}` : ''}></i>`)}</div>`
        : bar === 'continuous'
          ? html`<div class="bar"><i style="width:${ratio * 100}%;background:${color}"></i></div>`
          : nothing}
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 14px 16px;
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.clickable {
        cursor: pointer;
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
        flex: none;
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
        line-height: 1.25;
        margin-top: 2px;
        color: var(--_tx);
        white-space: nowrap;
      }
      .unit {
        font-size: 18px;
      }
      .of {
        font-size: 14px;
        color: var(--_tx2);
        margin-left: 4px;
      }
      .bar {
        height: 5px;
        border-radius: 3px;
        background: var(--_line);
        overflow: hidden;
        margin-top: 8px;
      }
      .bar > i {
        display: block;
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s;
      }
      .segs {
        display: flex;
        gap: 4px;
        margin-top: 8px;
      }
      .segs i {
        flex: 1;
        height: 5px;
        border-radius: 3px;
        background: var(--_line);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-stat-card': InventaStatCard;
  }
}
