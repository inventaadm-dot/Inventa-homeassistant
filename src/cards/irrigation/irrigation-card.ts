// Riego: una zona (válvula) con su estado, el próximo riego, cuánto falta y
// cuánto se regó hoy, más "Regar ahora / Detener" y el programa automático.
//
// Funciona con cualquier `valve.*` (o un interruptor de riego). Si la zona es
// de Hunter Hydrawise (u otra integración que cree entidades parecidas en el
// mismo dispositivo), toma sola el próximo ciclo, el tiempo restante, el
// tiempo regado hoy, el agua usada y el interruptor del programa automático.
// Tocar la tarjeta no riega (para no mojar a nadie por error); mantener
// presionado abre "más información".

import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from '../../types';
import { ensureTheme } from '../../theme';
import { labeler, t } from '../../i18n';
import { tokens } from '../../styles';
import { Press, stop } from '../../gestures';
import { domain, entityName, formatNumber, isUnavailable, moreInfo, relativeTime } from '../../ha';

export interface IrrigationCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  /** Mostrar el interruptor del programa automático (si la zona lo tiene). */
  show_schedule?: boolean;
}

type Role = 'valve' | 'next' | 'remaining' | 'today' | 'water' | 'auto' | 'manual' | 'running';
type Reg = NonNullable<HomeAssistant['entities']>[string];

/**
 * Cómo reconocer cada dato entre las entidades del dispositivo de la zona:
 * primero por `translation_key` (Hydrawise), luego por el nombre de la entidad
 * y, por último, por tipo de sensor.
 */
const ROLES: Array<[Role, (id: string, r: Reg, st?: HassEntity) => boolean]> = [
  ['valve', (id) => domain(id) === 'valve'],
  ['auto', (id, r) => domain(id) === 'switch' && (r.translation_key === 'auto_watering' || /auto(matic)?_watering/.test(id))],
  ['manual', (id, r) => domain(id) === 'switch' && (r.translation_key === 'manual_watering' || /manual_watering/.test(id))],
  ['running', (id, r, st) => domain(id) === 'binary_sensor' && (['watering', 'is_watering'].includes(r.translation_key || '') || /_watering$/.test(id) || st?.attributes.device_class === 'running')],
  ['next', (id, r, st) => domain(id) === 'sensor' && (r.translation_key === 'next_cycle' || /next_(cycle|run)/.test(id) || st?.attributes.device_class === 'timestamp')],
  ['remaining', (id, r, st) => domain(id) === 'sensor' && (r.translation_key === 'watering_time' || /remaining/.test(id) || (st?.attributes.device_class === 'duration' && st.attributes.unit_of_measurement === 'min'))],
  ['today', (id, r, st) => domain(id) === 'sensor' && (r.translation_key === 'daily_active_water_time' || /daily_active_water(ing)?_time/.test(id) || (st?.attributes.device_class === 'duration' && st.attributes.unit_of_measurement === 's'))],
  ['water', (id, r, st) => domain(id) === 'sensor' && (r.translation_key === 'daily_active_water_use' || /daily_active_water_use/.test(id) || st?.attributes.device_class === 'water')],
];

const VALVE_RUNNING = ['open', 'opening'];

