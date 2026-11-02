# Referencia: Sensor binario — `custom:inventa-binary-card`

Puerta, ventana, movimiento, humo, agua… con su ícono, el estado traducido por Home Assistant
según la clase (*Abierta*, *Despejado*…) y **desde cuándo** (*hace 5 min*).

| Al activarse | Clases | Color |
|---|---|---|
| Alarma | humo, gas, monóxido, agua, seguridad, manipulación, calor, problema | 🔴 rojo |
| Bueno | conectividad, enchufe, energía, en marcha | 🟢 verde |
| Aviso | todas las demás (puerta, ventana, movimiento…) | 🟠 ámbar |

```yaml
type: custom:inventa-binary-card
entity: binary_sensor.puerta_principal
```

Opciones: `entity` (obligatoria), `name`, `icon`.

---
*Última revisión: 30-10-2026 (v0.10.0)*
