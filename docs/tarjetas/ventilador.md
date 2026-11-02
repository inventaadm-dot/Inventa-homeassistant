# Referencia: Ventilador — `custom:inventa-fan-card`

**Tocar enciende o apaga.** Velocidad por pasos (toca un segmento), botón **Oscilar** si el
ventilador lo admite; el ícono gira mientras está encendido.

**Tocar / mantener:** tocar la tarjeta no abre la ventana de Home Assistant; para verla, **mantén
presionado** (½ s) o usa clic derecho.

```yaml
type: custom:inventa-fan-card
entity: fan.dormitorio
```

Opciones: `entity` (obligatoria), `name`, `icon`.

---
*Última revisión: 02-11-2026 (v0.11.0)*
