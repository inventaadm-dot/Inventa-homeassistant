# Referencia: Clima — `custom:inventa-climate-card`

Termostato con el diseño del Corporate Dashboard: **anillo** con la perilla del objetivo y el rango,
temperatura **actual** entre los botones **+/–**, un **estado entendible**, una **línea de advertencia**,
botones de **encendido/apagado** y los **presets** del equipo.

```
┌──────────────────────────────────┐
│ Dormitorio    (Sala más caliente) │
│            ╭──○────╮             │
│            Objetivo              │
│             20,0°                │
│           16°     32°            │
│ (–)   [🌡 Actual 25,5°]    (+)   │
│ ⚠ 5,5 °C sobre el objetivo · revisar equipo │
│ [⏻ Apagado]      [❄ Frío]        │
│ [  Auto  ]       [ Manual ]      │
└──────────────────────────────────┘
```

- **Apagado / modo**: el segundo botón usa el modo del equipo (Calor/Frío, Frío, Calor, Auto…).
  Solo aparecen si el equipo los ofrece.
- **Presets** (Auto, Manual, Eco…): los del equipo, hasta 4.
- Tocar la tarjeta no hace nada; **mantener presionado** abre "más información".

## Ejemplo

```yaml
type: custom:inventa-climate-card
entity: climate.living
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | entidad `climate` | — (obligatoria) | |
| `name` | texto | nombre de la entidad | |
| `alert` | número | `3` | Desde cuántos °C sobre el objetivo la línea se pone ámbar con "⚠ … · revisar equipo". |
| `min` / `max` | número | `16` / `32` | Rango del anillo (se ajusta al rango del equipo si es menor). |
| `scale` | número | automático | Los equipos que reportan mal se **corrigen solos**: si la temperatura máxima del clima es imposible (< 16 °C), se calcula el factor que la lleva a ~35 °C (Tuya: máx. 7 → ×5). `scale` fuerza el factor (se muestra el valor × `scale` y se envía ÷ `scale`); `1` desactiva la corrección. La misma regla usan el resumen, los avisos y el asistente. |

## Estado

| Situación | Etiqueta |
|---|---|
| Ambiente dentro de ±1° del objetivo | 🟢 Confortable |
| Ambiente más de 1° sobre el objetivo | 🟠 Sala más caliente (y la línea: "X °C sobre el objetivo"; desde `alert`: ⚠ … · revisar equipo) |
| Ambiente más de 1° bajo el objetivo | 🔵 Sala más fría ("X °C bajo el objetivo") |
| Equipo apagado | Apagado ("Equipo apagado") |
| Sin conexión | 🔴 Sin conexión |

- El anillo es cian enfriando, naranjo calentando y gris apagado.
- Tocar la tarjeta no abre nada (se usan +/–); mantener presionado abre la información de HA.
- Los +/– acumulan los toques y envían el cambio 0,7 s después del último (no satura el equipo).

---
*Última revisión: 29-10-2026 (v0.5.0)*
