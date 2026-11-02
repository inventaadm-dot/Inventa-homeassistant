# Glosario

| Término | Significado |
|---|---|
| **Home Assistant (HA)** | Plataforma de automatización del hogar donde se instalan las tarjetas. |
| **HAOS** | Home Assistant Operating System: sistema operativo completo de HA (con complementos). |
| **Entidad** | Cada cosa que HA conoce y puede mostrar o controlar: `light.living`, `climate.dormitorio`, `sensor.humedad_bano`. |
| **Dominio** | Primera parte del nombre de una entidad (`light`, `climate`, `sensor`…); indica qué tipo de cosa es. |
| **Estado** | Valor actual de una entidad (`on`, `off`, `22.5`, `unavailable`). |
| **unavailable / unknown** | La entidad existe pero HA no puede comunicarse con el equipo o no conoce su valor. |
| **Panel (dashboard) / Lovelace** | Pantalla de HA formada por vistas y tarjetas. *Lovelace* es el nombre histórico del sistema de paneles. |
| **Vista** | Una pestaña de un panel. Tipos: *sections* (recomendada), *masonry*, *panel*, *sidebar*. |
| **Tarjeta (card)** | Bloque visual dentro de una vista. |
| **Tarjeta personalizada (custom card)** | Tarjeta que no viene con HA; se agrega con un recurso y se usa como `type: custom:…`. |
| **Recurso** | Archivo JavaScript o CSS que HA carga en el navegador (Ajustes → Paneles → Recursos). |
| **`/config/www` y `/local/`** | Carpeta de HA cuyos archivos se sirven en la web como `/local/…`. |
| **HACS** | Tienda comunitaria para instalar integraciones y tarjetas desde GitHub. |
| **Acción (tap_action)** | Lo que ocurre al tocar algo: navegar, abrir detalles, ejecutar un servicio, etc. |
| **Assist** | Asistente de voz y texto integrado en HA. |
| **Tema** | Conjunto de colores de HA. Inventa Cards tiene su propia paleta o puede heredar el tema. |
| **Web Component / Custom Element** | Estándar del navegador para crear etiquetas HTML propias (`<inventa-header-card>`). |
| **Lit** | Biblioteca liviana para construir Web Components; base de las tarjetas de HA y de este paquete. |
| **Shadow DOM** | Encapsulamiento de un Web Component: sus estilos no afectan al resto de la página ni al revés. |
| **Container query** | Regla CSS que adapta el diseño según el ancho del contenedor (la tarjeta), no de la pantalla. |
| **Build / compilar** | Convertir el código fuente (`src/`) en el archivo final `dist/inventa-cards.js`. |
| **Caché** | Copia que guarda el navegador para no volver a descargar archivos; por eso se cambia `?v=` al actualizar. |
| **button-card, card-mod, layout-card, decluttering-card** | Complementos de la comunidad que usa el dashboard legado; Inventa Cards no los necesita. |
| **ll-custom / fire-dom-event** | Mecanismo para que una tarjeta envíe un aviso que otra escucha (p. ej. abrir el panel del asistente). |

---
*Última revisión: 28-10-2026*
