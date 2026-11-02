# Referencia: Calendario — `custom:inventa-calendar-card`

Calendario del panel, con **cuatro vistas** a elección (`view`):

| `view` | Qué muestra |
|---|---|
| `agenda` *(por defecto)* | Próximos eventos agrupados en Hoy / Mañana / día. Es la misma agenda que abre el botón 📅 del [encabezado](encabezado.md). |
| `month` | Mes en grilla (calendario de Home Assistant). |
| `list` | Lista de la semana (calendario de Home Assistant). |
| `full` | **Mes + lista lado a lado**; en celular, uno debajo del otro. |

Las vistas `month`, `list` y `full` usan por dentro el **calendario nativo de Home Assistant**
(con sus botones ‹ ›, *Hoy* y cambio de vista) y lo pintan con los colores del tema: cambian solas
con el botón ☀️/🌙, sin card-mod.

```
┌──────────────────────────────────────┐
│ 📅 Agenda                          ↗ │
│ HOY                                  │
│ Todo el día ▌ Cumpleaños de Sofía    │
│ 20:30       ▌ Cena con los abuelos   │
│ MAÑANA                               │
│ 08:00       ▌ Retiro de reciclaje    │
└──────────────────────────────────────┘
```

## Ejemplos

```yaml
type: custom:inventa-calendar-card
```
Todos los calendarios, próximos 7 días.

```yaml
type: custom:inventa-calendar-card
title: Familia
entities:
  - calendar.familia
days: 14
max_events: 5
```

### Vista completa (mes + lista)
```yaml
type: custom:inventa-calendar-card
view: full
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `view` | `agenda` \| `month` \| `list` \| `full` | `agenda` | Vista del calendario (desplegable en el editor visual). |
| `title` | texto | "Agenda" | Título de la tarjeta (en `full`, va sobre el mes). |
| `entities` | lista de entidades | todos los `calendar.*` | Calendarios a mostrar. |
| `days` | número | `7` | Días hacia adelante. |
| `max_events` | número | todos | Máximo de eventos a listar (solo `agenda`, igual que `days`). |
| `calendar_path` | ruta | `/calendar` | Adónde lleva el botón ↗ de la agenda (p. ej. tu vista Calendario). |

## Comportamiento

- **Funciona con cualquier calendario** de Home Assistant: Calendario local, Google Calendar,
  CalDAV, Office 365… Lee los eventos con la API `GET /api/calendars/<entidad>`.
- **Sin calendarios:** muestra *"Aún no tienes calendario"* con accesos para crear un calendario
  local o conectar Google (solo para administradores).
- **Actualización:** cada 5 minutos y cada vez que un evento empieza o termina.
- El botón ↗ abre el calendario completo de Home Assistant.
- **A lo ancho** (≥ 720 px, como el pie del panel Inventa) los días se ordenan en columnas.

## Receta: vista "Calendario" del panel

> **El panel Inventa ya la trae armada** (ver [Instalación](../04-instalacion.md)). Esta receta es
> solo para agregarla a mano en un panel propio.

Una subpágina con encabezado ← y la vista completa, como la del Corporate Dashboard. En el panel:
**✏️ → ⋮ → Editor de configuración en texto** y agrega esta vista en `views:` (`inicio` es la
ruta de tu vista principal; las rutas sin "/" son relativas al panel):

```yaml
- title: Calendario
  path: calendario
  icon: mdi:calendar-month
  subview: true
  type: panel
  cards:
    - type: vertical-stack
      cards:
        - type: custom:inventa-header-card
          back_path: inicio
          title: Calendario
          subtitle: Agenda de la casa
        - type: custom:inventa-calendar-card
          view: full
```

Y en el encabezado de la vista principal, para que el 📅 lleve ahí:

```yaml
type: custom:inventa-header-card
calendar_path: calendario
```

## ¿Cómo agrego un calendario?

| Opción | Pasos |
|---|---|
| **Calendario local** (sin cuentas) | Ajustes → Dispositivos y servicios → Añadir integración → *Calendario local* → nombre (p. ej. "Familia"). Los eventos se crean desde el calendario de HA. |
| **Google Calendar** | Ajustes → Dispositivos y servicios → Añadir integración → *Google Calendar*. Requiere credenciales de Google Cloud (el asistente de HA guía el proceso). |

---
*Última revisión: 29-10-2026 (v0.4.0)*
