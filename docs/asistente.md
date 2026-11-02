# Asistente (buscador del encabezado)

Al tocar **"Buscar o pedir algo…"** se abre el asistente: una conversación donde escribes pedidos
en lenguaje natural. Actúa **solo sobre los equipos del panel** (los que elegiste mostrar): lo que
no está en el panel no existe para el asistente, así nunca toca otros equipos de la instalación.

## Qué entiende

| Pedido | Ejemplos |
|---|---|
| Encender / apagar | «apaga las luces del living», «enciende la cocina», «apaga todas las luces» |
| Persianas | «abre la cortina», «cierra las persianas» |
| Temperatura de un clima | «pon el aire del dormitorio en 22», «sube el aire», «baja el clima de la oficina» |
| Encender / apagar un clima | «enciende el aire de la oficina» (elige el modo disponible: frío/calor/auto) |
| Escenas y scripts | «activa noche de cine», «ejecuta buenas noches» |
| Consultas | «¿qué luces están encendidas?», «¿qué temperatura hay?», «¿cómo está la persiana?» |
| Búsqueda | cualquier nombre o área → su estado («cocina», «dormitorio») |

- Reconoce equipos por su **nombre** y por su **área** («las luces del living» = todas las luces del
  área Living).
- Español e inglés básico; no distingue mayúsculas ni tildes.
- **Seguridad:** no abre cerraduras ni arma/desarma la alarma (eso se hace desde su tarjeta). Sí
  puede **cerrar** una cerradura.
- Sugerencias rápidas según los equipos del panel; botón **Limpiar** para borrar la conversación
  (guarda hasta 30 mensajes mientras la página está abierta).

## Respaldo con el asistente de Home Assistant (opcional)

En el editor del panel (✏️): *"Si el asistente no entiende, preguntar al asistente de Home
Assistant"*. Lo que el asistente de Inventa no entienda se envía a Assist de Home Assistant, que
actúa sobre las entidades **expuestas** a Assist (Ajustes → Asistentes de voz → Exponer). Viene
**apagado** para que el asistente nunca salga de la lista del panel.

## En un encabezado propio

```yaml
type: custom:inventa-header-card
assistant: true
assistant_entities:
  - light.living
  - climate.dormitorio
  - scene.noche_de_cine
assist_fallback: false
```

---
*Última revisión: 02-11-2026 (v0.12.0)*
