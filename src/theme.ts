// Tema de Inventa Cards.
//
// Las tarjetas usan variables `--ic-*` con respaldo en las variables del tema
// de Home Assistant. Este módulo define esas variables en <html> según el modo:
//   - 'auto'  → paleta oscura o clara según el modo oscuro de Home Assistant
//   - 'dark'  → paleta oscura
//   - 'light' → paleta clara
//   - 'ha'    → no define nada: las tarjetas heredan el tema activo de HA
// El modo elegido se guarda por dispositivo en localStorage.

import type { HomeAssistant } from './types';

export type ThemeMode = 'auto' | 'dark' | 'light' | 'ha';
export type ResolvedMode = 'dark' | 'light';

const STORAGE_KEY = 'inventa-cards-theme';
export const THEME_EVENT = 'inventa-cards-theme-changed';

const PALETTES: Record<ResolvedMode, Record<string, string>> = {
  dark: {
    '--ic-bg': '#0B1120', '--ic-card': '#111A2E', '--ic-card2': '#16213A', '--ic-line': '#1F2A44',
    '--ic-tx': '#E6EDF7', '--ic-tx2': '#94A3B8', '--ic-tx3': '#64748B',
    '--ic-acc': '#3B82F6', '--ic-cyan': '#22D3EE', '--ic-amb': '#FBBF24', '--ic-heat': '#F59E0B',
    '--ic-ok': '#4ADE80', '--ic-okbg': '#0F2A1C', '--ic-wbg': '#2A1F0B',
    '--ic-na': '#F87171', '--ic-nabg': '#2A1215', '--ic-pur': '#A78BFA',
    '--ic-lon': '#3A2E0E', '--ic-lonb': '#5B4614',
    '--ic-wx-sun': '#FBBF24', '--ic-wx-moon': '#CBD5E1', '--ic-wx-cloud': '#E2E8F0', '--ic-wx-cloud2': '#64748B', '--ic-wx-rain': '#60A5FA', '--ic-wx-snow': '#E0F2FE',
  },
  light: {
    '--ic-bg': '#F4F6FA', '--ic-card': '#FFFFFF', '--ic-card2': '#F1F4F9', '--ic-line': '#E3E8EF',
    '--ic-tx': '#0F172A', '--ic-tx2': '#475569', '--ic-tx3': '#94A3B8',
    '--ic-acc': '#2563EB', '--ic-cyan': '#0891B2', '--ic-amb': '#D97706', '--ic-heat': '#D97706',
    '--ic-ok': '#15803D', '--ic-okbg': '#DCFCE7', '--ic-wbg': '#FEF3C7',
    '--ic-na': '#DC2626', '--ic-nabg': '#FEE2E2', '--ic-pur': '#7C3AED',
    '--ic-lon': '#FEF3C7', '--ic-lonb': '#FCD34D',
    '--ic-wx-sun': '#F59E0B', '--ic-wx-moon': '#64748B', '--ic-wx-cloud': '#CBD5E1', '--ic-wx-cloud2': '#94A3B8', '--ic-wx-rain': '#2563EB', '--ic-wx-snow': '#38BDF8',
  },
};

let current: ResolvedMode = 'dark';
let lastHaDark: boolean | undefined;

export function getStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'auto' || v === 'dark' || v === 'light' || v === 'ha') return v;
  } catch (e) {
    /* almacenamiento bloqueado: usar el valor por defecto */
  }
  return 'auto';
}

export function getResolvedMode(): ResolvedMode {
  return current;
}

function apply(mode: ThemeMode, haDark: boolean | undefined): void {
  const resolved: ResolvedMode = mode === 'dark' || mode === 'light' ? mode : haDark === false ? 'light' : 'dark';
  const root = document.documentElement.style;
  const palette = PALETTES[resolved];
  Object.keys(palette).forEach((k) => (mode === 'ha' ? root.removeProperty(k) : root.setProperty(k, palette[k])));
  const changed = resolved !== current;
  current = resolved;
  if (changed) window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { mode, resolved } }));
}

/** Llamar desde `set hass` de cada tarjeta: aplica el tema y sigue el modo oscuro de HA. */
export function ensureTheme(hass?: HomeAssistant): void {
  const haDark = hass?.themes?.darkMode;
  if (haDark === lastHaDark && document.documentElement.style.getPropertyValue('--ic-card')) return;
  lastHaDark = haDark;
  apply(getStoredMode(), haDark);
}

export function setMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    /* sin almacenamiento: el cambio dura hasta recargar */
  }
  apply(mode, lastHaDark);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { mode, resolved: current } }));
}

/** Alterna entre oscuro y claro (el botón de luna/sol). */
export function toggleMode(): void {
  setMode(current === 'dark' ? 'light' : 'dark');
}
