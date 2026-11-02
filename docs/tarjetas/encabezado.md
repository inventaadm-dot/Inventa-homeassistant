# Referencia: Encabezado — `custom:inventa-header-card`

Barra superior del panel: **logo o nombre del inmueble**, **saludo** según la hora y el usuario,
**buscador** y **botones de acción** (calendario, modo claro/oscuro, avisos…).

Además define el **ambiente del panel**: mientras está en pantalla pinta el **fondo** con los colores
del tema, y trae de serie el botón **📅 Calendario**, que abre la agenda en una ventana emergente.

```
Escritorio
┌────────────────────────────────────────────────────────────────────────┐
│ [logo]  │ Buenas tardes, Ana          [💬 Buscar o pedir algo…  ] 📅 🌙 🔔③ │
│         │ Resumen de tu casa hoy                                         │
└────────────────────────────────────────────────────────────────────────┘

Celular (tarjeta < 600 px)
┌────────────────────────────┐
│ [logo]            📅 🌙 🔔③ │
│ Buenas tardes, Ana          │
│ Resumen de tu casa hoy      │
│ [💬 Buscar o pedir algo…  ] │
└────────────────────────────┘
```

## Ejemplos

### Mínimo (casa genérica)
```yaml
type: custom:inventa-header-card
```
Ícono de casa + "Mi Casa", saludo al usuario actual, buscador que abre Assist, botón 📅 con la
agenda de todos los calendarios, botón luna/sol y fondo del panel pintado según el tema.

### Con nombre e ícono propios, sin buscador
```yaml
type: custom:inventa-header-card
title: Casa de Playa
icon: mdi:beach
show_search: false
```

### Subpágina (p. ej. vista Calendario)
```yaml
type: custom:inventa-header-card
back_path: /mi-panel/inicio
title: Calendario
subtitle: Agenda de la casa
```
Muestra ← (vuelve a `back_path`), el título y el subtítulo, y a la derecha el botón luna/sol. En
modo subpágina, saludo, buscador y 📅 vienen apagados (se pueden activar).

### Empresa o institución con logo
```yaml
type: custom:inventa-header-card
logo: /local/marca/logo-color.svg
logo_dark: /local/marca/logo-blanco.svg
subtitle: Resumen de la oficina de hoy
calendar_entities:
  - calendar.oficina
  - calendar.feriados
buttons:
  - type: theme
  - icon: mdi:bell-outline
    label: Avisos
    badge_entity: sensor.avisos_activos
    tap_action:
      action: fire-dom-event
      cd_alerts: toggle
```

## Opciones

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `logo` | URL de imagen | — | Logo a mostrar. Si se omite se usan `icon` + `title`. |
| `logo_dark` | URL de imagen | = `logo` | Variante para modo oscuro (p. ej. logo blanco). |
| `title` | texto | "Mi Casa" / "My Home" | Nombre del inmueble cuando no hay logo. También es el texto alternativo del logo. |
| `icon` | ícono MDI | `mdi:home-outline` | Ícono cuando no hay logo. |
| `greeting` | sí/no | `true` | Muestra "Buenos días" (< 12 h), "Buenas tardes" (< 20 h) o "Buenas noches". |
| `name` | texto | nombre del usuario conectado | Nombre en el saludo. |
| `subtitle` | texto | "Resumen de tu casa hoy" | Segunda línea. `""` la oculta. |
| `show_search` | sí/no | `true` | Muestra el buscador. |
| `search_placeholder` | texto | "Buscar o pedir algo…" | Texto dentro del buscador. |
| `search_tap_action` | acción | `{action: assist}` | Qué hace el buscador al tocarlo. |
| `buttons` | lista | `[{type: theme}]` | Botones de la derecha, en orden. |
| `calendar` | sí/no | `true` | Agrega el botón 📅 al inicio de los botones (si `buttons` no trae ya uno de `type: calendar`). |
| `calendar_entities` | lista de entidades | todos los `calendar.*` | Calendarios que muestra la agenda. |
| `calendar_days` | número | `7` | Cuántos días hacia adelante muestra la agenda. |
| `calendar_path` | ruta | `/calendar` | Adónde lleva *Abrir calendario completo* (p. ej. tu vista Calendario con `view: full`). |
| `assistant` | sí/no | `false` | El buscador abre el [asistente de Inventa](../asistente.md) en vez de `search_tap_action`. |
| `assistant_entities` | lista | — | Lista cerrada de equipos sobre los que actúa el asistente. |
| `assist_fallback` | sí/no | `false` | Lo que no entienda, enviarlo a Assist de Home Assistant. |
| `alerts` | sí/no | `false` | Campana de [avisos](../avisos.md) al final de los botones. |
| `alert_entities` | lista | — | Equipos que revisan los avisos. |
| `back_path` | ruta | — | **Modo subpágina**: ← en lugar del logo y `title`/`subtitle` en lugar del saludo. |

