# 2. Arquitectura

## Panorama

```
                    ┌──────────────────────────────────────────────┐
  Home Assistant    │  Panel (dashboard) Lovelace                  │
  (navegador)       │   ├─ type: custom:inventa-header-card        │
                    │   ├─ type: custom:inventa-…-card             │
                    │   └─ tarjetas nativas / de otros paquetes    │
                    └───────────────┬──────────────────────────────┘
                                    │ carga como recurso (módulo JS)
                    ┌───────────────▼──────────────────────────────┐
  /config/www/      │  inventa-cards.js  (un solo archivo)         │
  inventa-cards/    │   ├─ registro de tarjetas (customElements)   │
                    │   ├─ tema  (paletas, modo claro/oscuro)      │
                    │   ├─ i18n  (es / en)                         │
                    │   ├─ acciones (navigate, more-info, …)       │
                    │   └─ tarjetas (Lit Web Components)           │
                    └──────────────────────────────────────────────┘
```

Home Assistant carga `inventa-cards.js` como **recurso de panel** (tipo *Módulo JavaScript*).
Al cargarse, el archivo registra cada tarjeta como un *Custom Element* del navegador
(`<inventa-header-card>`, …) y las anuncia en `window.customCards` para que aparezcan en el
selector de tarjetas del editor.

Todo ocurre **en el navegador** de quien mira el panel. El paquete no instala nada en el
servidor de Home Assistant más allá de servir el archivo.

## Tecnologías

