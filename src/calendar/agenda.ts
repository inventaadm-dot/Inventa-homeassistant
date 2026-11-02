// Agenda: lista de próximos eventos de los calendarios de Home Assistant.
// La usan la ventana emergente del encabezado y la tarjeta Calendario.
//
// Lee los eventos con la API REST de HA (`GET /api/calendars/<entidad>`), que
// funciona con cualquier integración de calendario (local, Google, CalDAV…).
// Si no hay ningún calendario, muestra cómo crear uno.

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../types';
import { lang, t } from '../i18n';
import { navigate } from '../actions';
import { tokens } from '../styles';

const COLORS = ['#3B82F6', '#22D3EE', '#A78BFA', '#F59E0B', '#4ADE80', '#F472B6', '#F87171'];
const REFRESH_MS = 5 * 60 * 1000;

interface RawDate {
  date?: string;
  dateTime?: string;
}
interface RawEvent {
  summary: string;
  start: RawDate;
  end: RawDate;
  location?: string;
}
interface AgendaEvent {
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  calendar: string;
  color: string;
}

/** Calendarios a mostrar: los indicados o todos los `calendar.*`. */
export function calendarEntities(hass: HomeAssistant | undefined, entities?: string[]): string[] {
  if (!hass) return [];
  if (entities?.length) return entities.filter((e) => hass.states[e]);
  return Object.keys(hass.states)
    .filter((e) => e.startsWith('calendar.'))
    .sort();
}

