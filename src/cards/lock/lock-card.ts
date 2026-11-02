// Cerradura: estado claro (verde cerrada, ámbar abierta, rojo trabada) y
// botón Abrir / Cerrar. Abrir pide confirmación (y el código, si la
// cerradura lo exige). Mantener presionado abre "más información".

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { entityName, isUnavailable, moreInfo, relativeTime, stateText } from '../../ha';

export interface LockCardConfig {
  type: string;
  entity: string;
  name?: string;
  /** Pedir confirmación al abrir (por defecto sí). */
  confirm?: boolean;
}

@customElement('inventa-lock-card')
export class InventaLockCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: LockCardConfig;
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<LockCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('lock.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'lock' } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'confirm', selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', confirm: 'ask_confirm' }),
    };
  }

  public setConfig(config: LockCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `lock.*`');
    this._config = { confirm: true, ...config };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 4, rows: 1 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  private _act(e: Event, service: 'lock' | 'unlock'): void {
    stop(e);
    const c = this._config;
    const st = this.hass?.states[c.entity];
    const name = entityName(this.hass, c.entity, c.name);
    if (service === 'unlock' && c.confirm !== false && !window.confirm(t(this.hass, 'confirm_unlock', { name }))) return;
    const data: Record<string, any> = { entity_id: c.entity };
    if (st?.attributes.code_format) {
      const code = window.prompt(t(this.hass, 'enter_code'));
      if (code === null) return;
      data.code = code;
    }
    this.hass?.callService('lock', service, data);
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const s = st?.state;
    const level = na ? '' : s === 'locked' ? 'ok' : s === 'jammed' ? 'alert' : 'warn';
    const icon = s === 'locked' ? 'mdi:lock-outline' : s === 'jammed' ? 'mdi:lock-alert-outline' : 'mdi:lock-open-variant-outline';
    const status = na
      ? t(this.hass, 'unavailable')
      : s === 'unlocked' || s === 'open'
        ? `${stateText(this.hass, st)} · ${relativeTime(this.hass, st.last_changed)}`
        : stateText(this.hass, st);
    const p = this._press;

    return html`<ha-card
      class="${level} ${na ? 'na' : ''}"
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
    >
      <div class="row">
        <div class="ico"><ha-icon .icon=${icon}></ha-icon></div>
        <div class="info">
          <div class="n">${entityName(this.hass, c.entity, c.name)}</div>
          <div class="s">${status}</div>
        </div>
        ${na
          ? nothing
          : s === 'locked'
            ? html`<button class="chip" @pointerdown=${stop} @click=${(e: Event) => this._act(e, 'unlock')}>${t(this.hass, 'open')}</button>`
            : html`<button class="chip" @pointerdown=${stop} @click=${(e: Event) => this._act(e, 'lock')}>${t(this.hass, 'close_cover')}</button>`}
      </div>
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        padding: 12px 14px;
        border-radius: 14px;
        user-select: none;
        height: 100%;
        box-sizing: border-box;
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
      .ok .ico {
        background: var(--_okbg);
        color: var(--_ok);
      }
      .ok .s {
        color: var(--_ok);
      }
      .warn {
        border-color: color-mix(in srgb, var(--_amb) 45%, var(--_line));
      }
      .warn .ico {
        background: var(--_wbg);
        color: var(--_amb);
      }
      .warn .s {
        color: var(--_amb);
      }
      .alert {
        border-color: color-mix(in srgb, var(--_na) 50%, var(--_line));
      }
      .alert .ico {
        background: var(--_nabg);
        color: var(--_na);
      }
      .alert .s {
        color: var(--_na);
      }
      .info {
        flex: 1;
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
      .chip {
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        border-radius: 999px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        color: var(--_tx2);
        cursor: pointer;
        flex: none;
      }
      .chip:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-lock-card': InventaLockCard;
  }
}
