# Documentación — Inventa Cards

Índice de la documentación del proyecto. Empieza por **Visión general** si es tu primera vez.

| # | Documento | Para quién | Contenido |
|---|---|---|---|
| 1 | [Visión general](01-vision-general.md) | Todos | Qué es el proyecto, de dónde viene, principios y estado |
| 2 | [Arquitectura](02-arquitectura.md) | Desarrollo | Cómo está construido: módulos, ciclo de vida de una tarjeta, build |
| 3 | [Tema y diseño](03-tema-y-diseno.md) | Diseño / desarrollo | Paleta, modos claro/oscuro, tokens CSS, reglas visuales |
| 4 | [Instalación y actualización](04-instalacion.md) | Instaladores / soporte | Cómo instalar en un Home Assistant, actualizar, desinstalar y resolver problemas |
| 5 | [Referencia: Encabezado](tarjetas/encabezado.md) | Usuarios / instaladores | Todas las opciones de `inventa-header-card` con ejemplos |
| 5b | [Referencia: Calendario](tarjetas/calendario.md) | Usuarios / instaladores | Agenda `inventa-calendar-card` y cómo agregar un calendario |
| 5c | [Referencia: Indicador de resumen](tarjetas/resumen.md) | Usuarios / instaladores | `inventa-stat-card` |
| 5d | [Referencia: Tiempo](tarjetas/tiempo.md) | Usuarios / instaladores | `inventa-weather-card` |
| 5e | [Referencia: Luz](tarjetas/luz.md) | Usuarios / instaladores | `inventa-light-card` |
| 5f | [Referencia: Clima](tarjetas/clima.md) | Usuarios / instaladores | `inventa-climate-card` (incluye `scale`) |
| 5g | [Referencia: Bloque](tarjetas/bloque.md) | Usuarios / instaladores | `inventa-group-card`: título, chips por área y grilla |
| 5h | [Referencia: Entidad](tarjetas/entidad.md) | Usuarios / instaladores | `inventa-entity-card` (cualquier entidad) |
| 5i | [Referencia: Sensor](tarjetas/sensor.md) | Usuarios / instaladores | `inventa-sensor-card` con mini gráfico |
| 5j | [Referencia: Sensor binario](tarjetas/sensor-binario.md) | Usuarios / instaladores | `inventa-binary-card` |
| 5k | [Referencia: Escena / script](tarjetas/escena.md) | Usuarios / instaladores | `inventa-action-card` |
| 5l | [Referencia: Presencia](tarjetas/presencia.md) | Usuarios / instaladores | `inventa-person-card` |
| 5m | [Referencia: Cámara](tarjetas/camara.md) | Usuarios / instaladores | `inventa-camera-card` |
| 5n | [Referencia: Persiana](tarjetas/persiana.md) | Usuarios / instaladores | `inventa-cover-card` |
| 5o | [Referencia: Ventilador](tarjetas/ventilador.md) | Usuarios / instaladores | `inventa-fan-card` |
| 5p | [Referencia: Cerradura](tarjetas/cerradura.md) | Usuarios / instaladores | `inventa-lock-card` |
| 5q | [Referencia: Alarma](tarjetas/alarma.md) | Usuarios / instaladores | `inventa-alarm-card` |
| 5r | [Referencia: Reproductor / TV](tarjetas/reproductor.md) | Usuarios / instaladores | `inventa-media-card` |
| 5s | [Referencia: Aspiradora](tarjetas/aspiradora.md) | Usuarios / instaladores | `inventa-vacuum-card` |
| 5t | [Avisos (campana)](avisos.md) | Usuarios / instaladores | Reglas y niveles de la 🔔 |
| 5u | [Asistente](asistente.md) | Usuarios / instaladores | Qué entiende el buscador y cómo se limita a los equipos del panel |
| 6 | [Guía de desarrollo](05-desarrollo.md) | Desarrollo | Entorno, página de pruebas, cómo crear una tarjeta nueva, convenciones, versiones |
| 7 | [Hoja de ruta](06-hoja-de-ruta.md) | Todos | Etapas, catálogo de tarjetas y su estado, decisiones tomadas |
| — | [Glosario](glosario.md) | Todos | Términos de Home Assistant y del proyecto |

## Convenciones de esta documentación

- Idioma: español. Los nombres técnicos (entidades, opciones YAML, comandos) se dejan tal cual.
- Las rutas de archivos son relativas a la raíz del repositorio.
- `/config` es la carpeta de configuración de Home Assistant (en HAOS se ve como `/homeassistant` desde algunos complementos).
- Cada documento indica al final la fecha de su última revisión.