| Pieza | Uso | Versión |
|---|---|---|
| [Lit](https://lit.dev) | Base de los Web Components (render reactivo, estilos encapsulados) | 3.2.1 |
| TypeScript | Lenguaje del código fuente | 5.6.3 |
| [Vite](https://vitejs.dev) | Empaquetado (`dist/inventa-cards.js`) y servidor de pruebas | 5.4.10 |
| `@mdi/js` | Solo en la página de pruebas, para dibujar íconos MDI fuera de HA | 7.4.47 |

Lit queda **incluido dentro** de `inventa-cards.js`; Home Assistant no necesita nada adicional.

## Módulos

```
src/
├─ index.ts          Punto de entrada: importa las tarjetas, las registra en
│                    window.customCards y escribe la versión en la consola.
├─ types.ts          Tipos mínimos de `hass`, entidades y acciones.
├─ theme.ts          Paletas oscura/clara y modo activo (ver doc 3).
├─ i18n.ts           Textos en español e inglés; función t(hass, clave).
├─ actions.ts        runAction(): ejecuta acciones de Lovelace; navigate().
├─ ha.ts            Utilidades de entidades (disponible, activo, área, más información).
├─ background.ts     Fondo del panel (--lovelace-background) mientras hay encabezado.
├─ strategy/
│  └─ dashboard-strategy.ts  Estrategia de panel "Inventa" (ll-strategy-dashboard-inventa):
│                            genera Inicio + Calendario; registrada en window.customStrategies.
├─ calendar/
│  ├─ agenda.ts           <inventa-agenda>: lista de próximos eventos (API calendars).
│  └─ calendar-dialog.ts  Ventana emergente de la agenda (se agrega a <body>).
├─ styles.ts         Tokens CSS compartidos (--_card, --_tx…) y estilos comunes
│                    (ha-card, .icon-btn).
└─ cards/
   ├─ header/
   │  └─ header-card.ts   Tarjeta Encabezado (+ fondo + botón de agenda).
   ├─ calendar/
   │  └─ calendar-card.ts Tarjeta Calendario.
   ├─ stat/stat-card.ts        Indicador de resumen.
   ├─ weather/weather-card.ts  Tiempo.
   ├─ light/light-card.ts      Luz / interruptor.
   ├─ climate/climate-card.ts  Clima / termostato.
   ├─ group/group-card.ts      Bloque: título + chips por área + grilla.
   ├─ entity/entity-card.ts    Entidad genérica (cualquier tipo).
   ├─ sensor/sensor-card.ts    Sensor con mini gráfico (history WS).
   ├─ binary/binary-card.ts    Sensor binario.
   ├─ action/action-card.ts    Escena / script / botón.
   ├─ person/person-card.ts    Presencia.
   ├─ camera/  cover/  fan/  lock/  alarm/  media/  vacuum/   (una tarjeta por carpeta)
├─ alerts/
│  ├─ alerts.ts           Reglas de avisos + suscripción a notificaciones de HA.
│  └─ alerts-dialog.ts    Panel de avisos (campana del encabezado).
├─ assistant/
│  ├─ engine.ts           Motor: interpreta pedidos sobre la lista cerrada de equipos.
│  └─ assistant-dialog.ts Conversación (buscador del encabezado).
├─ gestures.ts       Tocar = acción · mantener presionado = "más información".
```

### `theme.ts`
- Define dos paletas (`dark`, `light`) como variables CSS `--ic-*`.
- Las escribe en `<html>` (`document.documentElement.style`), así **todas** las tarjetas del
  paquete cambian a la vez, sin importar en qué parte del panel estén.
- Modo guardado por dispositivo en `localStorage` (`inventa-cards-theme`): `auto`, `dark`,
  `light` o `ha`. Detalle en [Tema y diseño](03-tema-y-diseno.md).
- Al cambiar el modo dispara el evento de ventana `inventa-cards-theme-changed`; las tarjetas
  que dependen del modo (por ejemplo, para elegir el logo) lo escuchan.
- `ensureTheme(hass)` se llama cada vez que una tarjeta recibe `hass`; solo vuelve a aplicar la
  paleta si cambió el modo oscuro de Home Assistant.

### `i18n.ts`
- Diccionarios `es` y `en`. El idioma sale de `hass.locale.language` (idioma del perfil del
  usuario); si empieza por `es` se usa español, en otro caso inglés.
- `t(hass, 'clave')` devuelve el texto; si falta una traducción cae al español.

### `actions.ts`
- `runAction(nodo, acción, entidad?)` delega en Home Assistant mediante el evento estándar
  `hass-action`, por lo que soporta todas las acciones nativas: `navigate`, `more-info`,
  `perform-action`, `url`, `assist`, `toggle`, `none`.
- Agrega `fire-dom-event` (no nativa): dispara `ll-custom` en `window` con la configuración de la
  acción. Es el mismo mecanismo de button-card y browser_mod, y permite abrir paneles de otras
  tarjetas (como el asistente y los avisos del dashboard de Inventa).

### `styles.ts`
- Tokens privados `--_x` que resuelven en cascada:
  `--ic-x` (paleta del paquete) → variable del tema de HA → valor fijo.
- Estilo base de `ha-card` (fondo, borde de 1 px, radio 16 px, sin sombra) y del botón
  cuadrado `.icon-btn` (40 × 40 px).

## Ciclo de vida de una tarjeta

```
 HA crea <inventa-x-card>
        │
        ▼
 setConfig(config)  ── valida y mezcla con los valores por defecto
        │                (si la configuración es inválida lanza un Error → HA muestra la tarjeta roja)
        ▼
 hass = {...}  (se repite en cada cambio de estado de CUALQUIER entidad)
        │
        ▼
 shouldUpdate()  ── ¿cambió algo que esta tarjeta muestra? si no → no redibuja
        │
        ▼
 willUpdate()    ── ensureTheme(hass), lee el modo resuelto
        │
        ▼
 render()        ── plantilla Lit → shadow DOM
```

**Rendimiento:** `hass` cambia muchas veces por segundo en una casa con muchos dispositivos.
Cada tarjeta implementa `shouldUpdate` para redibujar solo si cambian *sus* entidades
(en el encabezado: usuario, idioma, modo oscuro de HA o las entidades de los globos).

**Editor visual:** cada tarjeta expone `static getConfigForm()` con un esquema de `ha-form`.
Home Assistant genera el formulario automáticamente (selectores de entidad, ícono, acción…).
No hace falta programar un editor propio.

**Tamaño en el panel:** `getCardSize()` (vistas *masonry*) y `getGridOptions()` (vistas
*sections*). El encabezado ocupa el ancho completo.

**Diseño adaptable:** se usan *container queries* (`@container`) en vez de media queries: la
tarjeta se reorganiza según **su propio ancho**, no el de la pantalla. Así funciona bien también
dentro de columnas angostas en un escritorio.

## Build

```
npm run build
  ├─ tsc --noEmit        verificación de tipos (falla si hay errores)
  └─ vite build          empaqueta src/index.ts → dist/inventa-cards.js
                         formato ES module, destino ES2021, minificado
```

Tamaño actual: **~37 KB** (11 KB comprimido), de los cuales la mayor parte es Lit.
Cada tarjeta nueva suma típicamente 3–8 KB.

## Compatibilidad

| Requisito | Mínimo |
|---|---|
| Home Assistant | Versión reciente (el editor visual usa `getConfigForm`, disponible desde fines de 2024). Objetivo de pruebas: 2026.10 |
| Navegador | Cualquiera con soporte de container queries: Chrome/Edge 105+, Safari 16+, Firefox 110+, app Companion actual |
| Vista del panel | *sections*, *masonry*, *panel* y layouts de layout-card |

---
*Última revisión: 28-10-2026*