function parseDate(d: RawDate): { date: Date; allDay: boolean } {
  if (d.dateTime) return { date: new Date(d.dateTime), allDay: false };
  // Fecha sin hora (evento de todo el día): interpretarla en hora local.
  const [y, m, day] = (d.date || '').split('-').map(Number);
  return { date: new Date(y, m - 1, day), allDay: true };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

@customElement('inventa-agenda')
export class InventaAgenda extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @property({ attribute: false }) public entities?: string[];
  @property({ type: Number }) public days = 7;
  @property({ type: Number }) public maxEvents?: number;

  @state() private _events?: AgendaEvent[];
  @state() private _error = false;
  private _signature = '';
  private _timer?: number;
  private _request = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => this._fetch(), REFRESH_MS);
    if (this._signature) this._fetch(); // reconectada: refrescar
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
  }

  /** Huella de los calendarios: cambia cuando un evento empieza o termina. */
  private _computeSignature(): string {
    return calendarEntities(this.hass, this.entities)
      .map((e) => `${e}:${this.hass!.states[e].last_changed}`)
      .join('|') + `#${this.days}`;
  }

  /**
   * Solo se redibuja si cambian los datos propios, no con cada estado de HA.
   * Aquí también se detecta si hay que volver a pedir los eventos (Lit no
   * llama a `willUpdate` cuando `shouldUpdate` devuelve false).
   */
  protected shouldUpdate(changed: PropertyValues): boolean {
    if (this.hass && (changed.has('hass') || changed.has('entities') || changed.has('days'))) {
      const sig = this._computeSignature();
      if (sig !== this._signature) {
        this._signature = sig;
        this._fetch();
        return true;
      }
    }
    if (changed.size === 1 && changed.has('hass')) {
      const old = changed.get('hass') as HomeAssistant | undefined;
      return !old || old.locale?.language !== this.hass?.locale?.language || old.user?.is_admin !== this.hass?.user?.is_admin;
    }
    return true;
  }

  private async _fetch(): Promise<void> {
    const hass = this.hass;
    const ids = calendarEntities(hass, this.entities);
    if (!hass || !ids.length) {
      this._events = [];
      this._error = false;
      return;
    }
    const req = ++this._request;
    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + this.days);
    const qs = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;

    const results = await Promise.allSettled(ids.map((id) => hass.callApi<RawEvent[]>('GET', `calendars/${id}?${qs}`)));
    if (req !== this._request) return; // llegó una respuesta más nueva

    const events: AgendaEvent[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const id = ids[i];
      const name = hass.states[id]?.attributes.friendly_name || id;
      for (const ev of r.value || []) {
        const s = parseDate(ev.start);
        const e = parseDate(ev.end);
        events.push({
          summary: ev.summary || '—',
          start: s.date,
          end: e.date,
          allDay: s.allDay,
          location: ev.location || undefined,
          calendar: name,
          color: COLORS[i % COLORS.length],
        });
      }
    });
    this._error = results.every((r) => r.status === 'rejected');
    events.sort((a, b) => a.start.getTime() - b.start.getTime() || Number(b.allDay) - Number(a.allDay));
    this._events = events.filter((e) => e.end.getTime() > Date.now() || e.allDay);
  }

  private _dayLabel(day: Date): string {
    const today = startOfDay(new Date());
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
    if (diff <= 0) return t(this.hass, 'today');
    if (diff === 1) return t(this.hass, 'tomorrow');
    const s = day.toLocaleDateString(lang(this.hass), { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private _time(d: Date): string {
    return d.toLocaleTimeString(lang(this.hass), { hour: '2-digit', minute: '2-digit' });
  }

  private _renderEmptyCalendar() {
    const admin = this.hass?.user?.is_admin;
    return html`<div class="empty">
      <ha-icon class="empty-icon" icon="mdi:calendar-plus"></ha-icon>
      <div class="empty-title">${t(this.hass, 'no_calendar_title')}</div>
      <div class="empty-text">${t(this.hass, admin ? 'no_calendar_text' : 'no_calendar_user')}</div>
      ${admin
        ? html`<div class="empty-actions">
            <button class="btn primary" @click=${() => navigate('/config/integrations/dashboard/add?domain=local_calendar')}>
              <ha-icon icon="mdi:calendar-plus"></ha-icon>${t(this.hass, 'create_local')}
            </button>
            <button class="btn" @click=${() => navigate('/config/integrations/dashboard/add?domain=google')}>
              <ha-icon icon="mdi:google"></ha-icon>${t(this.hass, 'connect_google')}
            </button>
          </div>`
        : nothing}
    </div>`;
  }

  protected render() {
    if (!this.hass) return nothing;
    if (!calendarEntities(this.hass, this.entities).length) return this._renderEmptyCalendar();
    if (!this._events) return html`<div class="msg">${t(this.hass, 'loading')}</div>`;
    if (this._error) return html`<div class="msg">${t(this.hass, 'load_error')}</div>`;

    const list = this.maxEvents ? this._events.slice(0, this.maxEvents) : this._events;
    if (!list.length) return html`<div class="msg">${t(this.hass, 'no_events', { n: this.days })}</div>`;

    // Agrupar por día (lo que empezó antes de hoy y sigue en curso va en "Hoy").
    const today = startOfDay(new Date()).getTime();
    const groups = new Map<number, AgendaEvent[]>();
    for (const ev of list) {
      const key = Math.max(startOfDay(ev.start).getTime(), today);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }

    return html`<div class="days">${[...groups.entries()].map(
      ([day, evs]) => html`<div class="day">
        <div class="day-label">${this._dayLabel(new Date(day))}</div>
        ${evs.map(
          (ev) => html`<div class="ev">
            <div class="when">${ev.allDay ? t(this.hass, 'all_day') : this._time(ev.start)}</div>
            <span class="bar" style="background:${ev.color}"></span>
            <div class="what">
              <div class="summary">${ev.summary}</div>
              <div class="meta">
                ${ev.allDay ? nothing : html`${this._time(ev.start)} – ${this._time(ev.end)} · `}${ev.location && ev.location !== ev.calendar
                  ? html`${ev.location} · `
                  : nothing}${ev.calendar}
              </div>
            </div>
          </div>`,
        )}
      </div>`,
    )}</div>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      .msg {
        padding: 18px 4px;
        color: var(--_tx3);
        font-size: 13px;
        text-align: center;
      }
      .day + .day {
        margin-top: 14px;
      }
      .day-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--_tx3);
        margin-bottom: 6px;
      }
      .ev {
        display: grid;
        grid-template-columns: 64px 4px minmax(0, 1fr);
        gap: 10px;
        align-items: stretch;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--_card2);
        border: 1px solid var(--_line);
      }
      .ev + .ev {
        margin-top: 6px;
      }
      .when {
        font-size: 12px;
        font-weight: 600;
        color: var(--_tx2);
        padding-top: 1px;
      }
      .bar {
        border-radius: 2px;
      }
      .summary {
        font-size: 14px;
        font-weight: 500;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .meta {
        font-size: 12px;
        color: var(--_tx3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .empty {
        text-align: center;
        padding: 18px 8px 8px;
      }
      .empty-icon {
        --mdc-icon-size: 36px;
        color: var(--_acc);
      }
      .empty-title {
        margin-top: 8px;
        font-size: 15px;
        font-weight: 600;
        color: var(--_tx);
      }
      .empty-text {
        margin: 6px auto 0;
        max-width: 340px;
        font-size: 13px;
        color: var(--_tx2);
      }
      .empty-actions {
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1px solid var(--_line);
        background: var(--_card2);
        color: var(--_tx);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        --mdc-icon-size: 16px;
      }
      .btn.primary {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .btn:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }

      /* Ancha (p. ej. pie del panel): los días en columnas. */
      @container (min-width: 720px) {
        .days {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px 18px;
          align-items: start;
        }
        .day {
          min-width: 0;
        }
        .day + .day {
          margin-top: 0;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-agenda': InventaAgenda;
  }
}
