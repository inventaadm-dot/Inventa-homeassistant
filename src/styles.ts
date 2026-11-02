import { css } from 'lit';

/**
 * Tokens compartidos. Cada `--_x` toma la variable de Inventa Cards (`--ic-x`)
 * y, si no está definida (modo 'ha'), cae en la del tema de Home Assistant.
 */
export const tokens = css`
  :host {
    --_card: var(--ic-card, var(--ha-card-background, var(--card-background-color, #fff)));
    --_card2: var(--ic-card2, var(--secondary-background-color, #f1f4f9));
    --_line: var(--ic-line, var(--divider-color, #e3e8ef));
    --_tx: var(--ic-tx, var(--primary-text-color, #0f172a));
    --_tx2: var(--ic-tx2, var(--secondary-text-color, #475569));
    --_tx3: var(--ic-tx3, var(--disabled-text-color, #94a3b8));
    --_acc: var(--ic-acc, var(--primary-color, #2563eb));
    --_amb: var(--ic-amb, var(--state-light-on-color, #d97706));
    --_heat: var(--ic-heat, var(--warning-color, #d97706));
    --_ok: var(--ic-ok, var(--success-color, #15803d));
    --_na: var(--ic-na, var(--error-color, #dc2626));
    --_cyan: var(--ic-cyan, var(--state-climate-cool-color, #0891b2));
    --_okbg: var(--ic-okbg, rgba(21, 128, 61, 0.15));
    --_wbg: var(--ic-wbg, rgba(217, 119, 6, 0.15));
    --_nabg: var(--ic-nabg, rgba(220, 38, 38, 0.15));
    --_lon: var(--ic-lon, rgba(217, 119, 6, 0.15));
    --_lonb: var(--ic-lonb, var(--state-light-on-color, #fcd34d));
    --_radius: var(--ic-radius, 16px);
  }

  ha-card {
    background: var(--_card);
    border: 1px solid var(--_line);
    border-radius: var(--_radius);
    box-shadow: none;
    color: var(--_tx);
  }

  .icon-btn {
    position: relative;
    width: 40px;
    height: 40px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--_card2);
    border: 1px solid var(--_line);
    color: var(--_tx2);
    cursor: pointer;
    padding: 0;
    font: inherit;
    --mdc-icon-size: 18px;
    transition: border-color 0.15s, color 0.15s;
  }
  .icon-btn:hover {
    border-color: var(--_tx3);
    color: var(--_tx);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    line-height: 1.4;
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
    background: var(--_card2);
    color: var(--_tx2);
  }
  .pill.ok {
    background: var(--_okbg);
    color: var(--_ok);
  }
  .pill.w {
    background: var(--_wbg);
    color: var(--_amb);
  }
  .pill.na {
    background: var(--_nabg);
    color: var(--_na);
  }
  .icon-btn:focus-visible {
    outline: 2px solid var(--_acc);
    outline-offset: 2px;
  }
`;
