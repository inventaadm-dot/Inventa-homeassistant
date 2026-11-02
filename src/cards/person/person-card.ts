// Presencia: avatar (foto o iniciales), nombre, en casa / fuera / zona y
// desde cuándo. Funciona con person y device_tracker.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, lang, t } from '../../i18n';
import { tokens } from '../../styles';
import { entityName, isUnavailable, moreInfo } from '../../ha';

export interface PersonCardConfig {
  type: string;
  entity: string;
  name?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

@customElement('inventa-person-card')
export class InventaPersonCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: PersonCardConfig;

  public static getStubConfig(hass?: HomeAssistant): Partial<PersonCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('person.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: ['person', 'device_tracker'] } } },
        { name: 'name', selector: { text: {} } },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: PersonCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `person.*`');
    this._config = config;
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 3, rows: 1 };
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
    const name = entityName(this.hass, c.entity, c.name);
    const na = isUnavailable(st);
    const home = st?.state === 'home';
    const zone = !na && !home && st?.state !== 'not_home' ? st?.state : undefined;
    const since = st ? new Date(st.last_changed).toLocaleTimeString(lang(this.hass), { hour: '2-digit', minute: '2-digit' }) : '';
    const status = na
      ? t(this.hass, 'unavailable')
      : home
        ? t(this.hass, 'at_home')
        : zone
          ? `${this.hass.states[`zone.${zone}`]?.attributes.friendly_name || zone} · ${t(this.hass, 'since')} ${since}`
          : `${t(this.hass, 'away')} · ${t(this.hass, 'since')} ${since}`;
    const pic = st?.attributes.entity_picture;

    return html`<ha-card class=${na ? 'na' : ''} @click=${() => moreInfo(this, c.entity)}>
      <div class="row">
        <div class="av ${home ? 'home' : zone ? 'zone' : ''}">
          ${pic ? html`<img src=${pic} alt="" />` : html`<span>${initials(name)}</span>`}
        </div>
        <div class="info">
          <div class="n">${name}</div>
          <div class="s ${home ? 'ok' : ''}">${status}</div>
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
        gap: 12px;
        height: 100%;
      }
      .av {
        position: relative;
        width: 38px;
        height: 38px;
        flex: none;
        border-radius: 50%;
        background: var(--_card2);
        display: grid;
        place-items: center;
        font-weight: 600;
        font-size: 13px;
        color: var(--_tx2);
      }
      .av img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      .av::after {
        content: '';
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: var(--_tx3);
        border: 2px solid var(--_card);
      }
      .av.home::after {
        background: var(--_ok);
      }
      .av.zone::after {
        background: var(--_acc);
      }
      .info {
        min-width: 0;
      }
      .n {
        font-size: 14px;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .s {
        font-size: 12px;
        color: var(--_tx3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .s.ok {
        color: var(--_ok);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-person-card': InventaPersonCard;
  }
}