Las rutas (`back_path`, `calendar_path`) pueden ser **relativas al panel**: `calendario` equivale a
`/<panel-actual>/calendario`. Así la misma configuración sirve en cualquier panel.
| `background` | sí/no | `true` | Pinta el fondo del panel con el color del tema (ver más abajo). |
| `background_style` | CSS | color de fondo del tema | Fondo propio: `"#101820"`, `"linear-gradient(...)"`, `"center / cover url('/local/fondo.jpg')"`. |

### Botones (`buttons`)

| Opción | Tipo | Descripción |
|---|---|---|
| `type` | `theme` \| `calendar` \| `action` | `theme` = botón luna/sol. `calendar` = botón de agenda (sirve para cambiarlo de posición, ícono o `tap_action`). Sin `type` = botón de acción. |
| `icon` | ícono MDI | Ícono del botón. |
| `label` | texto | Texto de ayuda al pasar el mouse y para lectores de pantalla. |
| `tap_action` | acción | Qué hace al tocarlo. |
| `badge_entity` | entidad | Si su estado es un número > 0, se muestra como globo (máx. "99+"). |
| `badge_color` | color CSS | Color del globo (por defecto, color "calor" del tema). |

### Acciones

Se aceptan las acciones estándar de Lovelace:

| `action` | Ejemplo |
|---|---|
| `assist` | Abre el asistente de voz/texto de Home Assistant |
| `navigate` | `navigation_path: /lovelace/camaras` |
| `more-info` | `entity: sensor.avisos_activos` |
| `perform-action` | `perform_action: script.buenas_noches` |
| `url` | `url_path: https://…` |
| `none` | No hace nada |
| `fire-dom-event` | Dispara `ll-custom` con el contenido de la acción (para abrir paneles de otras tarjetas) |

## Fondo del panel

Home Assistant pinta cada vista con `var(--view-background, var(--lovelace-background, …))`. El
encabezado define `--lovelace-background` mientras está en pantalla y lo **quita al salir**, así los
demás paneles conservan su fondo normal.

- Sigue al botón luna/sol: azul noche en oscuro, gris claro en claro.
- Si la **vista** tiene su propio `background:` en YAML, manda el de la vista.
- `background: false` lo desactiva; `background_style` pone un fondo propio.

## Calendario

El botón 📅 abre la **agenda**: los eventos de los próximos `calendar_days` días agrupados en
*Hoy / Mañana / día*, con el color de cada calendario. Abajo, *Abrir calendario completo* lleva al
calendario de Home Assistant (`/calendar`).

| Situación | Qué muestra |
|---|---|
| Hay calendarios (local, Google, CalDAV…) | Los eventos, detectados automáticamente |
| No hay ninguno | *"Aún no tienes calendario"* con **Crear calendario local** y **Conectar Google Calendar** (solo administradores; a los demás les pide hablar con un administrador) |

En celular la agenda sube desde abajo, como una hoja. Se cierra con ✕, Esc o tocando fuera. Para
tener la agenda fija en el panel, usa la tarjeta [Calendario](calendario.md).

## Comportamiento

- **Saludo:** se recalcula cada 5 minutos aunque no cambie ningún estado.
- **Idioma:** según el idioma del perfil del usuario (español o inglés).
- **Logo y modo:** si hay `logo_dark`, se cambia solo al alternar el modo.
- **Rendimiento:** solo se redibuja si cambia el usuario, el idioma, el modo oscuro de HA o una
  entidad usada en `badge_entity`.

---
*Última revisión: 29-10-2026 (v0.4.0)*
