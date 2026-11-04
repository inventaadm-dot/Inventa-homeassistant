// Estrategia de panel "Inventa": arma el panel completo sin escribir YAML.
//
// Se elige en Ajustes → Paneles → Añadir panel → "Paneles de la comunidad".
// Home Assistant llama a `generate()` cada vez que se abre el panel, así que
// los paneles generados reciben solas las mejoras de cada versión nueva.
// Con "Tomar el control" el panel pasa a tarjetas normales editables.
//
// Inicio (de arriba abajo), siempre ordenado POR TIPO de equipo, como el
// Corporate Dashboard:
//   encabezado · resumen · tiempo · bloques por tipo · agenda (pie).
// Los bloques vienen VACÍOS: el usuario elige en el editor (✏️) los equipos
// que quiere mostrar (de cualquier tipo) y cada uno va solo a su bloque, en
// el orden elegido. Orden fijo de bloques: Climatización · Luces · Persianas ·
// Multimedia · Seguridad · Cámaras · Riego · Sensores · Personas · Aspiradoras ·
// Escenas y rutinas · Otros. Un bloque sin equipos no se muestra. Si los
// equipos de un bloque son de varias áreas, aparecen chips para filtrar.
// Calendario (subpágina): encabezado ← · mes + lista.
//
// Las rutas internas son relativas ("inicio", "calendario"): funcionan con
// cualquier nombre de panel (ver `resolvePath` en actions.ts).

import type { HomeAssistant } from '../types';
import { t, type StringKey } from '../i18n';
import { domain } from '../ha';
import './strategy-editor';

/** Opciones (opcionales) en `strategy:` del panel. */
export interface InventaStrategyConfig {
  type: string;
  title?: string;
  icon?: string;
  logo?: string;
  logo_dark?: string;
  subtitle?: string;
  calendar_entities?: string[];
  /** Agenda al final del panel (por defecto sí). */
  show_agenda?: boolean;
  weather_entity?: string;
  /** Equipos a mostrar (cualquier tipo); cada uno va a su bloque, en este orden. */
  entities?: string[];
  /** Forma anterior (v0.9): se suman a `entities`. */
  climates?: string[];
  lights?: string[];
  /** Escala por clima para equipos que reportan mal, p. ej. `{ climate.living: 5 }`. */
  climate_scale?: Record<string, number>;
  /** Forma simple (editor visual): estos climas usan `scale_factor` (por defecto 5). */
  scaled_climates?: string[];
  scale_factor?: number;
  /** Lo que el asistente no entienda, enviarlo al asistente de Home Assistant. */
  assist_fallback?: boolean;
}

const P = 'custom:inventa-';
/** Copia solo las opciones definidas (para no pisar los valores por defecto de las tarjetas). */
function pick<T extends object>(src: T, keys: Array<keyof T>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (src[k] !== undefined && src[k] !== '') out[k] = src[k];
  return out;
}

/** Clases de sensor binario que van al bloque Seguridad. */
const SECURITY_CLASSES = ['door', 'window', 'garage_door', 'opening', 'motion', 'occupancy', 'presence', 'smoke', 'gas', 'carbon_monoxide', 'moisture', 'safety', 'tamper', 'lock', 'vibration'];

interface Block {
  key: StringKey;
  icon: string;
  minWidth: number;
  maxWidth?: number;
  filter?: boolean;
  /** Dominios del bloque; `match` permite reglas más finas. */
  domains: string[];
  match?: (entityId: string, deviceClass?: string, hass?: HomeAssistant) => boolean;
  /** Tarjeta para cada entidad (sin `type` → tarjeta genérica). */
  card: (entityId: string) => Record<string, any>;
}

const card = (name: string) => (entity: string) => ({ type: `${P}${name}-card`, entity });

/** Interruptores de riego (p. ej. Hunter Hydrawise): van al bloque Riego, no a Luces. */
function isWateringSwitch(entityId: string, hass?: HomeAssistant): boolean {
  if (domain(entityId) !== 'switch') return false;
  const tk = hass?.entities?.[entityId]?.translation_key || '';
  return ['manual_watering', 'auto_watering'].includes(tk) || /_watering$/.test(entityId);
}

