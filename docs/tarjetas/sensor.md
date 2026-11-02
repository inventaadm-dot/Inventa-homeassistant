# Referencia: Sensor — `custom:inventa-sensor-card`

Valor actual grande con su unidad, **tendencia** (↑/↓ % respecto del inicio del período) y **mini
gráfico** de las últimas horas. Si el sensor no es numérico, muestra el estado como texto.

```yaml
type: custom:inventa-sensor-card
entity: sensor.humedad_bano
hours: 24
```

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | `sensor` | — | Obligatoria. |
| `name` | texto | nombre de la entidad | |
| `icon` | ícono MDI | el de la entidad | Se muestra si no hay tendencia. |
| `hours` | número | `24` | Horas de historial del gráfico (máx. 168). |
| `decimals` | número | automático | |
| `color` | color CSS | según la clase | Temperatura naranjo, humedad cian, energía ámbar, batería verde, resto azul. |

El historial se pide a Home Assistant al mostrarse y cada 10 minutos; entre medio, el gráfico
avanza con cada valor nuevo.

---
*Última revisión: 30-10-2026 (v0.10.0)*
