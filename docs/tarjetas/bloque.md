# Referencia: Bloque — `custom:inventa-group-card`

Agrupa tarjetas bajo un **título** con contador, **chips para filtrar por área** y una **grilla**
que pone tantas columnas como quepan y, si hay menos tarjetas que columnas, **las estira para
ocupar todo el ancho** (sin espacios vacíos en pantallas grandes; en celular quedan una o dos por
fila). Es la pieza con la que el panel Inventa ordena los equipos
por tipo (Climatización, Luces…), como el Corporate Dashboard.

```
💡 Luces (6)                     (Todas)(Cocina)(Living)(Otras)
[💡 Cocina] [⏻ Terraza] [💡 Comedor ▬▬─] [💡 Living ▬▬▬●─]
[💡 Jardín] [💡 Pasillo]
```

## Ejemplo

```yaml
type: custom:inventa-group-card
title: Luces
icon: mdi:lightbulb-group-outline
min_width: 190
filter_by_area: true
cards:
  - type: custom:inventa-light-card
    entity: light.living
  - type: custom:inventa-light-card
    entity: light.cocina
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `title` | texto | — | Título del bloque (sin título no se muestra la cabecera). |
| `icon` | ícono MDI | — | |
| `cards` | lista de tarjetas | — (obligatoria) | Cualquier tarjeta; las de Inventa se crean directamente. |
| `min_width` | px | `200` | Ancho mínimo de cada tarjeta; la grilla se adapta al ancho disponible. |
| `max_width` | px | — | Ancho máximo de cada tarjeta (el panel Inventa lo usa en cámaras y TV para que una sola no ocupe toda la pantalla). |
| `filter_by_area` | sí/no/`auto` | `auto` | Chips por área de la `entity` de cada tarjeta. `auto` = si hay 2+ áreas y 6+ tarjetas. Las que no tienen área quedan en *Otras*. |

---
*Última revisión: 30-10-2026 (v0.9.0)*
