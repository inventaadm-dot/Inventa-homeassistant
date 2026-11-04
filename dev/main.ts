// Entorno de pruebas: simula lo mínimo de Home Assistant (ha-card, ha-icon, hass)
// para ver las tarjetas en el navegador con `npm run dev`.
import * as mdi from '@mdi/js';
import '../src/index';
import type { HomeAssistant } from '../src/types';
import { generateDashboard } from '../src/strategy/dashboard-strategy';
import { resolvePath } from '../src/actions';
import { AssistantEngine } from '../src/assistant/engine';
(window as any).inventaDev = { generateDashboard, resolvePath, AssistantEngine };

// --- Stubs de componentes de HA -------------------------------------------
class HaCard extends HTMLElement {
  connectedCallback() {
    this.style.display = 'block';
  }
}
customElements.define('ha-card', HaCard);

class HaIcon extends HTMLElement {
  static observedAttributes = ['icon'];
  private _icon = '';
  set icon(v: string) {
    this._icon = v;
    this.render();
  }
  get icon() {
    return this._icon;
  }
  attributeChangedCallback(_: string, __: string, v: string) {
    this.icon = v;
  }
  connectedCallback() {
    this.render();
  }
  // Igual que en HA, el ícono vive en shadow DOM (si se escribe en los hijos,
  // desordena las marcas que usa Lit al clonar plantillas).
  private _root = this.attachShadow({ mode: 'open' });
  private render() {
    const key = 'mdi' + this._icon.replace('mdi:', '').split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
    const path = (mdi as Record<string, string>)[key] || mdi.mdiHelpCircleOutline;
    const size = 'var(--mdc-icon-size, 24px)';
    this.style.display = 'inline-flex';
    this._root.innerHTML = `<svg viewBox="0 0 24 24" style="width:${size};height:${size};fill:currentColor"><path d="${path}"/></svg>`;
  }
}
customElements.define('ha-icon', HaIcon);

// --- hass simulado ---------------------------------------------------------
/** Fecha ISO dentro de `d` días a la hora indicada. */
function inDays(d: number, h: number, m: number): string {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}

/** Entidades que crea Hunter Hydrawise por zona (mismos nombres que en HA). */
function hydrawiseZone(slug: string, name: string, z: { open: boolean; auto: boolean; next: string | null; remaining: number; today: number; water?: number }) {
  const out: Record<string, any> = {
    [`valve.${slug}`]: st(`valve.${slug}`, z.open ? 'open' : 'closed', { friendly_name: name, device_class: 'water', supported_features: 3 }),
    [`switch.${slug}_automatic_watering`]: st(`switch.${slug}_automatic_watering`, z.auto ? 'on' : 'off', { friendly_name: `${name} Automatic watering` }),
    [`switch.${slug}_manual_watering`]: st(`switch.${slug}_manual_watering`, z.open ? 'on' : 'off', { friendly_name: `${name} Manual watering` }),
    [`sensor.${slug}_next_cycle`]: st(`sensor.${slug}_next_cycle`, z.next || 'unknown', { friendly_name: `${name} Next cycle`, device_class: 'timestamp' }),
    [`sensor.${slug}_remaining_watering_time`]: st(`sensor.${slug}_remaining_watering_time`, String(z.remaining), { friendly_name: `${name} Remaining watering time`, device_class: 'duration', unit_of_measurement: 'min' }),
    [`sensor.${slug}_daily_active_watering_time`]: st(`sensor.${slug}_daily_active_watering_time`, String(z.today), { friendly_name: `${name} Daily active watering time`, device_class: 'duration', unit_of_measurement: 's' }),
    [`binary_sensor.${slug}_watering`]: st(`binary_sensor.${slug}_watering`, z.open ? 'on' : 'off', { friendly_name: `${name} Watering`, device_class: 'running' }),
  };
  if (z.water !== undefined) out[`sensor.${slug}_daily_active_water_use`] = st(`sensor.${slug}_daily_active_water_use`, String(z.water), { friendly_name: `${name} Daily active water use`, device_class: 'water', unit_of_measurement: 'L' });
  return out;
}