/** Orden fijo de los bloques. Cada entidad va al primero que la acepta. */
const BLOCKS: Block[] = [
  { key: 'group_climate', icon: 'mdi:thermostat', minWidth: 250, domains: ['climate', 'fan', 'water_heater', 'humidifier'], card: (e) => (domain(e) === 'climate' ? card('climate')(e) : domain(e) === 'fan' ? card('fan')(e) : card('entity')(e)) },
  { key: 'group_lights', icon: 'mdi:lightbulb-group-outline', minWidth: 190, filter: true, domains: ['light', 'switch', 'input_boolean'], match: (e, _dc, h) => !isWateringSwitch(e, h), card: card('light') },
  { key: 'group_covers', icon: 'mdi:window-shutter', minWidth: 240, domains: ['cover'], card: card('cover') },

  { key: 'group_media', icon: 'mdi:television-play', minWidth: 300, maxWidth: 700, domains: ['media_player', 'remote'], card: (e) => (domain(e) === 'media_player' ? card('media')(e) : card('entity')(e)) },
  {
    key: 'group_security', icon: 'mdi:shield-home-outline', minWidth: 200, domains: ['lock', 'alarm_control_panel', 'binary_sensor', 'siren'],
    // Los sensores binarios solo si son de seguridad; cerraduras, alarmas y sirenas siempre.
    match: (e, dc) => domain(e) !== 'binary_sensor' || SECURITY_CLASSES.includes(dc || ''),
    card: (e) => {
      const d = domain(e);
      return d === 'binary_sensor' ? card('binary')(e) : d === 'lock' ? card('lock')(e) : d === 'alarm_control_panel' ? card('alarm')(e) : card('entity')(e);
    },
  },
  { key: 'group_cameras', icon: 'mdi:cctv', minWidth: 300, maxWidth: 800, domains: ['camera'], card: card('camera') },
  // Riego: zonas (válvulas de agua) y sus interruptores de riego.
  {
    key: 'group_irrigation', icon: 'mdi:sprinkler-variant', minWidth: 260, filter: true, domains: ['valve', 'switch'],
    match: (e, dc, h) => (domain(e) === 'valve' ? dc !== 'gas' : isWateringSwitch(e, h)),
    card: card('irrigation'),
  },
  { key: 'group_sensors', icon: 'mdi:chart-line', minWidth: 210, domains: ['sensor', 'binary_sensor'], card: (e) => (domain(e) === 'sensor' ? card('sensor')(e) : card('binary')(e)) },
  { key: 'group_people', icon: 'mdi:account-group-outline', minWidth: 200, domains: ['person', 'device_tracker'], card: card('person') },
  { key: 'group_vacuums', icon: 'mdi:robot-vacuum', minWidth: 240, domains: ['vacuum', 'lawn_mower'], card: card('vacuum') },
  { key: 'group_scenes', icon: 'mdi:play-circle-outline', minWidth: 130, domains: ['scene', 'script', 'button', 'input_button'], card: card('action') },
];
const OTHER: Block = { key: 'group_other', icon: 'mdi:dots-horizontal-circle-outline', minWidth: 200, domains: [], card: card('entity') };

/** Reparte las entidades elegidas en sus bloques, manteniendo el orden. */
function distribute(ids: string[], hass?: HomeAssistant): Map<Block, string[]> {
  const out = new Map<Block, string[]>();
  for (const id of ids) {
    const d = domain(id);
    const dc = hass?.states[id]?.attributes.device_class;
    const block = BLOCKS.find((b) => b.domains.includes(d) && (!b.match || b.match(id, dc, hass))) || OTHER;
    if (!out.has(block)) out.set(block, []);
    out.get(block)!.push(id);
  }
  return out;
}

