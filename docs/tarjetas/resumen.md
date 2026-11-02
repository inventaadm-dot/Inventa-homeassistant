# Referencia: Indicador de resumen — `custom:inventa-stat-card`

Un número grande con su barra: **promedio**, **suma** o **activos / total** de varias entidades, o
el valor de una sola.

```
┌──────────────────────────┐
│ Luces encendidas       💡 │
│ 5 / 15                   │
│ ▬▬▬▬▬ ▭▭▭▭▭▭▭▭▭▭          │
└──────────────────────────┘
```

## Ejemplos

```yaml
type: custom:inventa-stat-card
name: Luces encendidas
icon: mdi:lightbulb-outline
entities: [light.living, light.cocina, light.dormitorio]
```

```yaml
type: custom:inventa-stat-card
name: Temperatura promedio
icon: mdi:thermometer
entities: [climate.living, climate.dormitorio]
attribute: current_temperature
unit: °C
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `name` | texto | — | Etiqueta superior. |
| `icon` | ícono MDI | — | Ícono a la derecha de la etiqueta. |
| `entities` | lista | — | Entidades a agregar (o `entity` para una sola). |
| `mode` | `average` \| `sum` \| `count` \| `value` | automático | Automático: una entidad → `value`; todas numéricas → `average`; si no → `count`. |
| `attribute` | texto | — | Leer un atributo en vez del estado (p. ej. `current_temperature`). |
| `unit` | texto | la de la entidad | Unidad mostrada. |
| `decimals` | número | 1 en promedios | Decimales. |
| `min` / `max` | número | 10–35 en °C, si no 0–100 | Rango de la barra continua. |
| `bar` | `continuous` \| `segments` \| `none` | automático | `count` con ≤ 20 entidades → segmentada; si no, continua. |
| `color` | color CSS | según el tipo | Ámbar para luces, cian para climas, naranjo para aberturas, azul en otros casos. |
| `tap_action` | acción | más información (si es una sola entidad) | Qué hace al tocarla. |

**Activo** = cualquier estado que no sea `off`, `closed`, `locked`, `idle`, `standby`,
`not_home`, `paused`, `docked` o `disarmed`. Las entidades sin conexión no se cuentan.

---
*Última revisión: 29-10-2026 (v0.5.0)*
