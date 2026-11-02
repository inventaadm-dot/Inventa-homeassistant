# Referencia: Entidad (genérica) — `custom:inventa-entity-card`

Sirve para **cualquier entidad**: ícono, nombre y estado (con el formato e idioma de Home
Assistant). Si se puede encender o apagar (luz, interruptor, automatización…), **tocar la tarjeta
la enciende o apaga** y mantener presionado abre la información completa; si no, tocar abre la
información.

El panel Inventa la usa en el bloque *Otros* (tipos sin tarjeta propia), así cualquier equipo se
puede mostrar.

```yaml
type: custom:inventa-entity-card
entity: cover.persiana_living
```

| Opción | Tipo | Descripción |
|---|---|---|
| `entity` | cualquier entidad | Obligatoria. |
| `name` | texto | Nombre a mostrar. |
| `icon` | ícono MDI | Por defecto, el de la entidad o el de su tipo. |

---
*Última revisión: 30-10-2026 (v0.10.0)*
