# Avisos (campana 🔔)

La campana del encabezado muestra cuántos avisos hay (globo **rojo** si hay alguno crítico, naranjo
si no) y al tocarla abre el panel de avisos, agrupado por nivel. En el panel Inventa viene
activada y revisa **los equipos que elegiste mostrar**, más las notificaciones y actualizaciones de
Home Assistant.

| Nivel | Cuándo |
|---|---|
| 🔴 Crítico | Humo, gas, monóxido, agua, calor o seguridad detectados · alarma disparada · cerradura trabada |
| 🟠 Atención | Puerta o ventana abierta ≥ 10 min · cerradura sin cerrar ≥ 10 min · ambiente ≥ 3° sobre el objetivo de un clima · batería < 20 % · equipos sin conexión |
| ℹ️ Información | Notificaciones de Home Assistant (se pueden **descartar** con ✓) · actualizaciones disponibles (solo administradores) |

Si no hay nada: *"Todo en orden, sin avisos"*.

## En un encabezado propio

```yaml
type: custom:inventa-header-card
alerts: true
alert_entities:
  - binary_sensor.humo_cocina
  - binary_sensor.puerta_principal
  - climate.living
```

Sin `alert_entities`, la campana muestra solo las notificaciones y actualizaciones de Home
Assistant.

---
*Última revisión: 02-11-2026 (v0.11.0)*
