import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ActionConfig, HomeAssistant } from '../../types';
import { ensureTheme, getResolvedMode, toggleMode, THEME_EVENT } from '../../theme';
import { navigate, runAction } from '../../actions';
import { docHass, t } from '../../i18n';
import { tokens } from '../../styles';
import { DEFAULT_BACKGROUND, holdBackground, releaseBackground } from '../../background';
import { openCalendarDialog, type InventaCalendarDialog } from '../../calendar/calendar-dialog';
import { NOTIFICATIONS_EVENT, computeAlerts, watchNotifications } from '../../alerts/alerts';
import type { ClimateScales } from '../../climate-scale';
import { openAlertsDialog, type InventaAlertsDialog } from '../../alerts/alerts-dialog';
import { openAssistantDialog, type InventaAssistantDialog } from '../../assistant/assistant-dialog';

export interface HeaderButton {
  /**
   * 'theme' = botón luna/sol que alterna el modo.
   * 'calendar' = botón 📅 que abre la agenda (o ejecuta `tap_action` si se indica).
   * 'alerts' = campana 🔔 con el número de avisos; abre el panel de avisos.
   * Cualquier otro valor = botón de acción.
   */
  type?: 'theme' | 'calendar' | 'alerts' | 'action';
  icon?: string;
  label?: string;
  tap_action?: ActionConfig;
  /** Entidad cuyo estado numérico se muestra como globo (se oculta si es 0). */
  badge_entity?: string;
  badge_color?: string;
}

export interface HeaderCardConfig {
  type: string;
  title?: string;
  icon?: string;
  logo?: string;
  logo_dark?: string;
  greeting?: boolean;
  name?: string;
  subtitle?: string;
  show_search?: boolean;
  search_placeholder?: string;
  search_tap_action?: ActionConfig;
  buttons?: HeaderButton[];
  /** Pinta el fondo del panel con el color del tema (por defecto sí). */
  background?: boolean;
  /** Fondo propio: cualquier valor CSS (color, degradado, `url(...)`). */
  background_style?: string;
  /** Botón de calendario (por defecto sí). Se agrega solo si `buttons` no trae uno. */
  calendar?: boolean;
  calendar_entities?: string[];
  calendar_days?: number;
  /** Vista Calendario propia: adónde lleva "Abrir calendario completo". */
  calendar_path?: string;
  /** Modo subpágina: muestra ← (vuelve a esta ruta) y el título en vez del logo y el saludo. */
  back_path?: string;
  /** Campana de avisos al final de los botones (por defecto no). */
  alerts?: boolean;
  /** Equipos que revisan los avisos (además de las notificaciones y actualizaciones de HA). */
  alert_entities?: string[];
  /** El buscador abre el asistente de Inventa (en vez de `search_tap_action`). */
  assistant?: boolean;
  /** Lista cerrada de equipos sobre los que actúa el asistente. */
  assistant_entities?: string[];
  /** Lo que el asistente no entienda, enviarlo al asistente de Home Assistant. */
  assist_fallback?: boolean;
  /** Factor forzado por clima (avisos y asistente); sin él se detecta solo. */
  climate_scale?: ClimateScales;
}

const DEFAULTS: Partial<HeaderCardConfig> = {
  icon: 'mdi:home-outline',
  greeting: true,
  show_search: true,
  search_tap_action: { action: 'assist' },
  buttons: [{ type: 'theme' }],
  background: true,
  calendar: true,
  calendar_days: 7,
};

/** En modo subpágina, lo que no se indique explícitamente se oculta. */
const SUBPAGE_DEFAULTS: Partial<HeaderCardConfig> = {
  greeting: false,
  show_search: false,
  calendar: false,
};

