// Persiana / cortina / portón: posición arrastrable y botones subir / detener
// / bajar. Los controles que el equipo no admite no se muestran.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { domainIcon, entityName, isUnavailable, moreInfo, stateText } from '../../ha';

export interface CoverCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
}

// supported_features de cover
const OPEN = 1;
const CLOSE = 2;
const SET_POSITION = 4;
const STOP = 8;

@customElement('inventa-cover-card')
export class InventaCoverCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: CoverCardConfig;
  @state() private _drag?: number;
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<CoverCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('cover.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'cover' } } },
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

  public setConfig(config: CoverCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `cover.*`');
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

  private _call(service: string, data: Record<string, any> = {}): void {
    this.hass?.callService('cover', service, { entity_id: this._config.entity, ...data });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const f = Number(st?.attributes.supported_features || 0);
    const pos = this._drag ?? (typeof st?.attributes.current_position === 'number' ? st.attributes.current_position : undefined);
    const name = entityName(this.hass, c.entity, c.name);
    const status = na ? t(this.hass, 'unavailable') : `${stateText(this.hass, st)}${pos !== undefined ? ` ${pos} %` : ''}`;
    const p = this._press;

    return html`<ha-card
      class=${na ? 'na' : ''}
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
    >
      <div class="top">
        <div class="ttl"><ha-icon .icon=${c.icon || domainIcon(c.entity, st)}></ha-icon><span>${name}</span></div>
        <span class="muted">${status}</span>
      </div>
      ${f & SET_POSITION && !na
        ? html`<div class="slider" style="--pct:${pos ?? 0}%">
            <input
              type="range"
              min="0"
              max="100"
              .value=${String(pos ?? 0)}
              aria-label=${`${name} %`}
              @pointerdown=${stop}
              @click=${stop}
              @input=${(e: Event) => (this._drag = Number((e.target as HTMLInputElement).value))}
              @change=${(e: Event) => {
                this._drag = undefined;
                this._call('set_cover_position', { position: Number((e.target as HTMLInputElement).value) });
              }}
            />
            <span>${pos ?? 0} %</span>
          </div>`
        : nothing}
      <div class="btns">
        ${f & OPEN || !f
          ? html`<button class="icon-btn" ?disabled=${na} aria-label=${t(this.hass, 'open')} @pointerdown=${stop} @click=${(e: Event) => (stop(e), this._call('open_cover'))}>
              <ha-icon icon="mdi:arrow-up"></ha-icon>
            </button>`
          : nothing}
        ${f & STOP
          ? html`<button class="icon-btn" ?disabled=${na} aria-label=${t(this.hass, 'stop')} @pointerdown=${stop} @click=${(e: Event) => (stop(e), this._call('stop_cover'))}>
              <ha-icon icon="mdi:stop"></ha-icon>
            </button>`
          : nothing}
        ${f & CLOSE || !f
          ? html`<button class="icon-btn" ?disabled=${na} aria-label=${t(this.hass, 'close_cover')} @pointerdown=${stop} @click=${(e: Event) => (stop(e), this._call('close_cover'))}>
              <ha-icon icon="mdi:arrow-down"></ha-icon>
            </button>`
          : nothing}
      </div>
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
        color: var(--_acc);
        flex: none;
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
      .slider {
        position: relative;
        height: 28px;
        margin: 12px 0 10px;
        border-radius: 9px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        overflow: hidden;
      }
      .slider::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--pct);
        background: color-mix(in srgb, var(--_acc) 30%, transparent);
        border-right: 2px solid var(--_acc);
        pointer-events: none;
      }
      .slider input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .slider span {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        color: var(--_tx);
        pointer-events: none;
      }
      .btns {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 10px;
      }
      .icon-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-cover-card': InventaCoverCard;
  }
}
