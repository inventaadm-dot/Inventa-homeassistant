// Panel del asistente (al tocar "Buscar o pedir algo…" del encabezado).
// Conversación con sugerencias, campo de texto y botón Limpiar. El historial
// se guarda mientras la página está abierta (máx. 30 mensajes).
//
// Si `assistFallback` está activo, lo que el motor no entiende se envía al
// asistente de Home Assistant (`conversation/process`); por defecto no, para
// que el asistente nunca actúe fuera de la lista de equipos del panel.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types';
import { lang, t } from '../i18n';
import { tokens } from '../styles';
import { AssistantEngine, type ReplyKind } from './engine';
import type { ClimateScales } from '../climate-scale';

const MAX_MSGS = 30;

interface Msg {
  me: boolean;
  kind?: ReplyKind;
  text: string;
}

/** Historial compartido entre aperturas del panel. */
let history: Msg[] = [];

@customElement('inventa-assistant-dialog')
export class InventaAssistantDialog extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public entities: string[] = [];
  @property({ type: Boolean }) public assistFallback = false;
  @property({ attribute: false }) public scales: ClimateScales = {};
  @state() private _msgs: Msg[] = history;
  @state() private _busy = false;
  private _opener?: HTMLElement | null;
  private _onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
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
    this.shadowRoot?.querySelector<HTMLInputElement>('input')?.focus();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('_msgs')) {
      const body = this.shadowRoot?.querySelector('.body');
      if (body) body.scrollTop = body.scrollHeight;
    }
  }

  public close(): void {
    if (!this.isConnected) return;
    this.remove();
    if (current === this) current = undefined;
    this._opener?.focus?.();
  }

  private _push(...m: Msg[]): void {
    history = [...this._msgs, ...m].slice(-MAX_MSGS);
    this._msgs = history;
  }

  private async _send(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text || this._busy || !this.hass) return;
    this._push({ me: true, text });
    this._busy = true;
    try {
      const engine = new AssistantEngine(this.hass, this.entities, this.scales);
      let reply = await engine.handle(text);
      if (!reply && this.assistFallback && this.hass.callWS) {
        const res = await this.hass.callWS<any>({ type: 'conversation/process', text, language: lang(this.hass) });
        const speech = res?.response?.speech?.plain?.speech;
        if (speech) reply = { kind: 'bot', text: speech };
      }
      this._push({ me: false, ...(reply || engine.help()) });
    } catch (e) {
      this._push({ me: false, kind: 'warn', text: t(this.hass, 'as_error') });
    } finally {
      this._busy = false;
    }
  }

  private _submit(e: Event): void {
    e.preventDefault();
    const input = this.shadowRoot!.querySelector('input')!;
    this._send(input.value);
    input.value = '';
  }

  protected render() {
    const sugs = this.hass ? new AssistantEngine(this.hass, this.entities, this.scales).suggestions() : [];
    return html`
      <div class="backdrop" @click=${() => this.close()}></div>
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="ttl">
        <div class="head">
          <ha-icon class="head-icon" icon="mdi:message-text-outline"></ha-icon>
          <div class="head-text">
            <div id="ttl" class="ttl">${t(this.hass, 'assistant')}</div>
            <div class="sub">${t(this.hass, 'as_subtitle')}</div>
          </div>
          ${this._msgs.length
            ? html`<button class="link" @click=${() => ((history = []), (this._msgs = history))}>${t(this.hass, 'as_clear')}</button>`
            : nothing}
          <button class="icon-btn close" aria-label=${t(this.hass, 'close')} title=${t(this.hass, 'close')} @click=${() => this.close()}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="body" aria-live="polite">
          ${this._msgs.length
            ? this._msgs.map((m) => html`<div class="msg ${m.me ? 'me' : `bot ${m.kind || ''}`}">${m.text}</div>`)
            : html`<div class="hello">${t(this.hass, 'as_hello')}</div>`}
          ${this._busy ? html`<div class="msg bot typing"><span></span><span></span><span></span></div>` : nothing}
        </div>
        ${sugs.length
          ? html`<div class="sugs">${sugs.map((s) => html`<button class="chip" @click=${() => this._send(s)}>${s}</button>`)}</div>`
          : nothing}
        <form class="foot" @submit=${this._submit}>
          <input type="text" placeholder=${t(this.hass, 'search_placeholder')} aria-label=${t(this.hass, 'search_placeholder')} autocomplete="off" />
          <button class="icon-btn send" type="submit" aria-label=${t(this.hass, 'as_send')} ?disabled=${this._busy}>
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
        </form>
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
        width: min(560px, calc(100vw - 32px));
        height: min(80vh, 640px);
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
      .link {
        background: none;
        border: none;
        color: var(--_tx3);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .link:hover {
        color: var(--_tx);
      }
      .body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .hello {
        margin: auto;
        text-align: center;
        color: var(--_tx3);
        font-size: 13px;
        max-width: 340px;
      }
      .msg {
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 13px;
        max-width: 85%;
        white-space: pre-line;
        line-height: 1.4;
      }
      .me {
        background: var(--_acc);
        color: #fff;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }
      .bot {
        background: var(--_card2);
        border: 1px solid var(--_line);
        border-bottom-left-radius: 4px;
      }
      .bot.ok {
        border-color: color-mix(in srgb, var(--_ok) 45%, var(--_line));
      }
      .bot.warn {
        border-color: color-mix(in srgb, var(--_amb) 45%, var(--_line));
      }
      .bot.block {
        border-color: color-mix(in srgb, var(--_na) 50%, var(--_line));
        color: var(--_na);
      }
      .typing {
        display: flex;
        gap: 4px;
      }
      .typing span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--_tx3);
        animation: blink 1s infinite;
      }
      .typing span:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing span:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes blink {
        50% {
          opacity: 0.3;
        }
      }
      .sugs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding: 0 20px 10px;
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
      }
      .chip:hover {
        color: var(--_tx);
        border-color: var(--_tx3);
      }
      .foot {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid var(--_line);
      }
      .foot input {
        flex: 1;
        min-width: 0;
        height: 40px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid var(--_line);
        background: var(--_card2);
        color: var(--_tx);
        font: inherit;
        font-size: 14px;
      }
      .foot input:focus {
        outline: 2px solid var(--_acc);
        outline-offset: 0;
      }
      .send {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .send:hover {
        color: #fff;
      }
      @media (max-width: 600px) {
        :host {
          place-items: end stretch;
        }
        .panel {
          width: 100%;
          height: 85vh;
          border-radius: 18px 18px 0 0;
          border-bottom: none;
        }
      }
    `,
  ];
}

let current: InventaAssistantDialog | undefined;

export function openAssistantDialog(hass: HomeAssistant | undefined, entities: string[], assistFallback = false, scales: ClimateScales = {}): InventaAssistantDialog {
  current?.close();
  const dlg = document.createElement('inventa-assistant-dialog');
  dlg.hass = hass;
  dlg.entities = entities;
  dlg.assistFallback = assistFallback;
  dlg.scales = scales;
  document.body.appendChild(dlg);
  current = dlg;
  return dlg;
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-assistant-dialog': InventaAssistantDialog;
  }
}
