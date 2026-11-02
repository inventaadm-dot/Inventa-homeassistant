# Referencia: Luz — `custom:inventa-light-card`

Luz o interruptor compacto. **Tocar la tarjeta enciende o apaga**; para ver la información
completa de Home Assistant, **mantén presionado** (½ s) o usa clic derecho. Si la luz admite
brillo, muestra una barra para regularlo.

```
┌─────────────────────────┐   ┌─────────────────────────┐
│ [💡] Living              │   │ [💡] Cocina              │
│      ▬▬▬▬▬▬▬●───         │   │      Encendida           │
└─────────────────────────┘   └─────────────────────────┘
```

## Ejemplo

```yaml
type: custom:inventa-light-card
entity: light.living
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | `light`, `switch`, `fan`, `input_boolean` | — (obligatoria) | |
| `name` | texto | nombre de la entidad | |
| `icon` | ícono MDI | según el tipo | |
| `show_brightness` | sí/no | `true` | Barra de brillo (solo luces regulables). |
| `hide_unavailable` | sí/no | `false` | Ocultar la tarjeta si la entidad no tiene conexión (si no, se ve atenuada con "Sin conexión"). |

Encendida: borde e ícono ámbar. Ocupa media columna de una sección (dos luces por fila).

---
*Última revisión: 29-10-2026 (v0.5.0)*
