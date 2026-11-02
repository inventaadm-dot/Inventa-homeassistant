// Termostatos que reportan mal: algunos equipos (p. ej. Tuya) informan las
// temperaturas divididas por un factor (20 °C llega como 4). Se detecta solo,
// para cualquier clima: si su temperatura máxima es imposible para un
// termostato (< 16 °C, o < 60 °F), se calcula el factor que la lleva a ~35 °C
// (95 °F). Ej.: max_temp 7 → factor 5.
//
// Todas las tarjetas (clima, resumen, avisos, asistente) leen y envían
// temperaturas de climas con estas funciones, así el corrector es una regla
// común. Un factor forzado (`scale` / `climate_scale`) gana sobre la detección;
// 1 la desactiva.

import type { HassEntity, HomeAssistant } from './types';

export type ClimateScales = Record<string, number>;

/** Atributos de clima que vienen escalados (el paso `target_temp_step` no). */
export const CLIMATE_TEMP_ATTRS = ['current_temperature', 'temperature', 'target_temp_low', 'target_temp_high', 'min_temp', 'max_temp'];

/** Factor para obtener la temperatura real (valor informado × factor). */
export function climateFactor(hass: HomeAssistant | undefined, st: HassEntity | undefined, forced?: number): number {
  if (forced && forced > 0) return forced;
  if (!st || !st.entity_id.startsWith('climate.')) return 1;
  const max = Number(st.attributes.max_temp);
  const fahrenheit = hass?.config?.unit_system?.temperature === '°F';
  if (!Number.isFinite(max) || max <= 0 || max >= (fahrenheit ? 60 : 16)) return 1;
  const k = Math.round((fahrenheit ? 95 : 35) / max);
  return k >= 2 && k <= 10 ? k : 1;
}

/** Temperatura real de un atributo del clima (undefined si no es un número). */
export function climateTemp(hass: HomeAssistant | undefined, st: HassEntity | undefined, attr: string, forced?: number): number | undefined {
  const v = st?.attributes[attr];
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return undefined;
  return CLIMATE_TEMP_ATTRS.includes(attr) ? Math.round(n * climateFactor(hass, st, forced) * 100) / 100 : n;
}

/** Valor a enviar al equipo para una temperatura real. */
export function climateRaw(hass: HomeAssistant | undefined, st: HassEntity | undefined, real: number, forced?: number): number {
  return Math.round((real / climateFactor(hass, st, forced)) * 100) / 100;
}
