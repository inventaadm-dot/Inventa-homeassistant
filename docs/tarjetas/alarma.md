# Referencia: Alarma — `custom:inventa-alarm-card`

Estado (🟢 desarmada, 🔵 armada, 🔴 disparada) y botones de modo: **Desarmar**, **En casa**,
**Ausente**, **Noche**, **Vacaciones**, **Personalizado**. Solo aparecen los modos que la alarma
admite; el modo activo queda resaltado. Si pide código, aparece un campo para ingresarlo.

**Tocar / mantener:** tocar la tarjeta no abre la ventana de Home Assistant; para verla, **mantén
presionado** (½ s) o usa clic derecho.

```yaml
type: custom:inventa-alarm-card
entity: alarm_control_panel.casa
```

Opciones: `entity` (obligatoria), `name`.

---
*Última revisión: 02-11-2026 (v0.11.0)*
