# Referencia: Tiempo — `custom:inventa-weather-card`

Condición actual (ícono, temperatura, humedad) y **pronóstico** de los próximos días. Funciona con
cualquier integración de tiempo (Met.no, OpenWeatherMap…).

```
┌──────────────────────┬──────────────────────────────┐
│ Casa                 │  vie   sáb   dom   lun   mar  │
│ ☀ 19°                │  ⛅    ☀     ☁     🌧    ☀    │
│ Soleado · 💧 48%      │  18°   19°   20°   21°   22°  │
└──────────────────────┴──────────────────────────────┘
```

## Ejemplo

```yaml
type: custom:inventa-weather-card
entity: weather.casa
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | entidad `weather` | — (obligatoria) | |
| `name` | texto | "Tiempo" | Título mostrado arriba (p. ej. el nombre de la ciudad). |
| `show_forecast` | sí/no | `true` | Mostrar el pronóstico. |
| `forecast_days` | número | `5` | Días de pronóstico (máx. 7). |

- El pronóstico se recibe en vivo con `weather/subscribe_forecast` (HA 2023.9 o posterior).
- En tarjetas angostas (< 380 px) el pronóstico pasa debajo.
- Tocarla abre la información completa de Home Assistant.
- **Íconos dibujados y animados** al estilo de Home Assistant (nube trasera oscura y delantera
  clara, sol, luna, gotas, copos, rayo), como en el Corporate Dashboard: el sol gira lento, las
  nubes se desplazan, la lluvia y la nieve caen y el rayo parpadea. Los colores siguen el tema. Si
  el dispositivo pide *reducir movimiento*, las animaciones se apagan.

---
*Última revisión: 29-10-2026 (v0.5.0)*