@customElement('inventa-header-card')
export class InventaHeaderCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: HeaderCardConfig;
  @state() private _mode = getResolvedMode();
  private _timer?: number;
  private _dialog?: InventaCalendarDialog;
  private _alertsDialog?: InventaAlertsDialog;
  private _assistantDialog?: InventaAssistantDialog;
  private _alertSig = '';
  private _onNotif = () => this.requestUpdate();
  private _onTheme = () => (this._mode = getResolvedMode());

  public static getStubConfig(): Partial<HeaderCardConfig> {
    return { buttons: [{ type: 'theme' }] };
  }

  /** Editor visual nativo de Home Assistant (ha-form). */
  public static getConfigForm() {
    return {
      schema: [
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'title', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
          ],
        },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'logo', selector: { text: {} } },
            { name: 'logo_dark', selector: { text: {} } },
          ],
        },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'greeting', selector: { boolean: {} } },
            { name: 'show_search', selector: { boolean: {} } },
          ],
        },
        { name: 'name', selector: { text: {} } },
        { name: 'subtitle', selector: { text: {} } },
        { name: 'search_placeholder', selector: { text: {} } },
        { name: 'search_tap_action', selector: { ui_action: {} } },
        {
          type: 'grid',
          name: '',
          schema: [
            { name: 'calendar', selector: { boolean: {} } },
            { name: 'calendar_days', selector: { number: { min: 1, max: 60, mode: 'box' } } },
          ],
        },
        { name: 'calendar_entities', selector: { entity: { domain: 'calendar', multiple: true } } },
        { name: 'calendar_path', selector: { text: {} } },
        { name: 'back_path', selector: { text: {} } },
        { name: 'background', selector: { boolean: {} } },
        { name: 'background_style', selector: { text: {} } },
        { name: 'buttons', selector: { object: {} } },
      ],
      computeLabel: (s: { name: string }) => t(docHass(), s.name as any) || s.name,
    };
  }

  public setConfig(config: HeaderCardConfig): void {
    if (!config) throw new Error('Configuración inválida');
    if (config.buttons && !Array.isArray(config.buttons)) throw new Error('`buttons` debe ser una lista');
    this._config = { ...DEFAULTS, ...(config.back_path ? SUBPAGE_DEFAULTS : {}), ...config };
    if (this.isConnected) this._syncBackground();
  }

  private _syncBackground(): void {
    const c = this._config;
    if (c && c.background !== false) holdBackground(this, c.background_style || DEFAULT_BACKGROUND);
    else releaseBackground(this);
  }

  /** Botones a mostrar: los configurados, con el de calendario al inicio y la campana al final si faltan. */
  private _buttons(): HeaderButton[] {
    let list = this._config.buttons || [];
    if (this._config.calendar !== false && !list.some((b) => b.type === 'calendar')) list = [{ type: 'calendar' }, ...list];
    if (this._config.alerts && !list.some((b) => b.type === 'alerts')) list = [...list, { type: 'alerts' }];
    return list;
  }

  private get _hasAlerts(): boolean {
    return !!this._config?.alerts || !!this._config?.buttons?.some((b) => b.type === 'alerts');
  }

  /** Cantidad y gravedad de avisos (para saber si hay que redibujar la campana). */
  private _alertSummary(): { n: number; crit: boolean } {
    const list = computeAlerts(this.hass, this._config.alert_entities, this._config.climate_scale);
    return { n: list.length, crit: list.some((a) => a.level === 'crit') };
  }

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions() {
    return { columns: 'full', rows: 'auto' };
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(THEME_EVENT, this._onTheme);
    window.addEventListener(NOTIFICATIONS_EVENT, this._onNotif);
    this._syncBackground();
    // El saludo cambia con la hora aunque no cambien estados.
    this._timer = window.setInterval(() => this.requestUpdate(), 5 * 60 * 1000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(THEME_EVENT, this._onTheme);
    window.removeEventListener(NOTIFICATIONS_EVENT, this._onNotif);
    window.clearInterval(this._timer);
    releaseBackground(this);
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!changed.has('hass')) return true;
    // La agenda abierta sigue recibiendo `hass` aunque el encabezado no se redibuje.
    if (this._dialog?.isConnected) this._dialog.hass = this.hass;
    if (this._alertsDialog?.isConnected) this._alertsDialog.hass = this.hass;
    if (this._assistantDialog?.isConnected) this._assistantDialog.hass = this.hass;
    if (this._hasAlerts) {
      watchNotifications(this.hass);
      const a = this._alertSummary();
      const sig = `${a.n}|${a.crit}`;
      if (sig !== this._alertSig) {
        this._alertSig = sig;
        return true;
      }
    }
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass) return true;
    if (old.user?.name !== this.hass.user?.name || old.locale?.language !== this.hass.locale?.language) return true;
    if (old.themes?.darkMode !== this.hass.themes?.darkMode) return true;
    return (this._config?.buttons || []).some(
      (b) => b.badge_entity && old.states[b.badge_entity] !== this.hass!.states[b.badge_entity],
    );
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass')) {
      ensureTheme(this.hass);
      this._mode = getResolvedMode();
    }
  }

  private _greeting(): string {
    const h = new Date().getHours();
    const g = h < 12 ? t(this.hass, 'good_morning') : h < 20 ? t(this.hass, 'good_afternoon') : t(this.hass, 'good_evening');
    const name = this._config.name || this.hass?.user?.name;
    return name ? `${g}, ${name}` : g;
  }

  private _renderBrand() {
    const c = this._config;
    const src = this._mode === 'dark' && c.logo_dark ? c.logo_dark : c.logo;
    if (src) return html`<img class="logo" src=${src} alt=${c.title || t(this.hass, 'my_home')} />`;
    return html`<ha-icon class="brand-icon" .icon=${c.icon}></ha-icon>
      <span class="brand-title">${c.title || t(this.hass, 'my_home')}</span>`;
  }

  private _renderSearch() {
    const c = this._config;
    const open = () =>
      c.assistant
        ? (this._assistantDialog = openAssistantDialog(this.hass, c.assistant_entities || [], !!c.assist_fallback, c.climate_scale))
        : runAction(this, c.search_tap_action);
    return html`<button class="search" aria-haspopup=${c.assistant ? 'dialog' : nothing} @click=${open}>
      <ha-icon icon="mdi:message-text-outline"></ha-icon>
      <span>${c.search_placeholder || t(this.hass, 'search_placeholder')}</span>
    </button>`;
  }

  private _renderButton(b: HeaderButton) {
    if (b.type === 'theme') {
      const dark = this._mode === 'dark';
      return html`<button
        class="icon-btn theme ${dark ? '' : 'is-light'}"
        title=${t(this.hass, 'toggle_theme')}
        aria-label=${t(this.hass, 'toggle_theme')}
        @click=${() => toggleMode()}
      >
        <ha-icon .icon=${dark ? 'mdi:weather-night' : 'mdi:white-balance-sunny'}></ha-icon>
      </button>`;
    }
    if (b.type === 'alerts' && !b.tap_action) {
      const { n, crit } = this._alertSummary();
      const label = b.label || t(this.hass, 'alerts');
      return html`<button
        class="icon-btn"
        title=${label}
        aria-label=${n ? `${label}: ${n}` : label}
        aria-haspopup="dialog"
        @click=${() => (this._alertsDialog = openAlertsDialog(this.hass, this._config.alert_entities || [], this._config.climate_scale))}
      >
        <ha-icon .icon=${b.icon || 'mdi:bell-outline'}></ha-icon>
        ${n ? html`<span class="badge" style=${crit ? 'background:var(--_na)' : ''}>${n > 99 ? '99+' : n}</span>` : nothing}
      </button>`;
    }
    if (b.type === 'calendar' && !b.tap_action) {
      const label = b.label || t(this.hass, 'calendar_label');
      return html`<button
        class="icon-btn"
        title=${label}
        aria-label=${label}
        aria-haspopup="dialog"
        @click=${() =>
          (this._dialog = openCalendarDialog(this.hass, {
            entities: this._config.calendar_entities,
            days: this._config.calendar_days,
            calendarPath: this._config.calendar_path,
          }))}
      >
        <ha-icon .icon=${b.icon || 'mdi:calendar-blank-outline'}></ha-icon>
      </button>`;
    }
    const st = b.badge_entity ? this.hass?.states[b.badge_entity] : undefined;
    const n = st ? Number(st.state) : NaN;
    const badge = Number.isFinite(n) && n > 0 ? (n > 99 ? '99+' : String(n)) : '';
    return html`<button
      class="icon-btn"
      title=${b.label || ''}
      aria-label=${b.label || b.icon || ''}
      @click=${() => runAction(this, b.tap_action)}
    >
      <ha-icon .icon=${b.icon || 'mdi:gesture-tap'}></ha-icon>
      ${badge ? html`<span class="badge" style=${b.badge_color ? `background:${b.badge_color}` : ''}>${badge}</span>` : nothing}
    </button>`;
  }

  /** Subpágina: ← + título/subtítulo. */
  private _renderSubpage() {
    const c = this._config;
    return html`
      <div class="brand">
        <button class="icon-btn" title=${t(this.hass, 'back')} aria-label=${t(this.hass, 'back')} @click=${() => navigate(c.back_path!)}>
          <ha-icon icon="mdi:arrow-left"></ha-icon>
        </button>
      </div>
      <div class="user">
        <div class="greet page-title">${c.title || ''}</div>
        ${c.subtitle ? html`<div class="sub">${c.subtitle}</div>` : nothing}
      </div>
    `;
  }

  protected render() {
    if (!this._config) return nothing;
    const c = this._config;
    if (c.back_path) {
      const search = c.show_search === true;
      return html`<ha-card>
        <div class="hdr sub-page ${search ? 'with-search' : ''}">
          ${this._renderSubpage()} ${search ? this._renderSearch() : nothing}
          <div class="actions">${this._buttons().map((b) => this._renderButton(b))}</div>
        </div>
      </ha-card>`;
    }
    const search = c.show_search !== false;
    const subtitle = c.subtitle ?? t(this.hass, 'home_summary');
    return html`
      <ha-card>
        <div class="hdr ${search ? 'with-search' : ''}">
          <div class="brand">${this._renderBrand()}</div>
          <div class="user">
            ${c.greeting !== false ? html`<div class="greet">${this._greeting()}</div>` : nothing}
            ${subtitle ? html`<div class="sub">${subtitle}</div>` : nothing}
          </div>
          ${search ? this._renderSearch() : nothing}
          <div class="actions">${this._buttons().map((b) => this._renderButton(b))}</div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      ha-card {
        padding: 10px 16px;
      }
      .hdr {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: 'brand user actions';
        align-items: center;
        column-gap: 18px;
      }
      .hdr.with-search {
        grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.2fr) auto;
        grid-template-areas: 'brand user search actions';
      }
      .brand {
        grid-area: brand;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 52px;
        padding-right: 18px;
        border-right: 1px solid var(--_line);
        min-width: 0;
      }
      .logo {
        height: 48px;
        width: auto;
        max-width: 170px;
        object-fit: contain;
        display: block;
      }
      .brand-icon {
        --mdc-icon-size: 26px;
        color: var(--_acc);
      }
      .brand-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--_tx);
        white-space: nowrap;
      }
      .user {
        grid-area: user;
        min-width: 0;
        padding-left: 4px;
      }
      .greet {
        font-size: 15px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--_tx);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sub {
        font-size: 12px;
        line-height: 1.3;
        color: var(--_tx3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .search {
        grid-area: search;
        height: 38px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-radius: 10px;
        background: var(--_card2);
        border: 1px solid var(--_line);
        color: var(--_tx3);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        text-align: left;
        min-width: 0;
        --mdc-icon-size: 18px;
        transition: border-color 0.15s;
      }
      .search:hover {
        border-color: var(--_tx3);
      }
      .search:focus-visible {
        outline: 2px solid var(--_acc);
        outline-offset: 2px;
      }
      .search span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .actions {
        grid-area: actions;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .sub-page .brand {
        height: 44px;
        padding-right: 0;
        border-right: none;
      }
      .page-title {
        font-size: 16px;
      }
      .theme.is-light {
        color: var(--_amb);
      }
      .badge {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        box-sizing: border-box;
        border-radius: 999px;
        background: var(--_heat);
        color: #fff;
        font-size: 10px;
        font-weight: 600;
        display: grid;
        place-items: center;
        border: 2px solid var(--_card);
      }

      /* Pantallas angostas: logo + botones / saludo / buscador */
      @container (max-width: 600px) {
        .hdr,
        .hdr.with-search {
          grid-template-columns: minmax(0, 1fr) auto;
          grid-template-areas:
            'brand actions'
            'user user'
            'search search';
          row-gap: 10px;
          column-gap: 12px;
        }
        .brand {
          border-right: none;
          padding-right: 0;
          height: 42px;
        }
        .logo {
          height: 38px;
          max-width: 140px;
        }
        .user {
          padding-left: 1px;
        }
        .greet,
        .sub {
          white-space: normal;
        }
        .actions {
          gap: 8px;
        }
        /* Subpágina en celular: ← título … botones en una fila. */
        .hdr.sub-page,
        .hdr.sub-page.with-search {
          grid-template-columns: auto minmax(0, 1fr) auto;
          grid-template-areas:
            'brand user actions'
            'search search search';
        }
        .sub-page .greet {
          white-space: nowrap;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'inventa-header-card': InventaHeaderCard;
  }
}
