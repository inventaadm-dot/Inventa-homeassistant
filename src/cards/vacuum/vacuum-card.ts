// Aspiradora (y cortacésped): estado, batería y acciones (iniciar, pausar,
// detener, volver a la base). Solo se muestran las acciones que admite.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { domain, entityName, isUnavailable, moreInfo, relativeTime, stateText } from '../../ha';

export interface VacuumCardConfig {
  type: string;
  entity: string;
  name?: string;
}

// supported_features de vacuum
const PAUSE = 4;
const STOP = 8;
const RETURN_HOME = 16;
const START = 8192;

@customElement('inventa-vacuum-card')
export class InventaVacuumCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: VacuumCardConfig;
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<VacuumCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('vacuum.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: ['vacuum', 'lawn_mower'] } } },
        { name: 'name', selector: { text: {} } },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: VacuumCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `vacuum.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
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

  private _svc(e: Event, service: string): void {
    stop(e);
    this.hass?.callService(domain(this._config.entity), service, { entity_id: this._config.entity });
  }

  /** Nivel de batería: atributo de la aspiradora o sensor de batería del mismo dispositivo. */
  private _battery(): number | undefined {
    const st = this.hass?.states[this._config.entity];
    if (typeof st?.attributes.battery_level === 'number') return st.attributes.battery_level;
    const dev = this.hass?.entities?.[this._config.entity]?.device_id;
    if (!dev || !this.hass?.entities) return undefined;
    const b = Object.values(this.hass.entities).find(
      (e) => e.device_id === dev && this.hass!.states[e.entity_id]?.attributes.device_class === 'battery' && e.entity_id.startsWith('sensor.'),
    );
    const v = b ? parseFloat(this.hass.states[b.entity_id].state) : NaN;
    return Number.isFinite(v) ? v : undefined;
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const f = Number(st?.attributes.supported_features || 0);
    const mower = domain(c.entity) === 'lawn_mower';
    const working = ['cleaning', 'mowing'].includes(st?.state);
    const battery = this._battery();
    const status = na ? t(this.hass, 'unavailable') : `${stateText(this.hass, st)}${working ? ` · ${relativeTime(this.hass, st.last_changed)}` : ''}`;
    const p = this._press;
    // lawn_mower usa otros servicios y no informa supported_features igual.
    const start = mower ? 'start_mowing' : 'start';
    const ret = mower ? 'dock' : 'return_to_base';
    const can = (bit: number) => mower || f & bit;

    return html`<ha-card
      class=${na ? 'na' : ''}
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
    >
      <div class="top">
        <div class="ttl ${working ? 'on' : ''}">
          <ha-icon .icon=${mower ? 'mdi:robot-mower-outline' : 'mdi:robot-vacuum'}></ha-icon><span>${entityName(this.hass, c.entity, c.name)}</span>
        </div>
        ${battery !== undefined ? html`<span class="muted">${t(this.hass, 'battery')} ${Math.round(battery)} %</span>` : nothing}
      </div>
      <div class="muted status">${status}</div>
      ${na
        ? nothing
        : html`<div class="btns">
            ${can(STOP)
              ? html`<button class="icon-btn" aria-label=${t(this.hass, 'stop')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, mower ? 'pause' : 'stop')}>
                  <ha-icon icon="mdi:stop"></ha-icon>
                </button>`
              : nothing}
            ${working && can(PAUSE)
              ? html`<button class="icon-btn" aria-label=${t(this.hass, 'pause')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, 'pause')}>
                  <ha-icon icon="mdi:pause"></ha-icon>
                </button>`
              : can(START)
                ? html`<button class="icon-btn main" aria-label=${t(this.hass, 'play')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, start)}>
                    <ha-icon icon="mdi:play"></ha-icon>
                  </button>`
                : nothing}
            ${can(RETURN_HOME)
              ? html`<button class="icon-btn" aria-label=${t(this.hass, 'return_home')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, ret)}>
                  <ha-icon icon="mdi:home-import-outline"></ha-icon>
                </button>`
              : nothing}
          </div>`}
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 14px 16px;
        user-select: none;
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.na {
        opacity: 0.6;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .ttl {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        font-weight: 500;
        color: var(--_tx);
        --mdc-icon-size: 20px;
      }
      .ttl ha-icon {
        color: var(--_tx3);
        flex: none;
      }
      .ttl.on ha-icon {
        color: var(--_acc);
      }
      .ttl span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .muted {
        color: var(--_tx3);
        font-size: 12px;
        white-space: nowrap;
      }
      .status {
        margin: 6px 0 10px;
      }
      .btns {
        display: flex;
        gap: 10px;
      }
      .main {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .main:hover {
        color: #fff;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-vacuum-card': InventaVacuumCard;
  }
}
