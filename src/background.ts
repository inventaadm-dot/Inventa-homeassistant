// Fondo del panel.
//
// Home Assistant pinta el fondo de cada vista con
//   var(--view-background, var(--lovelace-background, var(--primary-background-color)))
// Si la vista no tiene `background:` propio, basta con definir
// `--lovelace-background` en <html> para que el panel tome el color del tema.
//
// Lo define el encabezado mientras está en pantalla y lo quita al salir, así
// los otros paneles de Home Assistant conservan su fondo normal. Se cuentan
// las instancias porque el editor de tarjetas crea una copia de vista previa.

const PROP = '--lovelace-background';

/** Fondo por defecto: el color de fondo del tema de Inventa Cards (o el de HA en modo 'ha'). */
export const DEFAULT_BACKGROUND = 'var(--ic-bg, var(--primary-background-color))';

const holders = new Map<object, string>();

function sync(): void {
  const root = document.documentElement.style;
  const values = [...holders.values()];
  if (values.length) root.setProperty(PROP, values[values.length - 1]);
  else root.removeProperty(PROP);
}

/** Pinta el fondo del panel mientras `owner` lo mantenga. */
export function holdBackground(owner: object, value: string): void {
  holders.delete(owner);
  holders.set(owner, value);
  sync();
}

export function releaseBackground(owner: object): void {
  if (holders.delete(owner)) sync();
}
