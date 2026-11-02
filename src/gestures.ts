// Tocar / mantener presionado.
//
// Tocar ejecuta la acción principal de la tarjeta (p. ej. encender la luz).
// Mantener presionado (½ s) o clic derecho abre "más información" de HA.
// Así la ventana del sistema no aparece al encender o apagar algo.
//
// Uso en una plantilla Lit:
//   @pointerdown=${p.down} @pointerup=${p.cancel} @pointerleave=${p.cancel}
//   @pointercancel=${p.cancel} @click=${p.click} @contextmenu=${p.menu}
//   @keydown=${p.key}

const HOLD_MS = 500;

export class Press {
  private _timer?: number;
  private _held = false;

  constructor(
    private readonly onTap: () => void,
    private readonly onHold: () => void,
  ) {}

  down = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this._held = false;
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      this._held = true;
      this.onHold();
    }, HOLD_MS);
  };

  cancel = (): void => {
    window.clearTimeout(this._timer);
  };

  click = (): void => {
    window.clearTimeout(this._timer);
    if (this._held) {
      this._held = false;
      return;
    }
    this.onTap();
  };

  menu = (e: Event): void => {
    e.preventDefault();
    window.clearTimeout(this._timer);
    this.onHold();
  };

  key = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onTap();
    }
  };
}

/** Evita que un control interno (barra, botón) dispare el tocar/mantener de la tarjeta. */
export function stop(e: Event): void {
  e.stopPropagation();
}
