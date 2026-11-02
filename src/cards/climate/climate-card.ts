// Clima / termostato (diseño del Corporate Dashboard): anillo con el objetivo
// y el rango, píldora con la temperatura actual entre los botones +/–, una línea
// de advertencia ("4.5 °C sobre el objetivo · revisar equipo"), botones de
// encendido/apagado y los presets del equipo (Auto, Manual…).
//
// Equipos que reportan mal (p. ej. Tuya, que informa 20 °C como 4) se corrigen
// solos (ver climate-scale.ts). `scale` fuerza el factor: el valor mostrado es
// el informado × `scale` y al cambiar el objetivo se envía dividido; 1 lo desactiva.

import { LitElement, html, svg, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { entityName, formatNumber, isUnavailable, moreInfo } from '../../ha';
import { climateRaw, climateTemp } from '../../climate-scale';

export interface ClimateCardConfig {
  type: string;
  entity: string;
  name?: string;
  scale?: number;
  /** Diferencia (°C sobre el objetivo) desde la que se advierte "revisar equipo". */
  alert?: number;
  /** Rango del anillo (por defecto 16–32 °C, dentro del rango del equipo). */
  min?: number;
  max?: number;
}

const COMFORT = 1; // ± grados para "Confortable"
const ALERT = 3;
const SEND_DELAY = 700;
/** Modo de encendido preferido entre los que ofrece el equipo. */
const ON_MODES = ['heat_cool', 'heat', 'cool', 'auto', 'fan_only', 'dry'];
const MODE_ICON: Record<string, string> = { heat: 'mdi:fire', cool: 'mdi:snowflake', dry: 'mdi:water-percent', fan_only: 'mdi:fan', auto: 'mdi:thermostat-auto' };

// Anillo de 270° (de 135° a 405°) en un lienzo de 120 × 104.
const R = 46;
const C = 60;
const pt = (a: number) => [C + R * Math.cos((a * Math.PI) / 180), C + R * Math.sin((a * Math.PI) / 180)];
function arc(a1: number, a2: number): string {
  if (a2 < a1) [a1, a2] = [a2, a1];
  const [x1, y1] = pt(a1);
  const [x2, y2] = pt(a2);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

@customElement('inventa-climate-card')
export class InventaClimateCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: ClimateCardConfig;
  /** Objetivo pendiente de enviar (mientras se pulsan +/–). */
  @state() private _pending?: number;
  private _timer?: number;
  /** Tocar no abre nada (se usan los botones); mantener presionado abre "más información". */
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<ClimateCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('climate.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'climate' } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'alert', selector: { number: { min: 1, max: 15, step: 0.5, mode: 'box' } } },
            { name: 'min', selector: { number: { min: -10, max: 40, mode: 'box' } } },
            { name: 'max', selector: { number: { min: 0, max: 60, mode: 'box' } } },
            { name: 'scale', selector: { number: { min: 0.1, max: 100, step: 0.1, mode: 'box' } } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', min: 'ring_min', max: 'ring_max' }),
    };
  }

  public setConfig(config: ClimateCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `climate.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 4, rows: 'auto' };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._flush();
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  /** Temperatura real de un atributo (corrige equipos que reportan mal). */
  private _num(attr: string): number | undefined {
    return climateTemp(this.hass, this.hass?.states[this._config.entity], attr, this._config.scale);
  }

  private _step(delta: number, e: Event): void {
    e.stopPropagation();
    const st = this.hass?.states[this._config.entity];
    if (!st) return;
    const a = st.attributes;
    const step = Number(a.target_temp_step) || 0.5;
    const current = this._pending ?? this._num('temperature');
    if (current === undefined) return;
    const min = this._num('min_temp') ?? 7;
    const max = this._num('max_temp') ?? 35;
    this._pending = Math.min(max, Math.max(min, Math.round((current + delta * step) / step) * step));
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(() => this._flush(), SEND_DELAY);
  }

  private _flush(): void {
    window.clearTimeout(this._timer);
    if (this._pending === undefined || !this.hass) return;
    const temperature = climateRaw(this.hass, this.hass.states[this._config.entity], this._pending, this._config.scale);
    this.hass.callService('climate', 'set_temperature', { entity_id: this._config.entity, temperature });
    this._pending = undefined;
  }

  private _mode(mode: string, e: Event): void {
    e.stopPropagation();
    if (this.hass && this.hass.states[this._config.entity]?.state !== mode) {
      this.hass.callService('climate', 'set_hvac_mode', { entity_id: this._config.entity, hvac_mode: mode });
    }
  }

  private _preset(preset: string, e: Event): void {
    e.stopPropagation();
    this.hass?.callService('climate', 'set_preset_mode', { entity_id: this._config.entity, preset_mode: preset });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const h = this.hass;
    const st = h.states[c.entity];
    const name = entityName(h, c.entity, c.name);
    const p = this._press;
    if (isUnavailable(st)) {
      return html`<ha-card class="na" @contextmenu=${p.menu} @pointerdown=${p.down} @pointerup=${p.cancel} @click=${p.click}>
        <div class="top"><span class="name">${name}</span><span class="pill na">${t(h, 'unavailable')}</span></div>
        <div class="line">${t(h, 'cl_dev_na')}</div>
      </ha-card>`;
    }

    const a = st.attributes;
    const on = st.state !== 'off';
    const low = this._num('target_temp_low');
    const high = this._num('target_temp_high');
    const target = this._pending ?? this._num('temperature') ?? (low !== undefined && high !== undefined ? (low + high) / 2 : undefined);
    const current = this._num('current_temperature');
    const min = c.min ?? Math.max(16, this._num('min_temp') ?? 16);
    let max = c.max ?? Math.min(32, this._num('max_temp') ?? 32);
    if (max <= min) max = min + 1;
    const d = current !== undefined && target !== undefined ? current - target : NaN;
    const comfy = Number.isNaN(d) || Math.abs(d) <= COMFORT;
    const color = !on ? 'var(--_tx3)' : comfy ? 'var(--_ok)' : d > 0 ? 'var(--_heat)' : 'var(--_cyan)';

    // Píldora de estado y línea de advertencia.
    const pill = !on
      ? html`<span class="pill">${t(h, 'climate_off')}</span>`
      : comfy
        ? html`<span class="pill ok">${t(h, 'comfortable')}</span>`
        : d > 0
          ? html`<span class="pill w">${t(h, 'warmer')}</span>`
          : html`<span class="pill cold">${t(h, 'colder')}</span>`;
    const warn = on && d > (c.alert ?? ALERT);
    const diff = Number.isNaN(d) ? '' : formatNumber(h, Math.abs(d), 1);
    const line = !on
      ? t(h, 'cl_dev_off')
      : Number.isNaN(d)
        ? ''
        : comfy
          ? t(h, 'cl_comfort')
          : `${warn ? '⚠ ' : ''}${t(h, d > 0 ? 'cl_above' : 'cl_below', { n: diff })}${warn ? ` · ${t(h, 'cl_check')}` : ''}`;

    // Anillo: arco entre objetivo y actual, punto de la actual y perilla del objetivo.
    const ang = (v: number) => 135 + 270 * Math.max(0, Math.min(1, (v - min) / (max - min)));
    const aT = target !== undefined ? ang(target) : undefined;
    const aC = current !== undefined ? ang(current) : undefined;
    const ring = svg`
      <path d=${arc(135, 405)} fill="none" stroke="var(--_line)" stroke-width="8" stroke-linecap="round" />
      ${on && aT !== undefined && aC !== undefined && Math.abs(aC - aT) > 0.5
        ? svg`<path d=${arc(aT, aC)} fill="none" stroke=${color} stroke-width="8" stroke-linecap="round" />`
        : nothing}
      ${aC !== undefined ? svg`<circle cx=${pt(aC)[0].toFixed(1)} cy=${pt(aC)[1].toFixed(1)} r="3" fill=${color} />` : nothing}
      ${aT !== undefined
        ? svg`<circle cx=${pt(aT)[0].toFixed(1)} cy=${pt(aT)[1].toFixed(1)} r="6" fill="var(--_card)" stroke=${on ? 'var(--_tx)' : 'var(--_tx3)'} stroke-width="2.5" />`
        : nothing}
      <text x="60" y="47" text-anchor="middle" font-size="9" fill="var(--_tx3)">${t(h, 'target')}</text>
      <text x="60" y="72" text-anchor="middle" font-size="26" font-weight="500" class=${this._pending !== undefined ? 'pending' : ''} fill=${on ? 'var(--_tx)' : 'var(--_tx3)'}>${target !== undefined ? `${formatNumber(h, target, 1)}°` : '—'}</text>
      <text x="25" y="102" text-anchor="middle" font-size="8" fill="var(--_tx3)">${formatNumber(h, min, 0)}°</text>
      <text x="95" y="102" text-anchor="middle" font-size="8" fill="var(--_tx3)">${formatNumber(h, max, 0)}°</text>`;

    // Encendido / apagado y presets (solo los que ofrece el equipo).
    const modes: string[] = a.hvac_modes || [];
    const onMode = ON_MODES.find((m) => modes.includes(m)) || modes.find((m) => m !== 'off');
    const shownMode = on && modes.includes(st.state) ? st.state : onMode;
    const presets: string[] = (a.preset_modes || []).filter((m: string) => m !== 'none').slice(0, 4);
    const presetName = (m: string) => h.formatEntityAttributeValue?.(st, 'preset_mode', m) || m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ');
    const canStep = on && target !== undefined && a.temperature != null;

    return html`<ha-card
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @pointercancel=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
    >
      <div class="top"><span class="name">${name}</span>${pill}</div>
      <svg class="gauge" viewBox="0 0 120 104" role="img" aria-label=${`${t(h, 'target')} ${target ?? '—'}°`}>${ring}</svg>
      <div class="ctl">
        <button class="icon-btn" ?disabled=${!canStep} aria-label="−" @pointerdown=${stop} @click=${(e: Event) => this._step(-1, e)}>
          <ha-icon icon="mdi:minus"></ha-icon>
        </button>
        <div class="now">
          <ha-icon icon="mdi:thermometer" style=${`color:${color}`}></ha-icon>
          ${t(h, 'cl_actual')} <b>${current !== undefined ? `${formatNumber(h, current, 1)}°` : '—'}</b>
        </div>
        <button class="icon-btn" ?disabled=${!canStep} aria-label="+" @pointerdown=${stop} @click=${(e: Event) => this._step(1, e)}>
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
      </div>
      <div class="line ${warn ? 'warn' : ''}">${line}</div>
      ${modes.length
        ? html`<div class="modes">
            ${modes.includes('off')
              ? html`<button class="mode ${on ? '' : 'on'}" aria-pressed=${on ? 'false' : 'true'} @pointerdown=${stop} @click=${(e: Event) => this._mode('off', e)}>
                  <ha-icon icon="mdi:power"></ha-icon>${t(h, 'hvac_off')}
                </button>`
              : nothing}
            ${shownMode && shownMode !== 'off'
              ? html`<button class="mode ${on ? 'on' : ''}" aria-pressed=${on ? 'true' : 'false'} @pointerdown=${stop} @click=${(e: Event) => this._mode(shownMode, e)}>
                  <ha-icon .icon=${MODE_ICON[shownMode] || 'mdi:autorenew'}></ha-icon>${t(h, `hvac_${shownMode}` as any) || shownMode}
                </button>`
              : nothing}
          </div>`
        : nothing}
      ${presets.length
        ? html`<div class="presets" style=${`--n:${presets.length}`}>
            ${presets.map(
              (m) => html`<button class="preset ${a.preset_mode === m ? 'on' : ''}" aria-pressed=${a.preset_mode === m ? 'true' : 'false'} @pointerdown=${stop} @click=${(e: Event) => this._preset(m, e)}>
                ${presetName(m)}
              </button>`,
            )}
          </div>`
        : nothing}
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 14px 16px;
        user-select: none;
      }
      ha-card.na {
        opacity: 0.7;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .name {
        font-size: 14px;
        font-weight: 500;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pill.cold {
        color: var(--_cyan);
      }
      .gauge {
        display: block;
        width: 170px;
        max-width: 100%;
        height: auto;
        margin: 8px auto 0;
      }
      .gauge text {
        font-family: inherit;
      }
      .gauge .pending {
        fill: var(--_acc);
      }
      .ctl {
        display: grid;
        grid-template-columns: 36px minmax(0, 1fr) 36px;
        gap: 10px;
        align-items: center;
        margin-top: 6px;
      }
      .ctl .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }
      .icon-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .now {
        height: 36px;
        border-radius: 999px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 12px;
        color: var(--_tx2);
        white-space: nowrap;
        overflow: hidden;
        --mdc-icon-size: 16px;
      }
      .now b {
        font-weight: 500;
        color: var(--_tx);
      }
      .line {
        min-height: 16px;
        margin: 10px 0 2px;
        text-align: center;
        font-size: 11px;
        color: var(--_tx3);
      }
      .line.warn {
        color: var(--_amb);
      }
      .modes {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
        gap: 6px;
        margin-top: 8px;
      }
      .presets {
        display: grid;
        grid-template-columns: repeat(var(--n), minmax(0, 1fr));
        gap: 6px;
        margin-top: 8px;
      }
      .mode,
      .preset {
        font: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-width: 0;
        padding: 0 6px;
        border: 1px solid var(--_line);
        background: var(--_card2);
        color: var(--_tx2);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mode {
        height: 32px;
        border-radius: 10px;
        font-size: 11px;
        --mdc-icon-size: 14px;
      }
      .mode.on {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .preset {
        height: 28px;
        border-radius: 8px;
        font-size: 11px;
      }
      .preset.on {
        border-color: var(--_acc);
        color: var(--_acc);
      }
      .mode:focus-visible,
      .preset:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-climate-card': InventaClimateCard;
  }
}