/** Registro de entidades de una zona Hydrawise (todas en el mismo dispositivo). */
const TK: Record<string, string | undefined> = { automatic_watering: 'auto_watering', manual_watering: 'manual_watering', next_cycle: 'next_cycle', remaining_watering_time: 'watering_time', daily_active_watering_time: 'daily_active_water_time', daily_active_water_use: 'daily_active_water_use', watering: 'watering' };
function hydrawiseRegistry(slug: string, states: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const id of Object.keys(states)) {
    const [, obj] = id.split('.');
    if (obj !== slug && !obj.startsWith(`${slug}_`)) continue;
    const suffix = obj.slice(slug.length + 1);
    out[id] = { entity_id: id, device_id: `hw_${slug}`, platform: 'hydrawise', translation_key: TK[suffix] ?? null, area_id: slug.startsWith('p1') ? 'jardin' : 'canchas' };
  }
  return out;
}

const st = (entity_id: string, state: string, attributes: Record<string, any> = {}) => ({
  entity_id, state, attributes, last_changed: '2026-10-29T08:00:00Z', last_updated: '',
});

// Eventos de ejemplo relativos a hoy.
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const dateOnly = (dayOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const EVENTS: Record<string, any[]> = {
  'calendar.familia': [
    { summary: 'Cumpleaños de Sofía', start: { date: dateOnly(0) }, end: { date: dateOnly(1) } },
    { summary: 'Cena con los abuelos', start: { dateTime: at(0, 20, 30) }, end: { dateTime: at(0, 22) }, location: 'Casa' },
    { summary: 'Partido de Pedro', start: { dateTime: at(2, 10) }, end: { dateTime: at(2, 11, 30) }, location: 'Club Deportivo' },
  ],
  'calendar.hogar': [
    { summary: 'Retiro de basura reciclable', start: { dateTime: at(1, 8) }, end: { dateTime: at(1, 9) } },
    { summary: 'Mantención caldera', start: { dateTime: at(3, 15) }, end: { dateTime: at(3, 16) }, location: 'Técnico ACME' },
  ],
};

const home = {
  'light.living': st('light.living', 'on', { friendly_name: 'Living', brightness: 180, supported_color_modes: ['brightness'] }),
  'light.comedor': st('light.comedor', 'off', { friendly_name: 'Comedor', supported_color_modes: ['brightness'] }),
  'light.cocina': st('light.cocina', 'on', { friendly_name: 'Cocina', supported_color_modes: ['onoff'] }),
  'light.jardin': st('light.jardin', 'unavailable', { friendly_name: 'Jardín' }),
  'climate.living': st('climate.living', 'cool', { friendly_name: 'Living', temperature: 21, current_temperature: 22.5, min_temp: 16, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['off', 'cool', 'heat', 'auto'], hvac_action: 'cooling', fan_mode: 'auto' }),
  'climate.oficina': st('climate.oficina', 'heat_cool', { friendly_name: 'Oficina (Tuya ×5)', temperature: 4, current_temperature: 4.1, min_temp: 1, max_temp: 7, target_temp_step: 0.5, hvac_modes: ['off', 'heat_cool'], preset_modes: ['auto', 'manual'], preset_mode: 'manual' }),
  'climate.dormitorio': st('climate.dormitorio', 'cool', { friendly_name: 'Dormitorio', temperature: 20, current_temperature: 25.5, min_temp: 16, max_temp: 30, hvac_modes: ['off', 'cool'], fan_mode: 'high' }),
  'light.pasillo': st('light.pasillo', 'off', { friendly_name: 'Pasillo', supported_color_modes: ['onoff'] }),
  'switch.terraza': st('switch.terraza', 'on', { friendly_name: 'Terraza' }),
  'switch.servidor': st('switch.servidor', 'on', { friendly_name: 'Rack servidor (no debe aparecer)' }),
  'sensor.humedad_bano': st('sensor.humedad_bano', '58', { friendly_name: 'Humedad Baño', unit_of_measurement: '%', device_class: 'humidity' }),
  'sensor.consumo': st('sensor.consumo', '2.4', { friendly_name: 'Consumo de la casa', unit_of_measurement: 'kW', device_class: 'power' }),
  'binary_sensor.pasillo': st('binary_sensor.pasillo', 'on', { friendly_name: 'Movimiento pasillo', device_class: 'motion' }),
  'binary_sensor.humo': st('binary_sensor.humo', 'on', { friendly_name: 'Humo Cocina', device_class: 'smoke' }),
  'person.ana': st('person.ana', 'home', { friendly_name: 'Ana' }),
  'person.pedro': st('person.pedro', 'not_home', { friendly_name: 'Pedro' }),
  'scene.cine': st('scene.cine', 'scening', { friendly_name: 'Noche de cine', icon: 'mdi:movie-open-outline' }),
  'script.buenas_noches': st('script.buenas_noches', 'off', { friendly_name: 'Buenas noches', icon: 'mdi:weather-night' }),
  'cover.living': st('cover.living', 'open', { friendly_name: 'Cortina Living', current_position: 65, supported_features: 15 }),
  'media_player.tv': st('media_player.tv', 'playing', { friendly_name: 'TV Living', app_name: 'Netflix', media_title: 'Serie', volume_level: 0.4, supported_features: 21437 }),
  'camera.patio': st('camera.patio', 'idle', { friendly_name: 'Patio', entity_picture: '/legacy/corporate-dashboard/logo_horizontal_blanco_recortado.svg' }),
  'camera.garaje': st('camera.garaje', 'unavailable', { friendly_name: 'Garaje' }),
  'fan.dormitorio': st('fan.dormitorio', 'on', { friendly_name: 'Ventilador Dormitorio', percentage: 50, percentage_step: 25, oscillating: false, supported_features: 3 }),
  'lock.principal': st('lock.principal', 'locked', { friendly_name: 'Puerta principal' }),
  'lock.garaje': st('lock.garaje', 'unlocked', { friendly_name: 'Puerta del garaje' }),
  'alarm_control_panel.casa': st('alarm_control_panel.casa', 'disarmed', { friendly_name: 'Alarma Casa', supported_features: 63 }),
  'vacuum.robot': st('vacuum.robot', 'cleaning', { friendly_name: 'Robot Aspiradora', battery_level: 82, supported_features: 8220 }),
  'input_number.volumen': st('input_number.volumen', '30', { friendly_name: 'Volumen' }),
  'binary_sensor.puerta': st('binary_sensor.puerta', 'on', { friendly_name: 'Puerta principal', device_class: 'door' }),
  'weather.casa': st('weather.casa', 'sunny', { friendly_name: 'Casa', temperature: 19, humidity: 48 }),
  ...hydrawiseZone('p1_cabecera', 'P1 - Cabecera', { open: false, auto: true, next: inDays(6, 8, 6), remaining: 0, today: 900 }),
  ...hydrawiseZone('p1_norte_360', 'P1 norte 360', { open: true, auto: true, next: inDays(1, 8, 6), remaining: 12, today: 480, water: 136.4 }),
  ...hydrawiseZone('canchas_6_y_7', 'Canchas 6 y 7', { open: false, auto: false, next: null, remaining: 0, today: 0 }),
};

const withCalendars = {
  ...home,
  'sensor.avisos': st('sensor.avisos', '3'),
  'calendar.familia': st('calendar.familia', 'off', { friendly_name: 'Familia' }),
  'calendar.hogar': st('calendar.hogar', 'off', { friendly_name: 'Hogar' }),
};

const hass: HomeAssistant = {
  states: withCalendars,
  user: { id: '1', name: 'Ana', is_admin: true },
  areas: {
    living: { area_id: 'living', name: 'Living' },
    dormitorio: { area_id: 'dormitorio', name: 'Dormitorio' },
    cocina: { area_id: 'cocina', name: 'Cocina' },
    jardin: { area_id: 'jardin', name: 'Jardín' },
    canchas: { area_id: 'canchas', name: 'Canchas' },
  },
  entities: {
    'light.living': { entity_id: 'light.living', area_id: 'living' },
    'light.comedor': { entity_id: 'light.comedor', area_id: 'living' },
    'climate.living': { entity_id: 'climate.living', area_id: 'living' },
    'climate.dormitorio': { entity_id: 'climate.dormitorio', device_id: 'dev1' },
    'light.cocina': { entity_id: 'light.cocina', area_id: 'cocina' },
    'switch.terraza': { entity_id: 'switch.terraza', area_id: 'cocina' },
    'binary_sensor.puerta': { entity_id: 'binary_sensor.puerta', area_id: 'living' },
    ...hydrawiseRegistry('p1_cabecera', home),
    ...hydrawiseRegistry('p1_norte_360', home),
    ...hydrawiseRegistry('canchas_6_y_7', home),
  },
  devices: { dev1: { id: 'dev1', area_id: 'dormitorio' } },
  connection: {
    subscribeMessage: async (cb: (m: any) => void) => {
      const conds = ['partlycloudy', 'rainy', 'pouring', 'snowy', 'lightning-rainy', 'fog', 'clear-night'];
      cb({ forecast: conds.map((c, i) => ({ datetime: at(i + 1, 12), condition: c, temperature: 18 + i, templow: 9 + i })) });
      return () => undefined;
    },
  } as any,
  locale: { language: 'es' },
  themes: { darkMode: true },
  config: { location_name: 'Casa' },
  callService: async (...args) => {
    console.log('callService', args);
    const [d, s, data] = args as [string, string, any];
    const id = data?.entity_id as string;
    const cur = els[0].hass.states[id];
    if (!cur) return;
    let next = cur;
    if (s === 'toggle') next = { ...cur, state: cur.state === 'on' ? 'off' : 'on' };
    if (d === 'light' && s === 'turn_on') next = { ...cur, state: 'on', attributes: { ...cur.attributes, brightness: Math.round((data.brightness_pct / 100) * 255) } };
    if (d === 'valve') next = { ...cur, state: s === 'open_valve' ? 'open' : 'closed' };
    if (d === 'switch' && (s === 'turn_on' || s === 'turn_off')) next = { ...cur, state: s === 'turn_on' ? 'on' : 'off' };
    if (d === 'climate' && s === 'set_temperature') next = { ...cur, attributes: { ...cur.attributes, temperature: data.temperature } };
    // Como HA: un objeto hass nuevo en cada cambio (sin mutar el anterior).
    // Como Hydrawise: solo cambia la entidad tocada; la válvula se entera en la próxima consulta.
    if (next !== cur && next.state !== cur.state) next = { ...next, last_changed: new Date().toISOString() };
    const h = { ...els[0].hass, states: { ...els[0].hass.states, [id]: next } };
    els.forEach((el) => (el.hass = h));
  },
  callWS: async (msg: any) => {
    const id = msg.entity_ids?.[0];
    const base = parseFloat(withCalendars[id as keyof typeof withCalendars]?.state || '10');
    return { [id]: Array.from({ length: 48 }, (_, i) => ({ s: String(base * (0.8 + 0.2 * Math.sin(i / 5) + i / 240)) })) } as any;
  },
  callApi: async (method: string, path: string) => {
    console.log('callApi', method, path);
    await new Promise((r) => setTimeout(r, 300));
    const id = path.split('?')[0].replace('calendars/', '');
    return (EVENTS[id] || []) as any;
  },
};

// Simula loadCardHelpers: en lugar del calendario de HA dibuja un recuadro con el nombre de la vista.
(window as any).loadCardHelpers = async () => ({
  createCardElement: (cfg: any) => {
    const el = document.createElement('ha-card') as any;
    el.style.cssText = 'display:block;min-height:260px;padding:16px;background:var(--ha-card-background);color:var(--primary-text-color);border:var(--ha-card-border-width) solid var(--ha-card-border-color);border-radius:var(--ha-card-border-radius)';
    el.innerHTML = `<b>Calendario de HA</b> · ${cfg.initial_view}<br><small style="color:var(--secondary-text-color)">${cfg.entities.join(', ')}${cfg.title ? ' · ' + cfg.title : ''}</small>`;
    return el;
  },
});

window.addEventListener('hass-action', (e: Event) => console.log('hass-action', (e as CustomEvent).detail));
window.addEventListener('ll-custom', (e: Event) => console.log('ll-custom', (e as CustomEvent).detail));
window.addEventListener('location-changed', () => console.log('navigate →', location.pathname + location.search));

const full = {
  type: 'custom:inventa-header-card',
  buttons: [
    { type: 'theme' },
    { icon: 'mdi:bell-outline', label: 'Avisos', badge_entity: 'sensor.avisos', tap_action: { action: 'fire-dom-event', avisos: 'toggle' } },
  ],
};

const configs: Record<string, any> = {
  c1: { type: 'custom:inventa-header-card' },
  c2: { ...full, logo: '/legacy/corporate-dashboard/logo_horizontal_blanco_recortado.svg', subtitle: 'Resumen de la oficina de hoy' },
  c3: { type: 'custom:inventa-header-card', show_search: false, title: 'Casa de Playa', icon: 'mdi:beach', buttons: full.buttons },
  c4: full,
  c5: full,
  k1: { type: 'custom:inventa-calendar-card' },
  k2: { type: 'custom:inventa-calendar-card', title: 'Familia', entities: ['calendar.familia'], max_events: 2 },
  s1: { type: 'custom:inventa-header-card', back_path: '/dev/', title: 'Calendario', subtitle: 'Agenda de la casa' },
  k3: { type: 'custom:inventa-calendar-card', view: 'full' },
  s2: { type: 'custom:inventa-header-card', back_path: '/dev/', title: 'Calendario', subtitle: 'Agenda de la casa' },
  t1: { type: 'custom:inventa-stat-card', name: 'Temperatura promedio', icon: 'mdi:thermometer', entities: ['climate.living', 'climate.dormitorio', 'climate.oficina'], attribute: 'current_temperature', unit: '°C' },
  t2: { type: 'custom:inventa-stat-card', name: 'Luces encendidas', icon: 'mdi:lightbulb-outline', entities: ['light.living', 'light.comedor', 'light.cocina', 'light.jardin'] },
  t3: { type: 'custom:inventa-stat-card', name: 'Climas activos', icon: 'mdi:fan', entities: ['climate.living', 'climate.dormitorio'], mode: 'count' },
  w1: { type: 'custom:inventa-weather-card', entity: 'weather.casa', forecast_days: 7 },
  l1: { type: 'custom:inventa-light-card', entity: 'light.living' },
  l2: { type: 'custom:inventa-light-card', entity: 'light.comedor' },
  l3: { type: 'custom:inventa-light-card', entity: 'light.cocina' },
  l4: { type: 'custom:inventa-light-card', entity: 'light.jardin' },
  m1: { type: 'custom:inventa-climate-card', entity: 'climate.living' },
  m2: { type: 'custom:inventa-climate-card', entity: 'climate.dormitorio' },
  m3: { type: 'custom:inventa-climate-card', entity: 'climate.oficina' },
  r1: { type: 'custom:inventa-irrigation-card', entity: 'valve.p1_cabecera' },
  r2: { type: 'custom:inventa-irrigation-card', entity: 'valve.p1_norte_360' },
  r3: { type: 'custom:inventa-irrigation-card', entity: 'switch.canchas_6_y_7_manual_watering' },
};

// eslint-disable-next-line prefer-const
let els: any[] = [];
els = Object.entries(configs).map(([id, cfg]) => {
  const el = document.getElementById(id) as any;
  el.setConfig(cfg);
  el.hass = hass;
  return el;
});

// Bloques del panel Inventa tal como los genera la estrategia.
const generated = generateDashboard(
  {
    type: 'custom:inventa',
    entities: [
      'climate.living', 'climate.dormitorio', 'climate.oficina', 'light.living', 'light.comedor', 'light.cocina', 'switch.terraza', 'light.pasillo',
      'cover.living', 'media_player.tv', 'camera.patio', 'camera.garaje', 'fan.dormitorio', 'lock.principal', 'lock.garaje', 'alarm_control_panel.casa', 'vacuum.robot', 'binary_sensor.puerta', 'binary_sensor.humo', 'binary_sensor.pasillo',
      'sensor.humedad_bano', 'sensor.consumo', 'person.ana', 'person.pedro', 'scene.cine', 'script.buenas_noches', 'input_number.volumen',
      'valve.p1_cabecera', 'valve.p1_norte_360', 'switch.canchas_6_y_7_manual_watering',
    ],
  },
  hass,
);
for (const sec of generated.views[0].sections as any[]) {
  for (const cfg of sec.cards) {
    if (cfg.type !== 'custom:inventa-group-card') continue;
    const el = document.createElement('inventa-group-card') as any;
    el.setConfig(cfg);
    el.hass = hass;
    document.getElementById('strategy')!.appendChild(el);
    els.push(el);
  }
}

// Editor del panel: subida de logo simulada (devuelve el SVG de Inventa).
const ed = document.getElementById('ed') as any;
ed.hass = { ...hass, fetchWithAuth: async () => new Response(JSON.stringify({ id: 'demo' })) };
ed.setConfig({ type: 'custom:inventa', title: 'Casa Huina' });
ed.addEventListener('config-changed', (e: any) => {
  console.log('config-changed', e.detail.config);
  if (e.detail.config.logo?.includes('demo')) e.detail.config.logo = '/legacy/corporate-dashboard/logo_horizontal_blanco_recortado.svg';
  ed.setConfig(e.detail.config);
});

// Botón de prueba: simular un Home Assistant sin calendarios.
let noCal = false;
document.getElementById('toggle-cal')!.addEventListener('click', (e) => {
  noCal = !noCal;
  const states = noCal ? { ...home, 'sensor.avisos': withCalendars['sensor.avisos'] } : withCalendars;
  const next = { ...hass, states };
  els.forEach((el) => (el.hass = next));
  (e.target as HTMLElement).textContent = noCal ? 'Simular: con calendarios' : 'Simular: sin calendarios';
});
