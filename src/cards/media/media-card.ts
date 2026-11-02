// Reproductor / TV: carátula, título, controles (anterior, reproducir /
// pausar, siguiente), volumen y encendido. Solo se muestran los controles que
// el equipo admite. Mantener presionado abre "más información".

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { entityName, isUnavailable, moreInfo, stateText } from '../../ha';

export interface MediaCardConfig {
  type: string;
  entity: string;
  name?: string;
}

// supported_features de media_player
const PAUSE = 1;
const VOLUME_SET = 4;
const PREVIOUS = 16;
const NEXT = 32;
const TURN_ON = 128;
const TURN_OFF = 256;
const PLAY = 16384;

@customElement('inventa-media-card')
export class InventaMediaCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: MediaCardConfig;
  @state() private _vol?: number;
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<MediaCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('media_player.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'media_player' } } },
        { name: 'name', selector: { text: {} } },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: MediaCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `media_player.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  private _svc(e: Event, service: string, data: Record<string, any> = {}): void {
    stop(e);
    this.hass?.callService('media_player', service, { entity_id: this._config.entity, ...data });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const a = st?.attributes || {};
    const f = Number(a.supported_features || 0);
    const off = !na && (st.state === 'off' || st.state === 'standby');
    const playing = st?.state === 'playing';
    const name = entityName(this.hass, c.entity, c.name);
    const title = a.media_title || '';
    const sub = [a.app_name || a.source, a.media_artist || a.media_series_title].filter(Boolean).join(' · ');
    const line = na ? t(this.hass, 'unavailable') : off ? stateText(this.hass, st) : [sub, title].filter(Boolean).join(' · ') || stateText(this.hass, st);
    const vol = this._vol ?? (typeof a.volume_level === 'number' ? Math.round(a.volume_level * 100) : undefined);
    const art = a.entity_picture as string | undefined;
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
        <div class="art">${art && !off ? html`<img src=${art} alt="" />` : html`<ha-icon icon="mdi:television"></ha-icon>`}</div>
        <div class="info">
          <div class="n">${name}</div>
          <div class="muted">${line}</div>
        </div>
        ${!na && f & (TURN_ON | TURN_OFF)
          ? html`<button
              class="icon-btn power ${off ? '' : 'on'}"
              aria-label=${t(this.hass, off ? 'turn_on' : 'turn_off')}
              @pointerdown=${stop}
              @click=${(e: Event) => this._svc(e, off ? 'turn_on' : 'turn_off')}
            >
              <ha-icon icon="mdi:power"></ha-icon>
            </button>`
          : nothing}
      </div>
      ${na || off
        ? nothing
        : html`<div class="ctl">
              ${f & PREVIOUS
                ? html`<button class="icon-btn" aria-label=${t(this.hass, 'previous')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, 'media_previous_track')}>
                    <ha-icon icon="mdi:skip-previous"></ha-icon>
                  </button>`
                : nothing}
              ${f & (PLAY | PAUSE)
                ? html`<button class="icon-btn main" aria-label=${t(this.hass, playing ? 'pause' : 'play')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, 'media_play_pause')}>
                    <ha-icon .icon=${playing ? 'mdi:pause' : 'mdi:play'}></ha-icon>
                  </button>`
                : nothing}
              ${f & NEXT
                ? html`<button class="icon-btn" aria-label=${t(this.hass, 'next')} @pointerdown=${stop} @click=${(e: Event) => this._svc(e, 'media_next_track')}>
                    <ha-icon icon="mdi:skip-next"></ha-icon>
                  </button>`
                : nothing}
            </div>
            ${f & VOLUME_SET && vol !== undefined
              ? html`<div class="vol">
                  <ha-icon icon="mdi:volume-high"></ha-icon>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    .value=${String(vol)}
                    style="--pct:${vol}%"
                    aria-label=${t(this.hass, 'volume')}
                    @pointerdown=${stop}
                    @click=${stop}
                    @input=${(e: Event) => (this._vol = Number((e.target as HTMLInputElement).value))}
                    @change=${(e: Event) => {
                      this._vol = undefined;
                      this._svc(e, 'volume_set', { volume_level: Number((e.target as HTMLInputElement).value) / 100 });
                    }}
                  />
                  <span class="muted">${vol}</span>
                </div>`
              : nothing}`}
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
        gap: 12px;
      }
      .art {
        width: 56px;
        height: 56px;
        flex: none;
        border-radius: 12px;
        overflow: hidden;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--_acc), var(--ic-pur, #a78bfa));
        color: #fff;
        --mdc-icon-size: 26px;
      }
      .art img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .info {
        flex: 1;
        min-width: 0;
      }
      .n {
        font-weight: 500;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .muted {
        color: var(--_tx3);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .power.on {
        color: var(--_acc);
      }
      .ctl {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 14px;
        margin-top: 10px;
      }
      .main {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
        --mdc-icon-size: 22px;
      }
      .main:hover {
        color: #fff;
      }
      .vol {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        --mdc-icon-size: 18px;
      }
      .vol ha-icon {
        color: var(--_tx3);
      }
      .vol input {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 5px;
        border-radius: 3px;
        background: linear-gradient(to right, var(--_acc) var(--pct), var(--_line) var(--pct));
        cursor: pointer;
      }
      .vol input::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--_tx);
        border: 2px solid var(--_card);
      }
      .vol input::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--_tx);
        border: 2px solid var(--_card);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-media-card': InventaMediaCard;
  }
}
