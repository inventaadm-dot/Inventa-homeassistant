// Cámara: imagen en vivo (se refresca cada pocos segundos), "En vivo",
// indicador de movimiento y estado de conexión. Tocar abre la vista de HA con
// el video.
//
// La imagen sale del `entity_picture` de la cámara (`/api/camera_proxy/...`
// con su token), que HA renueva solo. El sensor de movimiento se toma de
// `motion_entity` o, si no se indica, de un sensor de movimiento del mismo
// dispositivo.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { entityName, isUnavailable, moreInfo, relativeTime } from '../../ha';

export interface CameraCardConfig {
  type: string;
  entity: string;
  name?: string;
  motion_entity?: string;
  /** Segundos entre imágenes (por defecto 10). */
  refresh?: number;
}

@customElement('inventa-camera-card')
export class InventaCameraCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: CameraCardConfig;
  @state() private _tick = Date.now();
  @state() private _broken = false;
  private _timer?: number;

  public static getStubConfig(hass?: HomeAssistant): Partial<CameraCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('camera.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'camera' } } },
        { name: 'name', selector: { text: {} } },
        { name: 'motion_entity', selector: { entity: { domain: 'binary_sensor' } } },
        { name: 'refresh', selector: { number: { min: 2, max: 300, mode: 'box' } } },
      ],
      computeLabel: labeler({ name: 'card_name', motion_entity: 'motion_entity', refresh: 'refresh_seconds' }),
    };
  }

  public setConfig(config: CameraCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `camera.*`');
    this._config = { refresh: 10, ...config };
  }

  public getCardSize(): number {
    return 5;
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._schedule();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
  }

  private _schedule(): void {
    window.clearInterval(this._timer);
    // Solo refrescar mientras la pestaña está visible.
    this._timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') this._tick = Date.now();
    }, (this._config?.refresh || 10) * 1000);
  }

  /** Sensor de movimiento: el indicado o uno del mismo dispositivo. */
  private _motion(): string | undefined {
    if (this._config.motion_entity) return this._config.motion_entity;
    const dev = this.hass?.entities?.[this._config.entity]?.device_id;
    if (!dev || !this.hass?.entities) return undefined;
    return Object.values(this.hass.entities).find(
      (e) =>
        e.device_id === dev &&
        e.entity_id.startsWith('binary_sensor.') &&
        ['motion', 'occupancy', 'presence'].includes(this.hass!.states[e.entity_id]?.attributes.device_class),
    )?.entity_id;
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    const m = this._motion();
    return (
      !old ||
      old.states[this._config.entity] !== this.hass?.states[this._config.entity] ||
      (!!m && old.states[m] !== this.hass?.states[m]) ||
      old.locale?.language !== this.hass?.locale?.language
    );
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
    if (changed.has('_config')) this._schedule();
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const pic = st?.attributes.entity_picture as string | undefined;
    const src = pic && !na ? `${pic}${pic.includes('?') ? '&' : '?'}_=${this._tick}` : '';
    const mId = this._motion();
    const motion = mId ? this.hass.states[mId] : undefined;
    const moving = motion?.state === 'on';
    const lastMotion = motion && !isUnavailable(motion) ? relativeTime(this.hass, motion.last_changed) : '—';

    return html`<ha-card @click=${() => moreInfo(this, c.entity)}>
      <div class="img">
        ${src && !this._broken
          ? html`<img src=${src} alt=${entityName(this.hass, c.entity, c.name)} @error=${() => (this._broken = true)} @load=${() => (this._broken = false)} />`
          : nothing}
        ${na || !src || this._broken
          ? html`<span class="pill na center">${t(this.hass, 'unavailable')}</span>`
          : html`<span class="pill live"><span class="dot"></span>${t(this.hass, 'live')}</span>`}
        ${moving ? html`<span class="pill w mo">${t(this.hass, 'motion')}</span>` : nothing}
      </div>
      <div class="ft">
        <span class="n">${entityName(this.hass, c.entity, c.name)}</span>
        <span class="muted">${mId ? lastMotion : ''}</span>
      </div>
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        overflow: hidden;
        cursor: pointer;
        padding: 0;
      }
      .img {
        position: relative;
        aspect-ratio: 16 / 9;
        background: linear-gradient(135deg, #1e293b, #0f172a 60%, #334155);
        display: grid;
        place-items: center;
      }
      .img img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .pill {
        position: absolute;
        z-index: 1;
      }
      .live {
        top: 10px;
        left: 10px;
        background: rgba(15, 23, 42, 0.7);
        color: #e6edf7;
      }
      .mo {
        top: 10px;
        right: 10px;
      }
      .center {
        position: static;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--_ok);
        display: inline-block;
      }
      .ft {
        padding: 10px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .n {
        color: var(--_tx);
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .muted {
        color: var(--_tx3);
        font-size: 12px;
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-camera-card': InventaCameraCard;
  }
}
