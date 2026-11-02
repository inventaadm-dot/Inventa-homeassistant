// Panel de avisos (al tocar la 🔔 del encabezado). Igual que la agenda, se
// agrega a <body> para que `position: fixed` no quede atrapado en la tarjeta.

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types';
import { t } from '../i18n';
import { navigate } from '../actions';
import { tokens } from '../styles';
import { NOTIFICATIONS_EVENT, computeAlerts, dismissNotification, type AlertLevel } from './alerts';
import type { ClimateScales } from '../climate-scale';

const LEVELS: Array<{ key: AlertLevel; label: 'al_crit' | 'al_att' | 'al_info' }> = [
  { key: 'crit', label: 'al_crit' },
  { key: 'att', label: 'al_att' },
  { key: 'info', label: 'al_info' },
];

@customElement('inventa-alerts-dialog')
export class InventaAlertsDialog extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public entities: string[] = [];
  @property({ attribute: false }) public scales: ClimateScales = {};
  @state() private _tick = 0;
  private _opener?: HTMLElement | null;
  private _onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
  private _onLocation = () => this.close();
  private _onNotif = () => this._tick++;

  connectedCallback(): void {
    super.connectedCallback();
    this._opener = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('location-changed', this._onLocation);
    window.addEventListener(NOTIFICATIONS_EVENT, this._onNotif);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('location-changed', this._onLocation);
    window.removeEventListener(NOTIFICATIONS_EVENT, this._onNotif);
  }

  protected firstUpdated(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.close')?.focus();
  }

  public close(): void {
    if (!this.isConnected) return;
    this.remove();
    if (current === this) current = undefined;
    this._opener?.focus?.();
  }

  protected render() {
    void this._tick;
    const alerts = computeAlerts(this.hass, this.entities, this.scales);
    const crit = alerts.filter((a) => a.level === 'crit').length;
    const att = alerts.filter((a) => a.level === 'att').length;
    const summary = [crit ? t(this.hass, 'al_n_crit', { n: crit }) : '', att ? t(this.hass, 'al_n_att', { n: att }) : ''].filter(Boolean).join(' · ');

    return html`
      <div class="backdrop" @click=${() => this.close()}></div>
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="ttl">
        <div class="head">
          <ha-icon class="head-icon ${crit ? 'crit' : ''}" icon="mdi:bell-outline"></ha-icon>
          <div class="head-text">
            <div id="ttl" class="ttl">${t(this.hass, 'alerts')}</div>
            <div class="sub">${summary || t(this.hass, alerts.length ? 'al_only_info' : 'al_none')}</div>
          </div>
          <button class="icon-btn close" aria-label=${t(this.hass, 'close')} title=${t(this.hass, 'close')} @click=${() => this.close()}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="body">
          ${alerts.length
            ? LEVELS.map(({ key, label }) => {
                const list = alerts.filter((a) => a.level === key);
                if (!list.length) return nothing;
                return html`<div class="group">
                  <div class="glabel ${key}">${t(this.hass, label)}</div>
                  ${list.map(
                    (a) => html`<div class="al ${a.level}">
                      <ha-icon .icon=${a.icon}></ha-icon>
                      <div class="txt">
                        <div class="t">${a.title}</div>
                        ${a.sub ? html`<div class="s">${a.sub}</div>` : nothing}
                      </div>
                      ${a.link ? html`<button class="link" @click=${() => navigate(a.link!)}>${a.linkText}</button>` : nothing}
                      ${a.notification
                        ? html`<button class="icon-btn small" aria-label=${t(this.hass, 'dismiss')} title=${t(this.hass, 'dismiss')} @click=${() => dismissNotification(this.hass, a.notification!)}>
                            <ha-icon icon="mdi:check"></ha-icon>
                          </button>`
                        : nothing}
                    </div>`,
                  )}
                </div>`;
              })
            : html`<div class="empty"><ha-icon icon="mdi:check-circle-outline"></ha-icon>${t(this.hass, 'al_none')}</div>`}
        </div>
      </div>
    `;
  }

  static styles = [
    tokens,
    css`
      :host {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      }
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, 0.55);
      }
      .panel {
        position: relative;
        box-sizing: border-box;
        width: min(480px, calc(100vw - 32px));
        max-height: min(80vh, 640px);
        display: flex;
        flex-direction: column;
        background: var(--_card);
        color: var(--_tx);
        border: 1px solid var(--_line);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      .head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 16px 12px 20px;
        border-bottom: 1px solid var(--_line);
      }
      .head-icon {
        --mdc-icon-size: 22px;
        color: var(--_amb);
      }
      .head-icon.crit {
        color: var(--_na);
      }
      .head-text {
        flex: 1;
        min-width: 0;
      }
      .ttl {
        font-size: 17px;
        font-weight: 600;
      }
      .sub {
        font-size: 12px;
        color: var(--_tx3);
      }
      .body {
        overflow-y: auto;
        padding: 12px 20px 16px;
      }
      .group + .group {
        margin-top: 14px;
      }
      .glabel {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--_tx3);
        margin-bottom: 6px;
      }
      .glabel.crit {
        color: var(--_na);
      }
      .glabel.att {
        color: var(--_amb);
      }
      .al {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        --mdc-icon-size: 20px;
      }
      .al + .al {
        margin-top: 6px;
      }
      .al > ha-icon {
        flex: none;
        color: var(--_tx3);
      }
      .al.crit {
        border-color: color-mix(in srgb, var(--_na) 50%, var(--_line));
        background: var(--_nabg);
      }
      .al.crit > ha-icon,
      .al.crit .t {
        color: var(--_na);
      }
      .al.att > ha-icon {
        color: var(--_amb);
      }
      .txt {
        flex: 1;
        min-width: 0;
      }
      .t {
        font-size: 13px;
        font-weight: 500;
      }
      .s {
        font-size: 12px;
        color: var(--_tx3);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .link {
        background: none;
        border: none;
        color: var(--_acc);
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
      .icon-btn.small {
        width: 30px;
        height: 30px;
        --mdc-icon-size: 16px;
      }
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px 0;
        color: var(--_ok);
        font-size: 14px;
      }
      @media (max-width: 600px) {
        :host {
          place-items: end stretch;
        }
        .panel {
          width: 100%;
          max-height: 85vh;
          border-radius: 18px 18px 0 0;
          border-bottom: none;
        }
      }
    `,
  ];
}

let current: InventaAlertsDialog | undefined;

export function openAlertsDialog(hass: HomeAssistant | undefined, entities: string[], scales: ClimateScales = {}): InventaAlertsDialog {
  current?.close();
  const dlg = document.createElement('inventa-alerts-dialog');
  dlg.hass = hass;
  dlg.entities = entities;
  dlg.scales = scales;
  document.body.appendChild(dlg);
  current = dlg;
  return dlg;
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-alerts-dialog': InventaAlertsDialog;
  }
}
