// Editor visual del panel Inventa (✏️ en un panel Inventa).
//
// Home Assistant llama a `setConfig()` con la configuración de la estrategia,
// le pasa `hass`, y este editor responde con `config-changed`.
//
// El logo se sube desde aquí mismo: se envía a `/api/image/upload` (lo mismo
// que usa HA para las fotos de las personas) y se guarda la dirección
// `/api/image/serve/<id>/original`, que se puede mostrar sin token.

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types';
import { t, type StringKey } from '../i18n';
import { tokens } from '../styles';
import type { InventaStrategyConfig } from './dashboard-strategy';

/** `ha-form` se carga bajo demanda en HA: forzar su carga a través del editor de una tarjeta nativa. */
async function ensureHaForm(): Promise<void> {
  if (customElements.get('ha-form') || !window.loadCardHelpers) return;
  const helpers = await window.loadCardHelpers();
  const card = (await (helpers as any).createCardElement({ type: 'entities', entities: [] })) as any;
  await card?.constructor?.getConfigElement?.();
  // No esperar para siempre si esta versión de HA no lo carga así.
  await Promise.race([customElements.whenDefined('ha-form'), new Promise((r) => setTimeout(r, 4000))]);
}

const SCHEMA = [
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'title', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  { name: 'subtitle', selector: { text: {} } },
  { name: 'weather_entity', selector: { entity: { domain: 'weather' } } },
  { name: 'calendar_entities', selector: { entity: { domain: 'calendar', multiple: true } } },
  { name: 'show_agenda', selector: { boolean: {} } },
  { name: 'entities', selector: { entity: { multiple: true } } },
  { name: 'assist_fallback', selector: { boolean: {} } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'scaled_climates', selector: { entity: { domain: 'climate', multiple: true } } },
      { name: 'scale_factor', selector: { number: { min: 0.1, max: 100, step: 0.1, mode: 'box' } } },
    ],
  },
];

@customElement('inventa-strategy-editor')
export class InventaStrategyEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: InventaStrategyConfig;
  @state() private _ready = !!customElements.get('ha-form');
  @state() private _busy?: 'logo' | 'logo_dark';
  @state() private _error = '';

  public setConfig(config: InventaStrategyConfig): void {
    // Forma anterior (climates / lights): se muestra unida en "Equipos a mostrar".
    if (config.climates?.length || config.lights?.length) {
      const { climates, lights, ...rest } = config;
      config = { ...rest, entities: [...new Set([...(climates || []), ...(lights || []), ...(config.entities || [])])] };
    }
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._ready) ensureHaForm().finally(() => (this._ready = true));
  }

  private _emit(config: InventaStrategyConfig): void {
    // Quitar opciones vacías para que el YAML quede limpio.
    const clean = Object.fromEntries(
      Object.entries(config).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)),
    ) as InventaStrategyConfig;
    // Valores por defecto: no se guardan.
    if (!clean.scaled_climates?.length || clean.scale_factor === 5) delete clean.scale_factor;
    this._config = clean;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: clean }, bubbles: true, composed: true }));
  }

  private _formChanged(e: CustomEvent): void {
    e.stopPropagation();
    this._emit({ ...this._config!, ...e.detail.value });
  }

  private async _upload(key: 'logo' | 'logo_dark', e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.hass?.fetchWithAuth) return;
    this._busy = key;
    this._error = '';
    try {
      const body = new FormData();
      body.append('file', file);
      const resp = await this.hass.fetchWithAuth('/api/image/upload', { method: 'POST', body });
      if (!resp.ok) throw new Error(String(resp.status));
      const { id } = await resp.json();
      this._emit({ ...this._config!, [key]: `/api/image/serve/${id}/original` });
    } catch (err) {
      this._error = t(this.hass, 'upload_error');
    } finally {
      this._busy = undefined;
    }
  }

  private _renderLogo(key: 'logo' | 'logo_dark') {
    const value = this._config?.[key];
    return html`<div class="logo-row">
      <div class="preview ${key === 'logo_dark' ? 'dark' : ''}">
        ${value ? html`<img src=${value} alt="" />` : html`<ha-icon .icon=${this._config?.icon || 'mdi:home-outline'}></ha-icon>`}
      </div>
      <div class="logo-info">
        <div class="logo-label">${t(this.hass, `st_${key}` as StringKey)}</div>
        <div class="logo-actions">
          <label class="btn">
            <ha-icon icon="mdi:upload"></ha-icon>${this._busy === key ? t(this.hass, 'loading') : t(this.hass, 'upload_image')}
            <input type="file" accept="image/png,image/jpeg,image/gif" @change=${(e: Event) => this._upload(key, e)} hidden />
          </label>
          ${value ? html`<button class="btn" @click=${() => this._emit({ ...this._config!, [key]: undefined })}>${t(this.hass, 'remove')}</button>` : nothing}
        </div>
      </div>
    </div>`;
  }

  protected render() {
    if (!this._config) return nothing;
    const data = { scale_factor: 5, show_agenda: true, ...this._config };
    return html`
      <p class="intro">${t(this.hass, 'strategy_intro')}</p>
      ${this._renderLogo('logo')} ${this._renderLogo('logo_dark')}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${this._ready && customElements.get('ha-form')
        ? html`<ha-form
            .hass=${this.hass}
            .data=${data}
            .schema=${SCHEMA}
            .computeLabel=${(s: { name: string }) => t(this.hass, `st_${s.name}` as StringKey)}
            @value-changed=${this._formChanged}
          ></ha-form>`
        : this._ready
          ? nothing
          : html`<div class="intro">${t(this.hass, 'loading')}</div>`}
    `;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
      }
      .intro {
        color: var(--secondary-text-color);
        font-size: 13px;
        margin: 0 0 12px;
      }
      .logo-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
      }
      .preview {
        width: 120px;
        height: 52px;
        flex: none;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        display: grid;
        place-items: center;
        background: #fff;
        color: #2563eb;
        --mdc-icon-size: 26px;
      }
      .preview.dark {
        background: #0b1120;
        color: #e6edf7;
      }
      .preview img {
        max-width: 108px;
        max-height: 44px;
        object-fit: contain;
      }
      .logo-label {
        font-size: 14px;
        margin-bottom: 6px;
      }
      .logo-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        --mdc-icon-size: 16px;
      }
      .error {
        color: var(--error-color, #dc2626);
        font-size: 13px;
        margin-bottom: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-strategy-editor': InventaStrategyEditor;
  }
}
