# Referencia: Cerradura — `custom:inventa-lock-card`

Estado claro: 🟢 *Cerrada*, 🟠 *Abierta · hace 6 min*, 🔴 *Trabada*. Botón **Abrir** (pide
confirmación) o **Cerrar**. Si la cerradura exige código, lo pide antes de actuar.

**Tocar / mantener:** tocar la tarjeta no abre la ventana de Home Assistant; para verla, **mantén
presionado** (½ s) o usa clic derecho.

```yaml
type: custom:inventa-lock-card
entity: lock.puerta_principal
```

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `entity` | `lock` | — | Obligatoria. |
| `name` | texto | | |
| `confirm` | sí/no | `true` | Pedir confirmación antes de abrir. |

---
*Última revisión: 02-11-2026 (v0.11.0)*
