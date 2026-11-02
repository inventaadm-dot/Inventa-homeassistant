# Inventa Cards

Tarjetas Lovelace para Home Assistant con diseño limpio, modo oscuro/claro y editor visual.
Un solo archivo JavaScript, **sin dependencias** (no requiere button-card, card-mod ni layout-card).

📚 **Documentación completa:** [docs/README.md](docs/README.md)

| Pieza | Tipo | Estado |
|---|---|---|
| **Panel Inventa** (se arma solo desde las áreas, sin código) | `strategy: custom:inventa` | ✅ v0.5 |
| Encabezado (+ fondo del panel, agenda 📅, subpágina) | `custom:inventa-header-card` | ✅ |
| Calendario (agenda, mes, lista, completa) | `custom:inventa-calendar-card` | ✅ |
| Indicador de resumen | `custom:inventa-stat-card` | ✅ v0.5 |
| Tiempo | `custom:inventa-weather-card` | ✅ v0.5 |
| Luz / interruptor | `custom:inventa-light-card` | ✅ v0.5 |
| Clima / termostato | `custom:inventa-climate-card` | ✅ v0.5 |
| Cámara, asistente, avisos, chips… | — | En diseño (ver `design/galeria.html`) |

---

## Instalación

Hay dos formas: **por HACS** (recomendada si el repositorio es público en GitHub) o **manual**
(repositorio privado, GitLab o sin HACS). En ambas, al final se crea el panel igual.

### Opción A — Por HACS

> Requisitos: [HACS](https://hacs.xyz) instalado y el repositorio **público en GitHub**.
> HACS no instala desde repositorios privados ni desde GitLab.

1. En Home Assistant abre **HACS**.
2. Menú **⋮ → Repositorios personalizados**.
3. Pega la URL del repositorio `https://github.com/inventaadm-dot/Inventa-homeassistant`,
   elige el tipo **Dashboard** (en versiones antiguas de HACS: *Lovelace* / *Plugin*) y pulsa **Añadir**.
4. Busca **Inventa Cards** en HACS → **Descargar** → elige la última versión.
5. HACS registra el recurso solo (`/hacsfiles/Inventa-homeassistant/inventa-cards.js`).
   Si te lo pide, recarga el navegador (Ctrl + Shift + R).
6. **Ajustes → Paneles → + Añadir panel → Paneles de la comunidad → Inventa.** Listo, sin código.

**Al actualizar:** HACS avisa cuando hay una versión nueva → **Actualizar** → recarga el navegador.
No hay que tocar el `?v=`; HACS lo maneja.

> **Para quien publica:** el repositorio debe tener `hacs.json` en la raíz y cada versión
> publicada como **Release** de GitHub (por ejemplo `v0.14.0`) con el archivo
> `inventa-cards.js` adjunto.

### Opción B — Manual

1. Descarga `inventa-cards.js` (del **Release** de la última versión, o de la carpeta `dist/`
   si lo compilaste con `npm run build`).
2. Cópialo en Home Assistant a `/config/www/inventa-cards/inventa-cards.js`
   (con el complemento *File editor*, *Studio Code Server* o *Samba*).
   `/config/www/` se publica como `/local/`.
3. **Ajustes → Paneles → ⋮ → Recursos → Añadir recurso**
   - URL: `/local/inventa-cards/inventa-cards.js?v=0.14.0`
   - Tipo: **Módulo JavaScript**
4. Recarga el navegador (Ctrl + Shift + R).
5. **Ajustes → Paneles → + Añadir panel → Paneles de la comunidad → Inventa.** Listo, sin código.

**Al actualizar:** reemplaza el archivo y cambia el `?v=` del recurso por la versión nueva
(por ejemplo `?v=0.15.0`); si no, los navegadores siguen usando la versión anterior.

> No mezcles ambas formas: si instalas por HACS, borra el recurso manual `/local/inventa-cards/…`
> para que la tarjeta no se cargue dos veces.

---

## Encabezado — `custom:inventa-header-card`

Logo o nombre de la casa, saludo según la hora, buscador y botones de acción.
En pantallas angostas (< 600 px) se reorganiza en 3 filas.

### Mínimo

```yaml
type: custom:inventa-header-card
```

Muestra el ícono de casa con **"Mi Casa"**, el saludo al usuario actual, el buscador
(abre Assist) y el botón de modo claro/oscuro.

### Completo

```yaml
type: custom:inventa-header-card
logo: /local/marca/logo.svg          # imagen; si se omite se usa icon + title
logo_dark: /local/marca/logo-blanco.svg
title: Mi Casa
icon: mdi:home-outline
greeting: true
name: Ana                            # vacío = nombre del usuario que mira
subtitle: Resumen de tu casa hoy
show_search: true
search_placeholder: Buscar o pedir algo…
search_tap_action:
  action: assist                     # o navigate, fire-dom-event, perform-action…
buttons:
  - icon: mdi:calendar-blank-outline
    label: Calendario
    tap_action:
      action: navigate
      navigation_path: /lovelace/calendario
  - type: theme                      # luna / sol
  - icon: mdi:bell-outline
    label: Avisos
    badge_entity: sensor.avisos_activos   # número > 0 = globo
    tap_action:
      action: more-info
      entity: sensor.avisos_activos
```

| Opción | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `logo` | URL | — | Imagen del logo (empresa, institución, familia). |
| `logo_dark` | URL | `logo` | Logo alternativo para modo oscuro. |
| `title` | texto | "Mi Casa" | Nombre cuando no hay logo. |
| `icon` | ícono | `mdi:home-outline` | Ícono cuando no hay logo. |
| `greeting` | bool | `true` | Saludo "Buenos días / tardes / noches". |
| `name` | texto | usuario actual | Nombre en el saludo. |
| `subtitle` | texto | "Resumen de tu casa hoy" | Segunda línea (`""` para ocultar). |
| `show_search` | bool | `true` | Muestra el buscador. |
| `search_placeholder` | texto | "Buscar o pedir algo…" | Texto del buscador. |
| `search_tap_action` | acción | `assist` | Qué hace al tocar el buscador. |
| `buttons` | lista | `[{type: theme}]` | Botones de la derecha. |

**Botones:** `type: theme` es el botón de modo; los demás llevan `icon`, `label`,
`tap_action` y opcionalmente `badge_entity` / `badge_color`.

**Acciones:** todas las de Lovelace (`navigate`, `more-info`, `perform-action`, `url`,
`assist`, `toggle`) y además `fire-dom-event`, que dispara `ll-custom` en la ventana
(compatible con button-card / browser_mod).

---

## Tema

Las tarjetas traen paleta oscura y clara propias. El modo se guarda **por dispositivo**:

| Modo | Comportamiento |
|---|---|
| `auto` (por defecto) | Sigue el modo oscuro/claro de Home Assistant |
| `dark` / `light` | Fijo (el botón luna/sol alterna entre estos dos) |
| `ha` | Sin paleta propia: las tarjetas usan el tema activo de Home Assistant |

Para que el fondo del panel combine, en la vista: `background: var(--ic-bg)`.

---

## Desarrollo

```bash
npm install
npm run dev      # página de pruebas con HA simulado: http://localhost:5173/dev/
npm run build    # genera dist/inventa-cards.js
```

Estructura:

```
src/
  index.ts            registro de tarjetas
  theme.ts            paletas y modo claro/oscuro
  i18n.ts             textos es / en
  actions.ts          acciones de Lovelace
  styles.ts           tokens CSS compartidos
  cards/header/       encabezado
dev/                  página de pruebas
design/               galería de diseño
```
