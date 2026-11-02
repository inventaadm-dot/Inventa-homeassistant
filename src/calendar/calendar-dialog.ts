// Ventana emergente con la agenda (botón 📅 del encabezado).
//
// Se agrega a <body> y no dentro de la tarjeta: la tarjeta usa container
// queries, y eso hace que `position: fixed` quede atrapado dentro de ella.

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from '../types';
import { t } from '../i18n';
import { navigate } from '../actions';
import { tokens } from '../styles';
import './agenda';

export interface CalendarDialogOptions {
  entities?: string[];
  days?: number;
  /** Adónde lleva "Abrir calendario completo" (por defecto, el calendario de HA). */
  calendarPath?: string;
}

@customElement('inventa-calendar-dialog')
export class InventaCalendarDialog extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public options: CalendarDialogOptions = {};
  private _opener?: HTMLElement | null;

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };
  // Al navegar a otra página (p. ej. "Crear calendario local") se cierra sola.
  private _onLocation = () => this.close();

  connectedCallback(): void {
    super.connectedCallback();
    this._opener = document.activeElement as HTMLElement | null;
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('location-changed', this._onLocation);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('location-changed', this._onLocation);
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
    const days = this.options.days || 7;
    return html`
      <div class="backdrop" @click=${() => this.close()}></div>
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="ttl">
        <div class="head">
          <ha-icon class="head-icon" icon="mdi:calendar-blank-outline"></ha-icon>
          <div class="head-text">
            <div id="ttl" class="ttl">${t(this.hass, 'agenda')}</div>
            <div class="sub">${t(this.hass, 'next_days', { n: days })}</div>
          </div>
          <button class="icon-btn close" aria-label=${t(this.hass, 'close')} title=${t(this.hass, 'close')} @click=${() => this.close()}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="body">
          <inventa-agenda .hass=${this.hass} .entities=${this.options.entities} .days=${days}></inventa-agenda>
        </div>
        <div class="foot">
          <button class="link" @click=${() => navigate(this.options.calendarPath || '/calendar')}>
            ${t(this.hass, 'open_full')}<ha-icon icon="mdi:arrow-right"></ha-icon>
          </button>
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
        animation: fade 0.15s ease-out;
      }
      .panel {
        position: relative;
        box-sizing: border-box;
        width: min(520px, calc(100vw - 32px));
        max-height: min(80vh, 680px);
        display: flex;
        flex-direction: column;
        background: var(--_card);
        color: var(--_tx);
        border: 1px solid var(--_line);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        animation: pop 0.18s ease-out;
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
        color: var(--_acc);
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
        flex: 1;
        overflow-y: auto;
        padding: 14px 20px 16px;
      }
      .foot {
        border-top: 1px solid var(--_line);
        padding: 10px 14px;
        display: flex;
        justify-content: flex-end;
      }
      .link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: none;
        color: var(--_acc);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 8px;
        --mdc-icon-size: 16px;
      }
      .link:focus-visible {
        outline: 2px solid var(--_acc);
      }

      /* Celular: hoja que sube desde abajo */
      @media (max-width: 600px) {
        :host {
          place-items: end stretch;
        }
        .panel {
          width: 100%;
          max-height: 85vh;
          border-radius: 18px 18px 0 0;
          border-bottom: none;
          animation: up 0.2s ease-out;
        }
      }

      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: scale(0.97);
        }
      }
      @keyframes up {
        from {
          transform: translateY(40px);
          opacity: 0;
        }
      }
    `,
  ];
}

let current: InventaCalendarDialog | undefined;

/** Abre la agenda (o la reemplaza si ya estaba abierta). Devuelve la ventana para actualizar su `hass`. */
export function openCalendarDialog(hass: HomeAssistant | undefined, options: CalendarDialogOptions): InventaCalendarDialog {
  current?.close();
  const dlg = document.createElement('inventa-calendar-dialog');
  dlg.hass = hass;
  dlg.options = options;
  document.body.appendChild(dlg);
  current = dlg;
  return dlg;
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-calendar-dialog': InventaCalendarDialog;
  }
}
