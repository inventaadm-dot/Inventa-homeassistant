// Avisos (campana 🔔 del encabezado).
//
// Se calculan sobre los equipos que el usuario eligió mostrar, más las
// notificaciones de Home Assistant y sus actualizaciones (solo para
// administradores). Niveles: crítico (rojo), atención (ámbar), información.
//
// Reglas:
//   crítico  · humo, gas, monóxido, agua, calor o seguridad detectados ·
//              alarma disparada · cerradura trabada
//   atención · puerta / ventana abierta ≥ 10 min · cerradura abierta ≥ 10 min ·
//              ambiente ≥ 3° sobre el objetivo del clima · batería < 20 % ·
//              equipos sin conexión
//   info     · notificaciones de HA · actualizaciones disponibles

import type { HomeAssistant } from '../types';
import { t } from '../i18n';
import { domain, entityName, isUnavailable, relativeTime } from '../ha';
import { climateTemp, type ClimateScales } from '../climate-scale';

export type AlertLevel = 'crit' | 'att' | 'info';

export interface InventaAlert {
  level: AlertLevel;
  icon: string;
  title: string;
  sub?: string;
  link?: string;
  linkText?: string;
  /** Id de la notificación de HA (se puede descartar). */
  notification?: string;
}

const DANGER = ['smoke', 'gas', 'carbon_monoxide', 'moisture', 'heat', 'safety'];
const OPENINGS = ['door', 'window', 'garage_door', 'opening'];
const OPEN_MINUTES = 10;
const WARM_DELTA = 3;
const BATTERY_LOW = 20;

// --- Notificaciones de Home Assistant (una sola suscripción para todo) ---------
export const NOTIFICATIONS_EVENT = 'inventa-notifications-changed';
interface HaNotification {
  notification_id: string;
  title?: string;
  message: string;
  created_at: string;
}
const notifications = new Map<string, HaNotification>();
let subscribed = false;

export function watchNotifications(hass?: HomeAssistant): void {
  if (subscribed || !hass?.connection) return;
  subscribed = true;
  hass.connection
    .subscribeMessage<{ type: string; notifications: Record<string, HaNotification> }>(
      (msg) => {
        if (msg.type === 'current') notifications.clear();
        for (const [id, n] of Object.entries(msg.notifications || {})) {
          if (msg.type === 'removed') notifications.delete(id);
          else notifications.set(id, n);
        }
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
      },
      { type: 'persistent_notification/subscribe' },
    )
    .catch(() => (subscribed = false));
}

export function dismissNotification(hass: HomeAssistant | undefined, id: string): void {
  hass?.callService('persistent_notification', 'dismiss', { notification_id: id });
}

// --- Cálculo -----------------------------------------------------------------
export function computeAlerts(hass: HomeAssistant | undefined, entities: string[] = [], scales: ClimateScales = {}): InventaAlert[] {
  if (!hass) return [];
  const out: InventaAlert[] = [];
  const now = Date.now();
  const minutes = (iso: string) => (now - new Date(iso).getTime()) / 60000;
  const offline: string[] = [];

  for (const id of entities) {
    const st = hass.states[id];
    if (!st) continue;
    const name = entityName(hass, id);
    if (isUnavailable(st)) {
      offline.push(name);
      continue;
    }
    const d = domain(id);
    const dc = st.attributes.device_class as string | undefined;

    if (d === 'binary_sensor' && st.state === 'on' && DANGER.includes(dc || '')) {
      out.push({ level: 'crit', icon: 'mdi:alert-octagon-outline', title: t(hass, 'al_detected', { name }), sub: relativeTime(hass, st.last_changed) });
    } else if (d === 'binary_sensor' && st.state === 'on' && OPENINGS.includes(dc || '') && minutes(st.last_changed) >= OPEN_MINUTES) {
      out.push({ level: 'att', icon: 'mdi:door-open', title: t(hass, 'al_open', { name }), sub: relativeTime(hass, st.last_changed) });
    } else if (d === 'alarm_control_panel' && st.state === 'triggered') {
      out.push({ level: 'crit', icon: 'mdi:shield-alert', title: t(hass, 'al_alarm', { name }), sub: relativeTime(hass, st.last_changed) });
    } else if (d === 'lock' && st.state === 'jammed') {
      out.push({ level: 'crit', icon: 'mdi:lock-alert-outline', title: t(hass, 'al_jammed', { name }) });
    } else if (d === 'lock' && (st.state === 'unlocked' || st.state === 'open') && minutes(st.last_changed) >= OPEN_MINUTES) {
      out.push({ level: 'att', icon: 'mdi:lock-open-variant-outline', title: t(hass, 'al_unlocked', { name }), sub: relativeTime(hass, st.last_changed) });
    } else if (d === 'climate' && st.state !== 'off') {
      const cur = climateTemp(hass, st, 'current_temperature', scales[id]) ?? NaN;
      const target = climateTemp(hass, st, 'temperature', scales[id]) ?? NaN;
      if (Number.isFinite(cur) && Number.isFinite(target) && cur - target >= WARM_DELTA) {
        out.push({ level: 'att', icon: 'mdi:thermometer-alert', title: t(hass, 'al_warm', { name, n: Math.round((cur - target) * 10) / 10 }), sub: `${cur}° / ${target}°` });
      }
    }

    // Batería: sensor de batería elegido o atributo battery_level del equipo.
    const battery = d === 'sensor' && dc === 'battery' ? parseFloat(st.state) : Number(st.attributes.battery_level);
    if (Number.isFinite(battery) && battery < BATTERY_LOW) {
      out.push({ level: 'att', icon: 'mdi:battery-alert-variant-outline', title: t(hass, 'al_battery', { name }), sub: `${Math.round(battery)} %` });
    }
  }

  if (offline.length) {
    out.push({
      level: 'att',
      icon: 'mdi:lan-disconnect',
      title: t(hass, offline.length === 1 ? 'al_offline_one' : 'al_offline', { n: offline.length }),
      sub: offline.slice(0, 4).join(', ') + (offline.length > 4 ? '…' : ''),
    });
  }

  for (const n of [...notifications.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    out.push({ level: 'info', icon: 'mdi:message-alert-outline', title: n.title || n.message, sub: n.title ? n.message : relativeTime(hass, n.created_at), notification: n.notification_id });
  }

  if (hass.user?.is_admin) {
    const updates = Object.keys(hass.states).filter((e) => e.startsWith('update.') && hass.states[e].state === 'on').length;
    if (updates) {
      out.push({ level: 'info', icon: 'mdi:update', title: t(hass, updates === 1 ? 'al_update_one' : 'al_updates', { n: updates }), link: '/config/updates', linkText: t(hass, 'al_see') });
    }
  }

  const order: Record<AlertLevel, number> = { crit: 0, att: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
