import type { ActionConfig } from './types';

/**
 * Ejecuta una acción estándar de Lovelace (navigate, more-info, perform-action,
 * url, assist, toggle…) delegándola en Home Assistant mediante `hass-action`.
 *
 * Además soporta `fire-dom-event` (como button-card): dispara `ll-custom` en
 * window con el contenido de la acción, para abrir paneles de otras tarjetas.
 */
export function runAction(node: HTMLElement, action: ActionConfig | undefined, entity?: string): void {
  if (!action || action.action === 'none') return;

  if (action.action === 'fire-dom-event') {
    const ev = new CustomEvent('ll-custom', { detail: action, bubbles: true, composed: true });
    window.dispatchEvent(ev);
    return;
  }

  node.dispatchEvent(
    new CustomEvent('hass-action', {
      detail: { config: { entity, tap_action: action }, action: 'tap' },
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * Ruta absoluta para navegar. Una ruta sin "/" inicial es relativa al panel
 * actual: en `/mi-casa/inicio`, "calendario" → `/mi-casa/calendario`.
 * Así los paneles generados funcionan con cualquier nombre de panel.
 */
export function resolvePath(path: string): string {
  if (path.startsWith('/')) return path;
  const panel = location.pathname.split('/')[1] || 'lovelace';
  return `/${panel}/${path}`;
}

/** Navega dentro de Home Assistant sin recargar (igual que la función `navigate` del frontend). */
export function navigate(path: string): void {
  history.pushState(null, '', resolvePath(path));
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}
