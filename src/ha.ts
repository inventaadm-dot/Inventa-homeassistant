// Utilidades sobre entidades de Home Assistant compartidas por las tarjetas.

import type { HassEntity, HomeAssistant } from './types';

export const UNAVAILABLE = ['unavailable', 'unknown'];

/** Estados que cuentan como "inactivo" al contar entidades activas. */
const INACTIVE = ['off', 'closed', 'locked', 'idle', 'standby', 'not_home', 'paused', 'docked', 'disarmed', ...UNAVAILABLE];

export function isUnavailable(st?: HassEntity): boolean {
  return !st || UNAVAILABLE.includes(st.state);
}

export function isActive(st?: HassEntity): boolean {
  return !!st && !INACTIVE.includes(st.state);
}

export function entityName(hass: HomeAssistant | undefined, entityId: string, override?: string): string {
  if (override) return override;
  return hass?.states[entityId]?.attributes.friendly_name || entityId;
}

export function domain(entityId: string): string {
  return entityId.split('.')[0];
}

/** Número con decimales según el idioma (coma en español). */
export function formatNumber(hass: HomeAssistant | undefined, n: number, decimals = 1): string {
  const l = hass?.locale?.language || 'es';
  return n.toLocaleString(l, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Abre el diálogo "más información" de HA. */
export function moreInfo(node: HTMLElement, entityId: string): void {
  node.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
}

/** Área de una entidad (la propia o la de su dispositivo). */
export function entityArea(hass: HomeAssistant, entityId: string): string | undefined {
  const reg = hass.entities?.[entityId];
  if (!reg) return undefined;
  return reg.area_id || (reg.device_id ? hass.devices?.[reg.device_id]?.area_id : undefined) || undefined;
}

/** Dominios que se pueden encender/apagar con `homeassistant.toggle`. */
export const TOGGLEABLE = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier', 'group', 'remote'];

/** Estado legible: usa el formato de HA si está disponible. */
export function stateText(hass: HomeAssistant | undefined, st: HassEntity): string {
  if (hass?.formatEntityState) {
    try {
      return hass.formatEntityState(st);
    } catch (e) {
      /* versiones antiguas: formato propio */
    }
  }
  const unit = st.attributes.unit_of_measurement;
  return unit ? `${st.state} ${unit}` : st.state;
}

/** "hace 5 min", "hace 2 h", o la hora si fue hace más de un día. */
export function relativeTime(hass: HomeAssistant | undefined, iso: string): string {
  const l = hass?.locale?.language || 'es';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(l, { numeric: 'auto', style: 'short' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

/** Ícono por defecto según dominio (si la entidad no trae uno). */
export function domainIcon(entityId: string, st?: HassEntity): string {
  if (st?.attributes.icon) return st.attributes.icon;
  const d = domain(entityId);
  const icons: Record<string, string> = {
    light: 'mdi:lightbulb-outline', switch: 'mdi:power', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch-outline',
    automation: 'mdi:robot-outline', cover: 'mdi:window-shutter', lock: 'mdi:lock-outline', media_player: 'mdi:television',
    camera: 'mdi:cctv', vacuum: 'mdi:robot-vacuum', alarm_control_panel: 'mdi:shield-home-outline', sensor: 'mdi:eye-outline',
    binary_sensor: 'mdi:checkbox-blank-circle-outline', person: 'mdi:account', device_tracker: 'mdi:map-marker-outline',
    scene: 'mdi:palette-outline', script: 'mdi:script-text-outline', button: 'mdi:gesture-tap-button', input_button: 'mdi:gesture-tap-button',
    climate: 'mdi:thermostat', water_heater: 'mdi:water-boiler', humidifier: 'mdi:air-humidifier', siren: 'mdi:bullhorn-outline',
    number: 'mdi:ray-vertex', select: 'mdi:format-list-bulleted', input_number: 'mdi:ray-vertex', input_select: 'mdi:format-list-bulleted',
    update: 'mdi:package-up', weather: 'mdi:weather-partly-cloudy', sun: 'mdi:white-balance-sunny', zone: 'mdi:map-marker-radius',
  };
  return icons[d] || 'mdi:shape-outline';
}
