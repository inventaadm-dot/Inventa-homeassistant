// Tarjeta Calendario.
//
// - view: agenda → nuestra agenda (próximos días).
// - view: month / list / full → el calendario nativo de Home Assistant
//   (mes en grilla y/o lista de la semana), creado por dentro con
//   `loadCardHelpers()` y pintado con los colores del tema mediante variables
//   CSS, sin card-mod.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { navigate } from '../../actions';
import { docHass, t } from '../../i18n';
import { tokens } from '../../styles';
import { calendarEntities } from '../../calendar/agenda';
import '../../calendar/agenda';

export type CalendarView = 'agenda' | 'month' | 'list' | 'full';

export interface CalendarCardConfig {
  type: string;
  title?: string;
  view?: CalendarView;
  /** Calendarios a mostrar; vacío = todos los `calendar.*`. */
  entities?: string[];
  days?: number;
  max_events?: number;
  /** Adónde lleva el botón ↗ (por defecto, el calendario de HA). */
  calendar_path?: string;
}

/** Vista de HA (FullCalendar) que usa cada panel. */
const NATIVE_VIEWS: Record<Exclude<CalendarView, 'agenda'>, string[]> = {
  month: ['dayGridMonth'],
  list: ['listWeek'],
  full: ['dayGridMonth', 'listWeek'],
};

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{ createCardElement: (config: Record<string, any>) => HTMLElement & { hass?: HomeAssistant } }>;
  }
}

@customElement('inventa-calendar-card')
export class InventaCalendarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: CalendarCardConfig;
  @state() private _native: Array<HTMLElement & { hass?: HomeAssistant }> = [];
  @state() private _noHelpers = false;
  private _nativeKey = '';

  public static getStubConfig(): Partial<CalendarCardConfig> {
    return { view: 'agenda', days: 7 };
  }

  public static getConfigForm() {
    const hass = docHass();
    return {
      schema: [
        {
          name: 'view',
          selector: {
            select: {
              mode: 'dropdown',
              options: (['agenda', 'month', 'list', 'full'] as const).map((v) => ({ value: v, label: t(hass, `view_${v}` as any) })),
            },
          },
        },
        { name: 'title', selector: { text: {} } },
        { name: 'entities', selector: { entity: { domain: 'calendar', multiple: true } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'days', selector: { number: { min: 1, max: 60, mode: 'box' } } },
            { name: 'max_events', selector: { number: { min: 1, max: 50, mode: 'box' } } },
          ],
        },
        { name: 'calendar_path', selector: { text: {} } },
      ],
      computeLabel: (s: { name: string }) => t(docHass(), (s.name === 'title' ? 'title_card' : s.name) as any) || s.name,
    };
  }

  public setConfig(config: CalendarCardConfig): void {
    if (!config) throw new Error('Configuración inválida');
    if (config.entities && !Array.isArray(config.entities)) throw new Error('`entities` debe ser una lista');
    if (config.view && !['agenda', 'month', 'list', 'full'].includes(config.view)) {
      throw new Error('`view` debe ser agenda, month, list o full');
    }
    this._config = { view: 'agenda', days: 7, ...config };
  }

  private get _view(): CalendarView {
    return this._config?.view || 'agenda';
  }

  public getCardSize(): number {
    return this._view === 'agenda' ? 4 : this._view === 'list' ? 6 : 9;
  }

  public getGridOptions() {
    if (this._view === 'full') return { columns: 'full', rows: 'auto' };
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) {
      ensureTheme(this.hass);
      this._native.forEach((el) => (el.hass = this.hass));
    }
    if (this._view !== 'agenda') this._ensureNative();
  }

  /** Crea (o recrea si cambió la configuración) las tarjetas de calendario de HA. */
  private async _ensureNative(): Promise<void> {
    const entities = calendarEntities(this.hass, this._config.entities);
    if (!entities.length) return; // se muestra el aviso "Aún no tienes calendario"
    const key = JSON.stringify([this._view, entities, this._config.title]);
    if (key === this._nativeKey) return;
    this._nativeKey = key;

    if (!window.loadCardHelpers) {
      this._noHelpers = true;
      return;
    }
    const helpers = await window.loadCardHelpers();
    if (key !== this._nativeKey) return; // la configuración cambió mientras cargaba
    const views = NATIVE_VIEWS[this._view as Exclude<CalendarView, 'agenda'>];
    this._native = views.map((initial_view, i) => {
      const el = helpers.createCardElement({
        type: 'calendar',
        entities,
        initial_view,
        // En la vista completa el título va solo en el mes.
        ...(this._config.title && i === 0 ? { title: this._config.title } : {}),
      });
      el.hass = this.hass;
      return el;
    });
  }

  private _renderAgenda() {
    const c = this._config;
    return html`<ha-card class="agenda">
      <div class="head">
        <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
        <div class="ttl">${c.title || t(this.hass, 'agenda')}</div>
        <button
          class="icon-btn"
          title=${t(this.hass, 'open_full')}
          aria-label=${t(this.hass, 'open_full')}
          @click=${() => navigate(c.calendar_path || '/calendar')}
        >
          <ha-icon icon="mdi:arrow-top-right"></ha-icon>
        </button>
      </div>
      <inventa-agenda .hass=${this.hass} .entities=${c.entities} .days=${c.days || 7} .maxEvents=${c.max_events}></inventa-agenda>
    </ha-card>`;
  }

  protected render() {
    if (!this._config) return nothing;
    // Sin calendarios, o vista agenda: nuestra agenda (que también explica cómo crear un calendario).
    if (this._view === 'agenda' || !calendarEntities(this.hass, this._config.entities).length) return this._renderAgenda();
    if (this._noHelpers) return html`<ha-card class="agenda"><div class="msg">${t(this.hass, 'only_in_ha')}</div></ha-card>`;
    return html`<div class="native ${this._view}">${this._native}</div>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
      }
      .agenda {
        padding: 14px 16px 16px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        --mdc-icon-size: 20px;
      }
      .head > ha-icon {
        color: var(--_acc);
      }
      .ttl {
        flex: 1;
        font-size: 15px;
        font-weight: 600;
        color: var(--_tx);
      }
      .icon-btn {
        width: 32px;
        height: 32px;
        --mdc-icon-size: 16px;
      }
      .msg {
        color: var(--_tx3);
        font-size: 13px;
        text-align: center;
        padding: 12px;
      }

      /* Calendario de HA con los colores del tema (las variables se heredan dentro de su shadow DOM). */
      .native {
        --ha-card-background: var(--_card);
        --card-background-color: var(--_card);
        --primary-background-color: var(--_card2);
        --secondary-background-color: var(--_card2);
        --primary-text-color: var(--_tx);
        --secondary-text-color: var(--_tx2);
        --divider-color: var(--_line);
        --primary-color: var(--_acc);
        --mdc-theme-primary: var(--_acc);
        --text-primary-color: #fff;
        --ha-card-border-radius: var(--_radius);
        --ha-card-border-color: var(--_line);
        --ha-card-border-width: 1px;
        --ha-card-box-shadow: none;
        color: var(--_tx);
      }
      .native.full {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        gap: 14px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-calendar-card': InventaCalendarCard;
  }
}
