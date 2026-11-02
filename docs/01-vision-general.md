# 1. Visión general

## Qué es

**Inventa Cards** es un paquete de tarjetas para los paneles (dashboards) de **Home Assistant**.
Se instala una vez y entrega un conjunto de tarjetas con un diseño común — limpio, con modo
oscuro y claro — que cualquier persona puede agregar a su panel desde el editor visual, sin
escribir código.

Está pensado para **cualquier tipo de inmueble**: una casa (el caso más común), un departamento,
una oficina o una institución. Nada está atado a un lugar en particular: nombres, logo, entidades
y textos se configuran en cada tarjeta.

## De dónde viene

Nace del rediseño del **Corporate Dashboard** de la oficina de Inventa (octubre 2026). Ese panel
se construyó con YAML y cuatro complementos de la comunidad (button-card, card-mod, layout-card,
decluttering-card) y quedó con muy buen resultado visual, pero:

- No se puede reutilizar: tiene entidades, nombres y particularidades de la oficina escritas a mano.
- Depende de cuatro complementos externos que pueden romperse con actualizaciones de Home Assistant.
- Es difícil de mantener: más de 2.400 líneas de YAML con JavaScript incrustado.

Inventa Cards toma ese diseño y lo convierte en **tarjetas propias, genéricas y portables**,
siguiendo el modelo de paquetes reconocidos como *Mushroom*.

## Principios

| Principio | Qué significa en la práctica |
|---|---|
| **Portable** | Funciona en cualquier Home Assistant reciente; no supone entidades, áreas ni idioma. |
| **Sin dependencias** | Un solo archivo `inventa-cards.js`. No requiere button-card, card-mod ni otros. |
| **Configurable, no programable** | Todo se ajusta con opciones (editor visual o YAML). Nunca hay que escribir JavaScript. |
| **Diseño coherente** | Todas las tarjetas comparten paleta, tipografía, radios y espaciados. |
| **Claro y oscuro** | Paleta propia en ambos modos, o heredar el tema activo de Home Assistant. |
| **Celular primero** | Cada tarjeta se reorganiza sola en pantallas angostas. |
| **Español e inglés** | Textos según el idioma del usuario de Home Assistant. |
| **Seguro por defecto** | Las tarjetas solo hacen lo que su configuración indica (p. ej. listas de exclusión en el asistente). |

## Estado actual (29-10-2026)

| Área | Estado |
|---|---|
| Galería de diseño (18 tarjetas maquetadas) | ✅ Aprobada — `design/galeria.html` |
| Base del proyecto (build, tema, idiomas, acciones) | ✅ Lista |
| Tarjeta **Encabezado** | ✅ v0.1 instalada y probada en el HA de la oficina (panel "prueba inventa") |
| **Ambiente base**: fondo del panel + calendario siempre presente (agenda y tarjeta Calendario) | ✅ v0.2.0 instalada en el HA de la oficina |
| Calendario con vistas mes / lista / completa + encabezado de subpágina | ✅ v0.3.0 |
| **Panel Inventa** que se arma solo (estrategia de panel, sin código) | ✅ v0.4.0 instalada (panel "mi casa") |
| Etapa 2b: resumen, tiempo, luz, clima + habitaciones por área | ✅ v0.5.0 probada en página de pruebas; ⏳ por instalar |
| Resto de tarjetas | ⏳ Según [hoja de ruta](06-hoja-de-ruta.md) |
| Repositorio | Git local inicializado; destino: **GitLab privado** de Inventa |

## Qué NO es

- No es un tema completo de Home Assistant: da estilo a sus propias tarjetas y al **fondo del panel**
  donde está el encabezado; el resto de Home Assistant (menús, ajustes) no cambia.
- No es una integración: no crea entidades ni se conecta a dispositivos. Muestra y controla
  entidades que ya existen.
- No reemplaza el editor de paneles de Home Assistant: las tarjetas se colocan con él.

---
*Última revisión: 28-10-2026*
