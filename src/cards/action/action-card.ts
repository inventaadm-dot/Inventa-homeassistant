// Escena / script / botón: acción rápida de un toque.
// scene → scene.turn_on · script → script.turn_on · button / input_button → press.
// Muestra un ✓ breve al ejecutarse; `confirm: true` pide confirmación antes.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { domain, domainIcon, entityName, isUnavailable } from '../../ha';

export interface ActionCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  color?: string;
  confirm?: boolean;
}

@customElement('inventa-action-card')
export class InventaActionCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: ActionCardConfig;
  @state() private _done = false;

  public static getStubConfig(hass?: HomeAssistant): Partial<ActionCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => /^(scene|script)\./.test(e)) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: ['scene', 'script', 'button', 'input_button'] } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            { name: 'color', selector: { text: {} } },
            { name: 'confirm', selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', confirm: 'ask_confirm' }),
    };
  }

  public setConfig(config: ActionCardConfig): void {
    if (!config?.entity) throw new Error('Indica una escena, script o botón');
    this._config = config;
  }

  public getCardSize(): number {
    return 2;
  }

  public getGridOptions() {
    return { columns: 3, min_columns: 3, rows: 2 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    return !old || old.states[this._config.entity] !== this.hass?.states[this._config.entity] || old.locale?.language !== this.hass?.locale?.language;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
  }

  private _run(): void {
    const c = this._config;
    const name = entityName(this.hass, c.entity, c.name);
    if (c.confirm && !window.confirm(t(this.hass, 'confirm_run', { name }))) return;
    const d = domain(c.entity);
    const [svc, act] = d === 'button' || d === 'input_button' ? [d, 'press'] : [d, 'turn_on'];
    this.hass?.callService(svc, act, { entity_id: c.entity });
    this._done = true;
    window.setTimeout(() => (this._done = false), 1500);
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const c = this._config;
    const st = this.hass.states[c.entity];
    const na = isUnavailable(st) && domain(c.entity) !== 'scene' && domain(c.entity) !== 'button';
    const running = domain(c.entity) === 'script' && st?.state === 'on';
    const color = c.color || 'var(--_acc)';
    const name = entityName(this.hass, c.entity, c.name);

    return html`<ha-card class="${na ? 'na' : ''}">
      <button class="tile" ?disabled=${na} aria-label=${name} @click=${this._run} style="--c:${color}">
        <span class="ico ${running ? 'running' : ''}">
          <ha-icon .icon=${this._done ? 'mdi:check' : c.icon || domainIcon(c.entity, st)}></ha-icon>
        </span>
        <span class="n">${name}</span>
      </button>
    </ha-card>`;
  }

  static styles = [
    tokens,
    css`
      ha-card {
        height: 100%;
        box-sizing: border-box;
      }
      ha-card.na {
        opacity: 0.5;
      }
      .tile {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 14px 8px;
        background: none;
        border: none;
        border-radius: var(--_radius);
        color: var(--_tx);
        font: inherit;
        cursor: pointer;
        text-align: center;
      }
      .tile:disabled {
        cursor: default;
      }
      .tile:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: -2px;
      }
      .ico {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--c) 18%, var(--_card2));
        color: var(--c);
        --mdc-icon-size: 20px;
        transition: transform 0.15s;
      }
      .tile:active .ico {
        transform: scale(0.92);
      }
      .ico.running {
        animation: pulse 1.2s ease-in-out infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.5;
        }
      }
      .n {
        font-size: 13px;
        line-height: 1.25;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-action-card': InventaActionCard;
  }
}