export function generateDashboard(config: InventaStrategyConfig, hass?: HomeAssistant) {
  const L = (k: Parameters<typeof t>[1]) => t(hass, k);
  const es = (hass?.locale?.language || 'es').startsWith('es');
  const brand = pick(config, ['title', 'icon', 'logo', 'logo_dark', 'subtitle']);
  const calEntities = config.calendar_entities?.length ? config.calendar_entities : undefined;

  // Solo lo que el usuario eligió (y que existe), sin repetidos.
  const exists = (e: string) => !hass || !!hass.states[e];
  const chosen = [...new Set([...(config.climates || []), ...(config.lights || []), ...(config.entities || [])])].filter(exists);
  const blocks = distribute(chosen, hass);
  const climates = chosen.filter((e) => domain(e) === 'climate');
  const lights = (blocks.get(BLOCKS[1]) || []).filter((e) => ['light', 'switch'].includes(domain(e)));
  const weather = config.weather_entity || Object.keys(hass?.states || {}).find((e) => e.startsWith('weather.'));
  // Los climas que reportan mal se corrigen solos; aquí solo los factores forzados a mano.
  const scales: Record<string, number> = { ...config.climate_scale };
  for (const e of config.scaled_climates || []) scales[e] ??= config.scale_factor || 5;
  const forced = Object.keys(scales).length ? { climate_scale: scales } : {};
  const scale = (e: string) => (scales[e] ? { scale: scales[e] } : {});
  const tempClimates = climates;

  // Indicadores de resumen (solo los que tienen entidades).
  const stats: Record<string, any>[] = [];
  if (tempClimates.length) {
    stats.push({ type: `${P}stat-card`, name: L('stat_temp'), icon: 'mdi:thermometer', entities: tempClimates, attribute: 'current_temperature', mode: 'average', unit: '°C', ...(forced.climate_scale ? { scales } : {}) });
  }
  if (lights.length) stats.push({ type: `${P}stat-card`, name: L('stat_lights'), icon: 'mdi:lightbulb-outline', entities: lights, mode: 'count' });
  if (climates.length) stats.push({ type: `${P}stat-card`, name: L('stat_climates'), icon: 'mdi:fan', entities: climates, mode: 'count' });
  const valves = (blocks.get(BLOCKS.find((b) => b.key === 'group_irrigation')!) || []).filter((e) => domain(e) === 'valve');
  if (valves.length) stats.push({ type: `${P}stat-card`, name: L('stat_irrigation'), icon: 'mdi:sprinkler-variant', entities: valves, mode: 'count' });

  const sections: Record<string, any>[] = [
    { type: 'grid', column_span: 4, cards: [{ type: `${P}header-card`, ...brand, ...(calEntities ? { calendar_entities: calEntities } : {}), calendar_path: 'calendario', alerts: true, alert_entities: chosen, assistant: true, assistant_entities: chosen, ...(config.assist_fallback ? { assist_fallback: true } : {}), ...forced }] },
  ];
  if (stats.length) {
    sections.push({ type: 'grid', column_span: 4, cards: [{ type: `${P}group-card`, cards: stats, min_width: 200, filter_by_area: false }] });
  }
  if (weather) {
    sections.push({ type: 'grid', column_span: 4, cards: [{ type: `${P}weather-card`, entity: weather, forecast_days: 7, grid_options: { columns: 'full' } }] });
  }
  // Bloques por tipo de equipo (orden fijo; solo los que tienen equipos).
  for (const block of [...BLOCKS, OTHER]) {
    const ids = blocks.get(block);
    if (!ids?.length) continue;
    sections.push({
      type: 'grid',
      column_span: 4,
      cards: [
        {
          type: `${P}group-card`,
          title: L(block.key),
          icon: block.icon,
          min_width: block.minWidth,
          ...(block.maxWidth ? { max_width: block.maxWidth } : {}),
          filter_by_area: block.filter ? true : 'auto',
          cards: ids.map((e) => ({ ...block.card(e), ...(domain(e) === 'climate' ? scale(e) : {}) })),
        },
      ],
    });
  }
  // Panel recién creado: explicar cómo agregar equipos.
  if (!chosen.length) {
    sections.push({ type: 'grid', column_span: 4, cards: [{ type: 'markdown', content: L('empty_panel'), grid_options: { columns: 'full' } }] });
  }
  // Pie del panel: la agenda, al final (se puede ocultar en el editor).
  if (config.show_agenda !== false) sections.push({
    type: 'grid',
    column_span: 4,
    cards: [
      {
        type: `${P}calendar-card`,
        view: 'agenda',
        title: L('agenda'),
        calendar_path: 'calendario',
        grid_options: { columns: 'full' },
        ...(calEntities ? { entities: calEntities } : {}),
      },
    ],
  });

  return {
    views: [
      { title: es ? 'Inicio' : 'Home', path: 'inicio', icon: 'mdi:home-outline', type: 'sections', max_columns: 4, sections },
      {
        title: L('calendar_label'),
        path: 'calendario',
        icon: 'mdi:calendar-month',
        subview: true,
        type: 'panel',
        cards: [
          {
            type: 'vertical-stack',
            cards: [
              { type: `${P}header-card`, back_path: 'inicio', title: L('calendar_label'), ...pick(config, ['subtitle']) },
              { type: `${P}calendar-card`, view: 'full', ...(calEntities ? { entities: calEntities } : {}) },
            ],
          },
        ],
      },
    ],
  };
}

class InventaDashboardStrategy extends HTMLElement {
  static async generate(config: InventaStrategyConfig, hass: HomeAssistant) {
    return generateDashboard(config, hass);
  }

  /** Editor visual del panel: logo, nombre y qué equipos mostrar. */
  static getConfigElement() {
    return document.createElement('inventa-strategy-editor');
  }
}

if (!customElements.get('ll-strategy-dashboard-inventa')) {
  customElements.define('ll-strategy-dashboard-inventa', InventaDashboardStrategy);
}

declare global {
  interface Window {
    customStrategies?: Array<{ type: string; strategyType: 'dashboard' | 'section'; name: string; description: string; documentationURL?: string }>;
  }
}

window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: 'inventa',
  strategyType: 'dashboard',
  name: 'Inventa',
  description: 'Panel listo para usar: encabezado, resumen, tiempo, agenda y bloques por tipo con los equipos que elijas.',
});
