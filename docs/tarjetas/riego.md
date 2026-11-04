# Referencia: Riego — `custom:inventa-irrigation-card`

Una **zona de riego**: estado (*En espera*, *Regando*, *Suspendido*, *Sin conexión*), el **próximo
riego** o cuánto **queda**, cuánto se regó **hoy**, el agua usada (si el controlador tiene sensor de
caudal) y los botones **Regar ahora / Detener** y **Automático** (programa de riego).

```
┌──────────────────────────────────────────┐
│ 💧 P1 - Cabecera              En espera  │
│ Próximo riego lun 9 nov, 08:06 · en 6 d  │
│ (⏱ Hoy 15 min) (💧 Agua hoy 136 L)       │
│ [ ▶ Regar ahora ]  [ 📅 Automático ]     │
└──────────────────────────────────────────┘
```

**Mientras riega** la tarjeta se destaca en **color agua** (cian): borde y fondo teñidos, ícono con
un halo que late, píldora **Regando** con un punto que parpadea y una **barra con agua que corre** y
se vacía a medida que baja el tiempo restante. Si el dispositivo pide menos movimiento, las animaciones
se apagan solas.

## Con qué funciona

- **Hunter Hydrawise** (integración oficial de Home Assistant): elige la **válvula de la zona**
  (`valve.p1_cabecera`). La tarjeta encuentra sola, en el mismo dispositivo, el *Next cycle*,
  *Remaining watering time*, *Daily active watering time*, *Daily active water use* y el interruptor
  *Automatic watering*. También sirve elegir el interruptor *Manual watering* de la zona.
- **Cualquier otra válvula de agua** (`valve.*`) o interruptor de riego: muestra el estado y
  **Regar ahora / Detener**; los demás datos aparecen solo si el dispositivo los tiene.

## Qué hace cada botón

| Botón | Acción en Home Assistant |
|---|---|
| **Regar ahora** | Hydrawise: enciende *Manual watering* (riega con el tiempo fijo de la integración). Otras válvulas: `valve.open_valve` |
| **Detener** | Hydrawise: apaga *Manual watering*. Otras válvulas: `valve.close_valve` |
| **Automático** (verde = activo) | Enciende o apaga el interruptor *Automatic watering*. Apagado = programa **suspendido** (Hydrawise lo suspende por un año hasta volver a activarlo) |

Al tocar un botón aparece **Enviando…** hasta que el equipo responde (Hydrawise trabaja por internet
y puede tardar unos segundos). Si Home Assistant rechaza la orden, el motivo aparece en rojo en la
tarjeta.

**Tocar / mantener:** tocar la tarjeta **no riega** (para evitar riegos por error); para ver los
detalles de Home Assistant, **mantén presionado** (½ s) o usa clic derecho.

```yaml
type: custom:inventa-irrigation-card
entity: valve.p1_cabecera
```

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | entidad | — | Válvula de la zona (`valve.*`) o interruptor de riego (obligatoria) |
| `name` | texto | nombre de la zona | Nombre a mostrar |
| `icon` | ícono | `mdi:sprinkler` | Ícono |
| `show_schedule` | bool | `true` | Mostrar el botón **Automático** |

## En el panel Inventa

Agrega las válvulas de las zonas en **Equipos a mostrar**: van al bloque **Riego**, que aparece después de **Cámaras** (con chips por
área si las zonas tienen áreas) y aparece el indicador **Zonas regando** en el resumen. Los
interruptores de riego de Hydrawise no se mezclan con las luces.

---
*Última revisión: 04-11-2026 (v0.15.1)*
