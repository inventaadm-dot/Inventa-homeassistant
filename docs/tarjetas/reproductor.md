# Referencia: Reproductor / TV — `custom:inventa-media-card`

Carátula (o ícono), nombre, app y título (*Netflix · Serie*), controles **anterior / reproducir-
pausar / siguiente**, **volumen** y botón de **encendido**. Solo aparecen los controles que el equipo
admite.

**Tocar / mantener:** tocar la tarjeta no abre la ventana de Home Assistant; para verla, **mantén
presionado** (½ s) o usa clic derecho.

```yaml
type: custom:inventa-media-card
entity: media_player.tv_living
```

Opciones: `entity` (obligatoria), `name`.

---
*Última revisión: 02-11-2026 (v0.11.0)*
