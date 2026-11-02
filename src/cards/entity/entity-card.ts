// Tarjeta genérica: sirve para cualquier entidad. Ícono, nombre y estado; si
// la entidad se puede encender/apagar, tocar la tarjeta la enciende o apaga;
// mantener presionado abre "más información" (si no se puede encender,
// tocar abre "más información"). El panel Inventa la usa para los tipos que aún no
// tienen tarjeta propia, así cualquier equipo se puede mostrar desde ya.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press } from '../../gestures';
import { TOGGLEABLE, domain, domainIcon, entityName, isActive, isUnavailable, moreInfo, stateText } from '../../ha';

export interface EntityCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
}

@customElement('inventa-entity-card')
export class InventaEntityCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: EntityCardConfig;
  private _press = new Press(
    () => (this._canToggle() ? this._toggle() : moreInfo(this, this._config.entity)),
    () => moreInfo(this, this._config.entity),
  );

  private _canToggle(): boolean {
    const st = this.hass?.states[this._config.entity];
    return !isUnavailable(st) && TOGGLEABLE.includes(domain(this._config.entity));
  }

  public static getStubConfig(hass?: HomeAssistant): Partial<EntityCardConfig> {
    return { entity: Object.keys(hass?.states || {})[0] || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: {} } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', entity: 'entity' }),
    };
  }

  public setConfig(config: EntityCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad');
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

  private _toggle(): void {
    this.hass?.callService('homeassistant', 'toggle', { entity_id: this._config.entity });
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const canToggle = !na && TOGGLEABLE.includes(domain(c.entity));
    const on = canToggle && isActive(st);
    const name = entityName(this.hass, c.entity, c.name);
    const status = !st ? t(this.hass, 'unavailable') : na ? t(this.hass, 'unavailable') : stateText(this.hass, st);
    const icon = c.icon || domainIcon(c.entity, st);

    const p = this._press;
    return html`<ha-card
      class="${on ? 'on' : ''} ${na ? 'na' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${canToggle ? (on ? 'true' : 'false') : nothing}
      aria-label=${`${name}: ${status}`}
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @pointercancel=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
      @keydown=${p.key}
    >
      <div class="row">
        <div class="ico"><ha-icon .icon=${icon}></ha-icon></div>
        <div class="info">
          <div class="n">${name}</div>
          <div class="s">${status}</div>
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
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.on {
        border-color: color-mix(in srgb, var(--_acc) 45%, var(--_line));
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
      .on .ico {
        background: color-mix(in srgb, var(--_acc) 18%, var(--_card2));
        color: var(--_acc);
      }
      ha-card:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
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
    'inventa-entity-card': InventaEntityCard;
  }
}
