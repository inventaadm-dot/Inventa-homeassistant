# 6. Hoja de ruta

## Etapas

| # | Etapa | Contenido | Estado |
|---|---|---|---|
| 1 | Galería de diseño | Maqueta de las 18 tarjetas en modo oscuro y claro, con ejemplos de una casa | ✅ Aprobada |
| 2a | **Ambiente base del template** | Base (tema, idiomas, acciones, editor). **Encabezado** ✅ · **fondo del panel** ✅ · **calendario siempre presente** (agenda emergente + tarjeta Calendario) ✅ — v0.2.0 instalada · vistas mes / lista / completa + encabezado de subpágina — v0.3.0 · **panel Inventa que se arma solo (estrategia, sin código)** — v0.4.0 | 🔄 Por validar en HA |
| 2b | Primeras tarjetas de control | Indicador de resumen ✅ · tiempo ✅ · luz ✅ · clima ✅ · **habitaciones por área en el panel Inventa** ✅ — v0.5.0 | 🔄 Por validar en HA |
| 3 | Tarjetas avanzadas | **Avisos (campana 🔔)** ✅ · **cámara** ✅ — v0.11 · **asistente** ✅ — v0.12 | ✅ |
| 4 | Tarjetas nuevas + publicación | Tarjetas para todos los tipos de entidad ✅ v0.10–0.11 · repositorio en GitLab, CI y *releases* ⏳ | 🔄 |
| — | Estrategia de panel | ✅ v0.4: Inicio + Calendario · ✅ v0.5: resumen, tiempo y habitaciones a partir de las **áreas** de HA | ✅ |
| 5 | Migración opcional | Pasar el Corporate Dashboard de Inventa a estas tarjetas (con autorización y respaldo previo) | ⏳ |

Antes de instalar en un Home Assistant real, cada etapa se valida en la página de pruebas.
**Ningún cambio en un Home Assistant se hace sin autorización explícita.**

## Catálogo de tarjetas

| Tarjeta | Tipo YAML | Dominios | Origen | Estado |
|---|---|---|---|---|
| Encabezado | `inventa-header-card` | — | Corporate Dashboard | ✅ v0.2 (fondo + agenda) |
| Calendario | `inventa-calendar-card` | `calendar` | Corporate Dashboard | ✅ v0.3 (agenda, mes, lista, completa) |
| Indicador de resumen | `inventa-stat-card` | varios | Corporate Dashboard | ✅ v0.5 |
| Clima / termostato | `inventa-climate-card` | `climate` | Corporate Dashboard | ✅ v0.5 |
| Luz / interruptor | `inventa-light-card` | `light`, `switch`, `fan`, `input_boolean` | Corporate Dashboard | ✅ v0.5 |
| Chips de filtro | `inventa-chips-card` *(prop.)* | `input_select` | Corporate Dashboard | ⏳ |
| Tiempo | `inventa-weather-card` | `weather` | Corporate Dashboard | ✅ v0.5 |
| Cámara | `inventa-camera-card` | `camera` (+ `binary_sensor`) | Corporate Dashboard | ✅ v0.11 |
| Asistente | buscador del encabezado (`assistant: true`) | varios | Corporate Dashboard (`office-assistant-card`) | ✅ v0.12 |
| Avisos | `inventa-alerts-card` | varios | Corporate Dashboard (`office-alerts-card`) | ✅ v0.11 |
| Persianas / cortinas | `inventa-cover-card` | `cover` | Nueva | ✅ v0.11 |
| Ventilador | `inventa-fan-card` | `fan` | Nueva | ✅ v0.11 |
| Reproductor / TV | `inventa-media-card` | `media_player` | Nueva | ✅ v0.11 |
| Cerradura | `inventa-lock-card` | `lock` | Nueva | ✅ v0.11 |
| Sensor con gráfico | `inventa-sensor-card` | `sensor` | Nueva | ✅ v0.10 |
| Sensor binario | `inventa-binary-card` | `binary_sensor` | Nueva | ✅ v0.10 |
| Presencia | `inventa-person-card` | `person`, `device_tracker` | Nueva | ✅ v0.10 |
| Alarma | `inventa-alarm-card` | `alarm_control_panel` | Nueva | ✅ v0.11 |
| Aspiradora | `inventa-vacuum-card` | `vacuum` | Nueva | ✅ v0.11 |
| Riego | `inventa-irrigation-card` | `valve` (+ Hunter Hydrawise) | Nueva | ✅ v0.15 |
| Escena / script | `inventa-action-card` | `scene`, `script`, `button` | Nueva | ✅ v0.10 |
| Entidad (genérica) | `inventa-entity-card` | cualquiera | Nueva | ✅ v0.10 |

*(prop.) = nombre propuesto, puede cambiar al construirla.*

## Qué se generaliza al pasar del dashboard de la oficina al paquete

| En el Corporate Dashboard | En Inventa Cards |
|---|---|
| Logo de Inventa fijo | Opción `logo` / `logo_dark`; por defecto ícono + "Mi Casa" |
| 15 luces y 4 climas escritos a mano | Cada tarjeta recibe su entidad; los resúmenes reciben una lista |
| Termostatos Tuya ×5 (reportan en unidades de 0,5 °C ÷ 10) | **Corrección automática** para cualquier clima (por su temperatura máxima); `scale` para forzarla |
| "Nada de servidores" (filtro por palabras en el asistente) | Opción `exclude` (entidades y patrones) en asistente y avisos |
| Zonas Trabajo / Gerencia / Accesos / Baños | Chips configurables (o áreas de Home Assistant) |
| Paleta en el botón luna (JavaScript en YAML) | Módulo `theme.ts` con modos `auto/dark/light/ha` |
| Textos solo en español | Español e inglés |
| Requiere button-card, card-mod, layout-card, decluttering-card | Sin dependencias |

## Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 27-10-2026 | Nombre del paquete: **Inventa Cards** |
| 27-10-2026 | Repositorio en **GitLab privado** → instalación manual (sin HACS) |
| 27-10-2026 | La galería y los ejemplos se piensan para **una casa**, no una oficina |
| 27-10-2026 | El logo es una imagen configurable; por defecto, genérico "Mi Casa" |
| 27-10-2026 | Primera tarjeta: **Encabezado** |
| 28-10-2026 | Documentar todo el sistema antes de instalar nada |
| 29-10-2026 | v0.1.0 instalada a mano en el HA de la oficina, panel de pruebas "prueba inventa" ✅ |
| 29-10-2026 | Se piensa como **template completo**, no solo tarjetas: el template define también el **fondo** del panel |
| 29-10-2026 | El **calendario va siempre**, sea casa u oficina, tenga o no Google Calendar (si no hay, guía para crear uno) |
| 29-10-2026 | La campana de avisos queda para una actualización posterior |
| 29-10-2026 | v0.2.0 instalada (fondo + agenda) ✅ |
| 29-10-2026 | Conservar la vista mes + lista del Corporate Dashboard como opción `view` de la tarjeta Calendario; encabezado con modo subpágina |
| 29-10-2026 | El indicador "Sala de Reuniones disponible" se generalizará después como **indicador de recurso** opcional |
| 03-11-2026 | v0.15.0: **tarjeta de riego** (`inventa-irrigation-card`) para Hunter Hydrawise y cualquier válvula de agua: próximo riego, tiempo restante, regado hoy, agua usada, **Regar ahora / Detener** y programa **Automático**; bloque **Riego** e indicador **Zonas regando** en el panel |
| 02-11-2026 | v0.14.0: **tarjeta de clima con el diseño del Corporate Dashboard**: perilla del objetivo y rango 16–32°, píldora "Actual", línea de advertencia ("⚠ … sobre el objetivo · revisar equipo", opción `alert`), botones **Apagado / modo** y presets del equipo; luces siempre con ícono de ampolleta |
| 02-11-2026 | v0.13.0: **corrección automática de climas que reportan mal** (regla para cualquier entidad, no solo Tuya): se detecta por la temperatura máxima; aplica en tarjeta de clima, resumen, avisos y asistente; el campo del editor queda solo para forzarla |
| 02-11-2026 | v0.12.1: en escritorio los bloques **estiran sus tarjetas** para ocupar todo el ancho (sin columnas vacías); cámaras y TV con ancho máximo; celular sin cambios |
| 02-11-2026 | v0.12: **asistente** en el buscador del encabezado: entiende pedidos (encender/apagar, temperatura, escenas, consultas) solo sobre los equipos del panel; no abre cerraduras ni toca la alarma; respaldo opcional con Assist |
| 02-11-2026 | v0.11: **todas las tarjetas del diseño**: Cámara (imagen en vivo), Persiana, Ventilador, Cerradura, Alarma, Reproductor/TV, Aspiradora y la **🔔 campana de avisos**. **Tocar** ejecuta la acción (p. ej. encender la luz), **mantener presionado** abre la ventana de HA |
| 30-10-2026 | v0.10: **cualquier entidad**: campo único *Equipos a mostrar*; cada una va sola a su bloque (11 bloques en orden fijo). Nuevas: Entidad (genérica), Sensor con gráfico, Sensor binario, Escena/script, Presencia. Próximas: v0.11 Persiana, Ventilador, Cerradura, Alarma · v0.12 Reproductor, Aspiradora, Cámara |
| 30-10-2026 | v0.9: los bloques **vienen vacíos** y el usuario **elige** qué climas y luces mostrar (nada aparece solo, sin filtros de palabras) |
| 30-10-2026 | v0.8: el Inicio se ordena **siempre por tipo de equipo** (Climatización, Luces…), no por área; las áreas pasan a ser **chips de filtro**. Regla de inclusión: todos los climas y luces; interruptores solo con área o elegidos en el editor |
| 29-10-2026 | v0.7: orden del Inicio = encabezado · resumen · **tiempo (ancho completo)** · áreas/entidades · **agenda como pie (ancho completo, siempre al final)**; íconos del tiempo en SVG animado estilo HA |
| 29-10-2026 | v0.6: **editor visual del panel** (✏️) con subida de logo, sin "Tomar el control"; tiempo con íconos animados |
| 29-10-2026 | Las habitaciones del panel Inventa salen de las **áreas** de HA; solo se muestra lo que tiene área (interruptores incluidos) |
| 29-10-2026 | **Sin código para el usuario final**: el template se entrega como *estrategia de panel* "Inventa" que se elige con clics; personalización con "Tomar el control" + editores visuales |

## Pendientes / preguntas abiertas

- Crear el proyecto en GitLab y definir quién tiene acceso.
- Elegir el Home Assistant de pruebas (¿panel aparte en el de la oficina, o una instancia de
  pruebas?).
- Prioridad entre las tarjetas nuevas.

---
*Última revisión: 29-10-2026*
