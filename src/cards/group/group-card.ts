// Bloque: título + chips de filtro por área + grilla de tarjetas.
//
// Es la pieza que ordena el panel por tipo de equipo (Climatización, Luces…),
// como el Corporate Dashboard. La grilla es propia: calcula cuántas columnas
// caben según el ancho disponible y, si hay menos tarjetas que columnas, las
// estira para ocupar todo el ancho (sin espacios vacíos en pantallas grandes).

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { entityArea } from '../../ha';

export interface GroupCardConfig {
  type: string;
  title?: string;
  icon?: string;
  /** Tarjetas del bloque (cualquier tarjeta; las de Inventa se crean directo). */
  cards: Array<Record<string, any>>;
  /** Ancho mínimo de cada tarjeta en px (la grilla pone tantas columnas como quepan). */
  min_width?: number;
  /** Ancho máximo de cada tarjeta en px (p. ej. cámaras, para que una sola no ocupe toda la pantalla). */
  max_width?: number;
  /** Chips para filtrar por área: true, false o 'auto' (si hay 2+ áreas y 6+ tarjetas). */
  filter_by_area?: boolean | 'auto';
}

const OTHER = '__other__';

@customElement('inventa-group-card')
export class InventaGroupCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: GroupCardConfig;
  @state() private _filter = '';
  @state() private _cards: LovelaceCard[] = [];
  @state() private _cols = 0;
  private _width = 0;
  private _ro = new ResizeObserver((entries) => {
    this._width = entries[0]?.contentRect.width || 0;
    this._fit();
  });

  public static getStubConfig(): Partial<GroupCardConfig> {
    return { title: 'Luces', icon: 'mdi:lightbulb-group-outline', cards: [] };
  }

  public static getConfigForm() {
    return {
      schema: [
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'title', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            { name: 'min_width', selector: { number: { min: 120, max: 600, mode: 'box' } } },
            { name: 'filter_by_area', selector: { boolean: {} } },
          ],
        },
        { name: 'cards', selector: { object: {} } },
      ],
      computeLabel: labeler({ title: 'title_card', cards: 'group_cards' }),
    };
  }

  public setConfig(config: GroupCardConfig): void {
    if (!config || !Array.isArray(config.cards)) throw new Error('`cards` debe ser una lista de tarjetas');
    this._config = { min_width: 200, filter_by_area: 'auto', ...config };
    this._filter = '';
    this._fit();
    this._build();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._ro.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ro.disconnect();
  }

  /** Columnas: las que caben, pero nunca más que tarjetas visibles (así se estiran). */
  private _fit(): void {
    if (!this._config || !this._width) return;
    const gap = 10;
    const min = this._config.min_width || 200;
    const fit = Math.max(1, Math.floor((this._width + gap) / (min + gap)));
    const visible = this._config.cards.filter((_, i) => !this._filter || this._areaOf(i) === this._filter).length || 1;
    let cols = Math.min(visible, fit);
    if (this._config.max_width) cols = Math.max(cols, Math.min(fit, Math.ceil((this._width + gap) / (this._config.max_width + gap))));
    if (cols !== this._cols) this._cols = cols;
  }

  public getCardSize(): number {
    return 1 + Math.ceil(this._config.cards.length / 3) * 2;
  }

  public getGridOptions() {
    return { columns: 'full', rows: 'auto' };
  }

  private async _build(): Promise<void> {
    const configs = this._config.cards;
    let helpers: any;
    const cards = await Promise.all(
      configs.map(async (cfg) => {
        const tag = typeof cfg.type === 'string' && cfg.type.startsWith('custom:') ? cfg.type.slice(7) : '';
        if (tag.startsWith('inventa-') && customElements.get(tag)) {
          const el = document.createElement(tag) as LovelaceCard;
          try {
            el.setConfig(cfg);
          } catch (e) {
            el.textContent = String(e);
          }
          return el;
        }
        helpers = helpers || (await window.loadCardHelpers?.());
        return (helpers?.createCardElement(cfg) as LovelaceCard) || document.createElement('div');
      }),
    );
    if (configs !== this._config.cards) return; // llegó otra configuración mientras tanto
    cards.forEach((c) => (c.hass = this.hass));
    this._cards = cards;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) {
      ensureTheme(this.hass);
      this._cards.forEach((c) => (c.hass = this.hass));
    }
  }

  /** Solo se redibuja el bloque si cambia el idioma o los filtros; las tarjetas hijas se actualizan solas. */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('hass') && changed.size === 1) {
      const old = changed.get('hass') as HomeAssistant | undefined;
      this._cards.forEach((c) => (c.hass = this.hass));
      return !old || old.locale?.language !== this.hass?.locale?.language || old.areas !== this.hass?.areas;
    }
    return true;
  }

  private _areaOf(i: number): string {
    const e = this._config.cards[i]?.entity;
    return (e && this.hass && entityArea(this.hass, e)) || OTHER;
  }

  private _chips(): Array<{ id: string; name: string }> {
    const ids = [...new Set(this._config.cards.map((_, i) => this._areaOf(i)))];
    const named = ids
      .filter((id) => id !== OTHER)
      .map((id) => ({ id, name: this.hass?.areas?.[id]?.name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (ids.includes(OTHER) && named.length) named.push({ id: OTHER, name: t(this.hass, 'other_area') });
    return named;
  }

  protected render() {
    if (!this._config) return nothing;
    const c = this._config;
    const chips = this._chips();
    const showChips =
      c.filter_by_area === true ? chips.length > 0 : c.filter_by_area === 'auto' ? chips.length >= 2 && c.cards.length >= 6 : false;
    const filter = showChips ? this._filter : '';

    return html`<div class="group">
      ${c.title || showChips
        ? html`<div class="head">
            ${c.title
              ? html`<div class="ttl">
                  ${c.icon ? html`<ha-icon .icon=${c.icon}></ha-icon>` : nothing}<span>${c.title}</span>
                  <span class="count">${c.cards.length}</span>
                </div>`
              : nothing}
            ${showChips
              ? html`<div class="chips" role="tablist">
                  ${[{ id: '', name: t(this.hass, 'all') }, ...chips].map(
                    (ch) => html`<button
                      class="chip ${filter === ch.id ? 'on' : ''}"
                      role="tab"
                      aria-selected=${filter === ch.id ? 'true' : 'false'}
                      @click=${() => {
                        this._filter = ch.id;
                        this._fit();
                      }}
                    >
                      ${ch.name}
                    </button>`,
                  )}
                </div>`
              : nothing}
          </div>`
        : nothing}
      <div class="grid ${this._cols ? 'sized' : ''}" style="--min:${c.min_width}px;--cols:${this._cols || 1}">
        ${this._cards.map((card, i) => html`<div class="cell" ?hidden=${!!filter && this._areaOf(i) !== filter}>${card}</div>`)}
      </div>
    </div>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px 16px;
        margin: 4px 2px 10px;
      }
      .ttl {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 500;
        color: var(--_tx);
        --mdc-icon-size: 20px;
      }
      .ttl ha-icon {
        color: var(--_tx2);
      }
      .count {
        font-size: 11px;
        font-weight: 500;
        color: var(--_tx2);
        background: var(--_card2);
        border: 1px solid var(--_line);
        border-radius: 999px;
        padding: 1px 8px;
      }
      .chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
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
      .chip.on {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .chip:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(var(--min), 100%), 1fr));
        gap: 10px;
        align-items: start;
      }
      .grid.sized {
        grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
      }
      .cell[hidden] {
        display: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-group-card': InventaGroupCard;
  }
}
