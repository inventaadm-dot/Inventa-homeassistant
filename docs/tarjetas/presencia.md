# Referencia: Presencia — `custom:inventa-person-card`

Avatar (foto de la persona o sus iniciales) con un punto de estado, nombre y **en casa / fuera /
zona** con la hora desde la que está así. Funciona con `person` y `device_tracker`.

| Estado | Punto | Texto |
|---|---|---|
| En casa | 🟢 | En casa |
| En otra zona | 🔵 | *Trabajo · desde 09:12* |
| Fuera | ⚪ | *Fuera · desde 18:40* |

```yaml
type: custom:inventa-person-card
entity: person.ana
```

Opciones: `entity` (obligatoria), `name`.

---
*Última revisión: 30-10-2026 (v0.10.0)*
