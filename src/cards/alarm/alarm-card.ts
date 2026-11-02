// Alarma: estado y modos (desarmar, en casa, ausente, noche, vacaciones,
// personalizado). Solo se muestran los modos que la alarma admite. Si pide
// código, aparece un campo para ingresarlo.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t, type StringKey } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { entityName, isUnavailable, moreInfo, stateText } from '../../ha';

export interface AlarmCardConfig {
  type: string;
  entity: string;
  name?: string;
}

/** [bit de supported_features, servicio, estado armado, texto] */
const MODES: Array<[number, string, string, StringKey]> = [
  [1, 'alarm_arm_home', 'armed_home', 'alarm_home'],
  [2, 'alarm_arm_away', 'armed_away', 'alarm_away'],
  [4, 'alarm_arm_night', 'armed_night', 'alarm_night'],
  [32, 'alarm_arm_vacation', 'armed_vacation', 'alarm_vacation'],
  [16, 'alarm_arm_custom_bypass', 'armed_custom_bypass', 'alarm_custom'],
];

@customElement('inventa-alarm-card')
export class InventaAlarmCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: AlarmCardConfig;
  @state() private _code = '';
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._config.entity),
  );

  public static getStubConfig(hass?: HomeAssistant): Partial<AlarmCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('alarm_control_panel.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'alarm_control_panel' } } },
        { name: 'name', selector: { text: {} } },
      ],
      computeLabel: labeler({ name: 'card_name' }),
    };
  }

  public setConfig(config: AlarmCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `alarm_control_panel.*`');
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

  private _call(e: Event, service: string): void {
    stop(e);
    const data: Record<string, any> = { entity_id: this._config.entity };
    if (this._code) data.code = this._code;
    this.hass?.callService('alarm_control_panel', service, data);
    this._code = '';
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st);
    const s = st?.state || '';
    const f = Number(st?.attributes.supported_features || 0);
    const pill = na ? 'na' : s === 'disarmed' ? 'ok' : s === 'triggered' ? 'na' : s.startsWith('armed') ? 'arm' : 'w';
    const shield = s === 'disarmed' ? 'mdi:shield-off-outline' : s === 'triggered' ? 'mdi:shield-alert' : 'mdi:shield-lock-outline';
    const needsCode = !!st?.attributes.code_format;
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
        <div class="ttl ${pill}"><ha-icon .icon=${shield}></ha-icon><span>${entityName(this.hass, c.entity, c.name)}</span></div>
        <span class="pill ${pill === 'arm' ? '' : pill}">${na ? t(this.hass, 'unavailable') : stateText(this.hass, st)}</span>
      </div>
      ${na
        ? nothing
        : html`${needsCode
              ? html`<input
                  class="code"
                  type="password"
                  inputmode="numeric"
                  autocomplete="off"
                  .value=${this._code}
                  placeholder=${t(this.hass, 'enter_code')}
                  aria-label=${t(this.hass, 'enter_code')}
                  @pointerdown=${stop}
                  @click=${stop}
                  @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value)}
                />`
              : nothing}
            <div class="keys">
              <button class=${s === 'disarmed' ? 'on' : ''} @pointerdown=${stop} @click=${(e: Event) => this._call(e, 'alarm_disarm')}>
                ${t(this.hass, 'alarm_disarm')}
              </button>
              ${MODES.filter(([bit]) => f & bit).map(
                ([, svc, armed, label]) => html`<button class=${s === armed ? 'on arm' : ''} @pointerdown=${stop} @click=${(e: Event) => this._call(e, svc)}>
                  ${t(this.hass, label)}
                </button>`,
              )}
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
        flex: none;
        color: var(--_tx3);
      }
      .ttl.ok ha-icon {
        color: var(--_ok);
      }
      .ttl.arm ha-icon {
        color: var(--_acc);
      }
      .ttl.na ha-icon {
        color: var(--_na);
      }
      .ttl.w ha-icon {
        color: var(--_amb);
      }
      .ttl span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .code {
        width: 100%;
        box-sizing: border-box;
        margin-top: 10px;
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid var(--_line);
        background: var(--_card2);
        color: var(--_tx);
        font: inherit;
        letter-spacing: 4px;
      }
      .keys {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 10px;
      }
      .keys button {
        padding: 8px 0;
        border-radius: 10px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        font: inherit;
        font-size: 12px;
        color: var(--_tx2);
        cursor: pointer;
      }
      .keys button.on {
        background: var(--_okbg);
        color: var(--_ok);
        border-color: transparent;
      }
      .keys button.on.arm {
        background: color-mix(in srgb, var(--_acc) 18%, var(--_card2));
        color: var(--_acc);
      }
      .keys button:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-alarm-card': InventaAlarmCard;
  }
}
