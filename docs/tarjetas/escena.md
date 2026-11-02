# Referencia: Escena / script — `custom:inventa-action-card`

Acción rápida de un toque: escena (`scene.turn_on`), script (`script.turn_on`) o botón (`press`).
Muestra un ✓ al ejecutarse; un script en marcha se ve pulsando.

```yaml
type: custom:inventa-action-card
entity: scene.noche_de_cine
confirm: true
```

| Opción | Tipo | Descripción |
|---|---|---|
| `entity` | `scene`, `script`, `button`, `input_button` | Obligatoria. |
| `name` / `icon` | | |
| `color` | color CSS | Color del ícono (por defecto, el de acento). |
| `confirm` | sí/no | Pedir confirmación antes de ejecutar. |

---
*Última revisión: 30-10-2026 (v0.10.0)*