@customElement('inventa-irrigation-card')
export class InventaIrrigationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: IrrigationCardConfig;
  private _press = new Press(
    () => undefined,
    () => moreInfo(this, this._main()),
  );
  /** Entidades del dispositivo de la zona, por dato (se recalcula si cambia el registro). */
  private _roles: Partial<Record<Role, string>> = {};
  private _rolesFrom?: unknown;
  /** Mayor tiempo restante visto en este riego (para la barra de avance). */
  private _runMax?: number;

  public static getStubConfig(hass?: HomeAssistant): Partial<IrrigationCardConfig> {
    return { entity: Object.keys(hass?.states || {}).find((e) => e.startsWith('valve.')) || '' };
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: ['valve', 'switch'] } } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            { name: 'show_schedule', selector: { boolean: {} } },
          ],
        },
      ],
      computeLabel: labeler({ name: 'card_name', show_schedule: 'ir_show_schedule' }),
    };
  }

  public setConfig(config: IrrigationCardConfig): void {
    if (!config?.entity) throw new Error('Indica una entidad `valve.*` (zona de riego)');
    this._config = { show_schedule: true, ...config };
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions() {
    return { columns: 6, min_columns: 4, rows: 'auto' };
  }

  /** Busca en el dispositivo de la zona las entidades de cada dato. */
  private _findRoles(): void {
    const h = this.hass;
    if (!h || this._rolesFrom === h.entities) return;
    this._rolesFrom = h.entities;
    const id = this._config.entity;
    const out: Partial<Record<Role, string>> = {};
    const dev = h.entities?.[id]?.device_id;
    const siblings = dev ? Object.values(h.entities!).filter((e) => e.device_id === dev) : [];
    for (const [role, test] of ROLES) {
      const hit = siblings.find((e) => test(e.entity_id, e, h.states[e.entity_id]));
      if (hit) out[role] = hit.entity_id;
    }
    // La entidad elegida manda: si es la válvula o el interruptor de riego manual.
    if (domain(id) === 'valve') out.valve = id;
    else if (!out.valve) out.manual = id;
    this._roles = out;
  }

  /** Entidad principal (la que se abre en "más información"). */
  private _main(): string {
    return this._roles.valve || this._config.entity;
  }

  private _watched(): string[] {
    return [this._config.entity, ...Object.values(this._roles)] as string[];
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass') || changed.size > 1) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || old.entities !== this.hass?.entities || old.locale?.language !== this.hass?.locale?.language) return true;
    return this._watched().some((e) => old.states[e] !== this.hass?.states[e]);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) ensureTheme(this.hass);
    if (changed.has('hass') || changed.has('_config')) {
      if (changed.has('_config')) this._rolesFrom = undefined;
      this._findRoles();
    }
  }

  private _st(role: Role): HassEntity | undefined {
    const id = this._roles[role];
    return id ? this.hass?.states[id] : undefined;
  }

  private _num(role: Role): number | undefined {
    const st = this._st(role);
    const n = st ? parseFloat(st.state) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }

  /** ¿Está regando? Válvula abierta, interruptor manual encendido o sensor "regando". */
  private _running(): boolean {
    const v = this._st('valve');
    if (v && !isUnavailable(v)) return VALVE_RUNNING.includes(v.state);
    return this._st('manual')?.state === 'on' || this._st('running')?.state === 'on' || (this._num('remaining') || 0) > 0;
  }

  private _water(e: Event, on: boolean): void {
    stop(e);
    const h = this.hass;
    if (!h) return;
    const valve = this._roles.valve;
    if (valve) h.callService('valve', on ? 'open_valve' : 'close_valve', { entity_id: valve });
    else if (this._roles.manual) h.callService('switch', on ? 'turn_on' : 'turn_off', { entity_id: this._roles.manual });
  }

  private _toggleSchedule(e: Event): void {
    stop(e);
    const id = this._roles.auto;
    if (id) this.hass?.callService('switch', this.hass.states[id]?.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: id });
  }

  /** "12 min", "1 h 5 min", "45 s". */
  private _duration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)} s`;
    const m = Math.round(seconds / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
  }

  /** "lun 9 nov, 08:06" (y el año si no es este año). */
  private _date(iso: string): string {
    const d = new Date(iso);
    const l = this.hass?.locale?.language || 'es';
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleString(l, opts);
  }

  protected render() {
    if (!this._config || !this.hass) return nothing;
    const h = this.hass;
    const c = this._config;
    const main = this._main();
    const st = h.states[main];
    const na = isUnavailable(st);
    const name = entityName(h, main, c.name);
    const running = !na && this._running();
    const auto = this._st('auto');
    const suspended = auto?.state === 'off';
    const canWater = !!(this._roles.valve || this._roles.manual);

    const pill = na
      ? html`<span class="pill na">${t(h, 'unavailable')}</span>`
      : running
        ? html`<span class="pill run"><i class="dot"></i>${t(h, 'ir_watering')}</span>`
        : suspended
          ? html`<span class="pill w">${t(h, 'ir_suspended')}</span>`
          : html`<span class="pill">${t(h, 'ir_idle')}</span>`;

    // Línea principal: cuánto falta, o cuándo es el próximo riego.
    const remaining = this._num('remaining');
    const next = this._st('next');
    const nextOk = next && !isUnavailable(next) && !Number.isNaN(Date.parse(next.state));
    let main1: unknown;
    if (na) main1 = html`<span class="muted">${t(h, 'ir_offline')}</span>`;
    else if (running) main1 = remaining ? html`${t(h, 'ir_left')} <b>${this._duration(remaining * 60)}</b>` : html`<b>${t(h, 'ir_watering_now')}</b>`;
    else if (suspended) main1 = html`<span class="muted">${t(h, 'ir_no_schedule')}</span>`;
    else if (nextOk) main1 = html`${t(h, 'ir_next')} <b>${this._date(next!.state)}</b> <span class="muted">· ${relativeTime(h, next!.state)}</span>`;
    else main1 = html`<span class="muted">${t(h, 'ir_none_planned')}</span>`;

    // Barra de avance: parte llena y se vacía a medida que queda menos.
    if (running && remaining) this._runMax = Math.max(this._runMax || 0, remaining);
    else if (!running) this._runMax = undefined;
    const pct = running && remaining && this._runMax ? Math.max(4, Math.round((remaining / this._runMax) * 100)) : 100;

    const today = this._num('today');
    const water = this._num('water');
    const waterUnit = this._st('water')?.attributes.unit_of_measurement || 'L';
    const p = this._press;

    return html`<ha-card
      class="${na ? 'na' : ''} ${running ? 'on' : ''}"
      @pointerdown=${p.down}
      @pointerup=${p.cancel}
      @pointerleave=${p.cancel}
      @pointercancel=${p.cancel}
      @click=${p.click}
      @contextmenu=${p.menu}
    >
      <div class="top">
        <div class="ttl">
          <div class="ico"><ha-icon .icon=${c.icon || (running ? 'mdi:sprinkler-variant' : 'mdi:sprinkler')}></ha-icon></div>
          <span class="name">${name}</span>
        </div>
        ${pill}
      </div>
      <div class="line">${main1}</div>
      ${running ? html`<div class="flow" role="presentation"><div class="fill" style="width:${pct}%"></div></div>` : nothing}
      ${today !== undefined || water !== undefined
        ? html`<div class="facts">
            ${today !== undefined
              ? html`<div class="fact"><ha-icon icon="mdi:timer-outline"></ha-icon>${t(h, 'ir_today')} <b>${today ? this._duration(today) : '0 min'}</b></div>`
              : nothing}
            ${water !== undefined
              ? html`<div class="fact"><ha-icon icon="mdi:water-outline"></ha-icon>${t(h, 'ir_water')} <b>${formatNumber(h, water, water < 10 ? 1 : 0)} ${waterUnit}</b></div>`
              : nothing}
          </div>`
        : nothing}
      ${na
        ? nothing
        : html`<div class="btns">
            ${canWater
              ? html`<button class="act ${running ? 'stop' : 'go'}" @pointerdown=${stop} @click=${(e: Event) => this._water(e, !running)}>
                  <ha-icon .icon=${running ? 'mdi:stop' : 'mdi:play'}></ha-icon>${running ? t(h, 'stop') : t(h, 'ir_start')}
                </button>`
              : nothing}
            ${c.show_schedule !== false && auto && !isUnavailable(auto)
              ? html`<button class="act sched ${suspended ? '' : 'on'}" aria-pressed=${suspended ? 'false' : 'true'} @pointerdown=${stop} @click=${this._toggleSchedule}>
                  <ha-icon .icon=${suspended ? 'mdi:calendar-remove-outline' : 'mdi:calendar-clock-outline'}></ha-icon>${t(h, 'ir_schedule')}
                </button>`
              : nothing}
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
        transition: border-color 0.2s;
      }
      /* Regando: color agua, fondo teñido, ícono con halo y barra con agua que corre. */
      ha-card.on {
        border-color: var(--_cyan);
        background: linear-gradient(160deg, color-mix(in srgb, var(--_cyan) 16%, var(--_card)) 0%, var(--_card) 70%);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--_cyan) 35%, transparent), 0 6px 22px -10px var(--_cyan);
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
        transition: background 0.2s, color 0.2s;
      }
      .on .ico {
        position: relative;
        background: var(--_cyan);
        color: #fff;
      }
      .on .ico::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 12px;
        border: 2px solid var(--_cyan);
        animation: halo 1.8s ease-out infinite;
      }
      @keyframes halo {
        from { opacity: 0.8; transform: scale(1); }
        to { opacity: 0; transform: scale(1.45); }
      }
      .name {
        font-size: 14px;
        font-weight: 500;
        color: var(--_tx);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pill.run {
        background: var(--_cyan);
        color: #fff;
        font-weight: 500;
      }
      .pill .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #fff;
        animation: blink 1.2s ease-in-out infinite;
      }
      @keyframes blink {
        50% { opacity: 0.3; }
      }
      .flow {
        height: 6px;
        margin-top: 8px;
        border-radius: 3px;
        background: var(--_line);
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: 3px;
        background: repeating-linear-gradient(110deg, var(--_cyan) 0 10px, color-mix(in srgb, var(--_cyan) 60%, #fff) 10px 20px);
        background-size: 200% 100%;
        animation: run 1.4s linear infinite;
        transition: width 0.6s;
      }
      @keyframes run {
        to { background-position: -42px 0; }
      }
      .on .line b {
        color: var(--_cyan);
        font-size: 14px;
      }
      @media (prefers-reduced-motion: reduce) {
        .on .ico::after, .pill .dot, .fill { animation: none; }
      }
      .line {
        margin: 10px 0 0;
        font-size: 12px;
        color: var(--_tx2);
        min-height: 18px;
      }
      .line b {
        font-weight: 500;
        color: var(--_tx);
      }
      .muted {
        color: var(--_tx3);
      }
      .facts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .fact {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 26px;
        padding: 0 9px;
        border-radius: 999px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        font-size: 11px;
        color: var(--_tx2);
        white-space: nowrap;
        --mdc-icon-size: 14px;
      }
      .fact ha-icon {
        color: var(--_tx3);
      }
      .fact b {
        font-weight: 500;
        color: var(--_tx);
      }
      .btns {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
        gap: 6px;
        margin-top: 10px;
      }
      .act {
        font: inherit;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 0;
        padding: 0 8px;
        border-radius: 10px;
        border: 1px solid var(--_line);
        background: var(--_card2);
        color: var(--_tx2);
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        --mdc-icon-size: 16px;
      }
      .act.go {
        background: var(--_acc);
        border-color: var(--_acc);
        color: #fff;
      }
      .act.stop {
        background: var(--_cyan);
        border-color: var(--_cyan);
        color: #fff;
      }
      .act.sched.on {
        border-color: var(--_ok);
        color: var(--_ok);
      }
      .act:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-irrigation-card': InventaIrrigationCard;
  }
}
