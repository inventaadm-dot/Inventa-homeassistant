# Referencia: Cámara — `custom:inventa-camera-card`

Imagen en vivo (se refresca cada pocos segundos mientras la pestaña está visible), etiqueta
**En vivo**, indicador de **Movimiento** y *Sin conexión* si la cámara no responde. Abajo, el
nombre y hace cuánto hubo movimiento. Tocar abre el video de Home Assistant.

```yaml
type: custom:inventa-camera-card
entity: camera.patio
```

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | `camera` | — | Obligatoria. |
| `name` | texto | nombre de la entidad | |
| `motion_entity` | `binary_sensor` | uno de movimiento del mismo dispositivo | Sensor para el indicador *Movimiento*. |
| `refresh` | segundos | `10` | Tiempo entre imágenes. |

---
*Última revisión: 02-11-2026 (v0.11.0)*
