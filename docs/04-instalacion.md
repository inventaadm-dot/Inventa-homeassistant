# 4. Instalación y actualización

> El repositorio está en un **GitLab privado**. HACS solo instala desde GitHub, por lo que la
> instalación es **manual**. Es un procedimiento de 5 minutos que se hace una vez por instalación.
> **No se escribe código:** después de instalar, el panel se crea con clics (ver *Crear el panel*).

## Requisitos

- Home Assistant reciente (recomendado: versión actual; se prueba en 2026.10).
- Usuario **administrador** de Home Assistant.
- Una forma de copiar archivos a `/config/www/`: complemento **File editor**, **Studio Code Server**
  o **Samba share**.
- Desde HA 2026.6 el menú *Recursos* se ve sin activar nada. En versiones anteriores hay que
  activar **Perfil → Modo avanzado**.

## Instalación

1. **Obtener el archivo** `inventa-cards.js`
   - Desde el repositorio: `npm install` y `npm run build` → queda en `dist/inventa-cards.js`.
   - (Futuro) Desde el *release* de GitLab, descargando el adjunto.
2. **Copiarlo a Home Assistant** en:
   ```
   /config/www/inventa-cards/inventa-cards.js
   ```
   Si la carpeta `www` no existía, **reinicia Home Assistant** una vez para que empiece a
   servirla como `/local/`.
3. **Registrar el recurso**
   **Ajustes → Paneles → ⋮ (arriba a la derecha) → Recursos → Añadir recurso**
   - URL: `/local/inventa-cards/inventa-cards.js?v=0.14.0`
   - Tipo de recurso: **Módulo JavaScript**
4. **Recargar el navegador** con **Ctrl + Shift + R** (en la app Companion:
   **Ajustes → Companion app → Depuración → Restablecer caché del frontend**).
5. **Comprobar**: abre la consola del navegador (F12). Debe aparecer
   `INVENTA-CARDS v0.14.0`. En el editor de un panel, **Añadir tarjeta** → buscar "Inventa".

## Crear el panel "Inventa" (sin código)

1. **Ajustes → Paneles → + Añadir panel**.
2. En **Paneles de la comunidad**, elige **Inventa**.
3. Ponle nombre e ícono (p. ej. "Mi Casa") → **Crear**.

El panel se arma solo:

| Vista | Contenido |
|---|---|
| **Inicio** | Siempre **ordenado por tipo de equipo**, de arriba abajo: encabezado (fondo, saludo, buscador, 📅, ☀️/🌙) · **resumen** (temperatura promedio, luces encendidas, climas activos, puertas y ventanas abiertas) · **tiempo** · bloque **Climatización** · bloque **Luces** (con chips para filtrar por área) · **agenda** como pie, siempre al final. Los bloques futuros (persianas, cámaras…) van entre el tiempo y la agenda. |
| **Calendario** (subpágina) | Encabezado con ← + calendario completo (mes + lista). El 📅 de Inicio lleva aquí. |

> **Los bloques vienen vacíos: tú eliges qué mostrar.** Un panel recién creado muestra encabezado,
> tiempo y agenda, y un aviso *"Agrega tus equipos"*. En el editor del panel (✏️), en **Equipos a
> mostrar**, agregas cualquier entidad y el template la ubica sola en su bloque, en el orden en que
> la agregaste. Nada aparece solo.
>
> | Bloque (orden fijo) | Tipos | Tarjeta |
> |---|---|---|
> | Climatización | `climate`, `fan`, `water_heater`, `humidifier` | Clima · Ventilador |
> | Luces | `light`, `switch`, `input_boolean` | Luz (chips por área) |
> | Persianas | `cover` | Persiana |
> | Multimedia | `media_player`, `remote` | Reproductor / TV |
> | Seguridad | `lock`, `alarm_control_panel`, `siren`, sensores de puerta/ventana/movimiento/humo/agua… | Cerradura · Alarma · Sensor binario |
> | Cámaras | `camera` | Cámara (imagen en vivo) |
> | Sensores | `sensor` y los demás `binary_sensor` | Sensor con gráfico · Sensor binario |
> | Personas | `person`, `device_tracker` | Presencia |
> | Aspiradoras | `vacuum`, `lawn_mower` | Aspiradora |
> | Escenas y rutinas | `scene`, `script`, `button`, `input_button` | Escena / script |
> | Otros | cualquier otro tipo | Entidad (genérica) |
>
> Un bloque sin equipos no se muestra. **Tocar** una tarjeta ejecuta su acción (encender una luz,
> etc.); **mantener presionado** abre la ventana de Home Assistant. La **🔔 campana** del encabezado
> revisa los equipos elegidos (ver [Avisos](avisos.md)).
> Si los equipos de un bloque son de varias áreas, aparecen
> chips para filtrar.

- Mientras no se "tome el control", el panel **se regenera con cada versión**: al actualizar el
  archivo, los paneles Inventa reciben las mejoras solos.
- **Personalizar sin código (recomendado):** en el panel, pulsa **✏️**. Se abre el **editor del
  panel Inventa**:
  - **Logo** y **logo para modo oscuro**: botón **Subir imagen** (PNG, JPG o GIF). La imagen se guarda
    en Home Assistant (igual que las fotos de las personas); no hay que copiar archivos.
  - Nombre del lugar e ícono (si no hay logo), subtítulo, tiempo, calendarios.
  - **Equipos a mostrar**: cualquier entidad; cada una va a su bloque. Son también la lista cerrada
    del [asistente](asistente.md) y de la [campana de avisos](avisos.md).
  - Respaldo opcional del asistente con Assist de Home Assistant.
  - Los climas que reportan mal (p. ej. Tuya) **se corrigen solos**; *Forzar corrección* solo si alguno no se detecta.

  El panel **sigue recibiendo las mejoras** de cada versión.
- **Tomar el control** (en el mismo ✏️ → ⋮): el panel pasa a tarjetas normales y cada una se edita
  con su editor visual. Da libertad total, pero el panel deja de recibir las mejoras automáticas de
  diseño (las tarjetas sí se actualizan).
- Las rutas internas son relativas (`inicio`, `calendario`): el panel funciona con cualquier
  nombre.

> **Si "Inventa" no aparece** en *Paneles de la comunidad*: revisa que el recurso esté cargado
> (consola: `INVENTA-CARDS v0.14.0`) y recarga con Ctrl + Shift + R. Como respaldo, crea un panel
> vacío, abre **✏️ → ⋮ → Editor de configuración en texto** y deja solo esta línea:
> `strategy: { type: custom:inventa }`

### Opciones del panel (opcionales, para instaladores)

En el editor de configuración en texto, dentro de `strategy:`:

```yaml
strategy:
  type: custom:inventa
  title: Casa Huina            # nombre si no hay logo
  logo: /local/marca/logo.svg  # logo propio
  logo_dark: /local/marca/logo-blanco.svg
  subtitle: Resumen de tu casa hoy
  calendar_entities:           # vacío = todos los calendarios
    - calendar.familia
  weather_entity: weather.casa # por defecto, el primero que encuentre
  entities:                    # equipos a mostrar; cada uno va a su bloque
    - climate.living
    - light.living
    - switch.luz_terraza
    - sensor.humedad_bano
    - scene.noche_de_cine
  scaled_climates: [climate.living]  # opcional: forzar corrección (normalmente se detecta sola)
  scale_factor: 5                    # por defecto 5
  climate_scale:               # o un factor distinto por clima
    climate.living: 5
```

Todas estas opciones también se cambian desde el editor visual del panel (✏️).

## Actualización

1. Reemplaza `/config/www/inventa-cards/inventa-cards.js` por la versión nueva.
2. En **Recursos**, edita la URL y cambia el número: `?v=0.12.0` → `?v=0.14.0`.
3. Recarga con Ctrl + Shift + R en cada dispositivo (o restablece la caché de la app).

> **¿Por qué cambiar `?v=`?** Home Assistant entrega `/local/` con caché de 31 días. Si la URL no
> cambia, los navegadores siguen usando la versión anterior aunque el archivo sea nuevo.

Antes de actualizar, revisa el `CHANGELOG` (cuando exista) por cambios de opciones.

## Desinstalación

1. Quita las tarjetas `custom:inventa-*` de los paneles (si no, se verán como error).
2. **Recursos** → elimina `/local/inventa-cards/inventa-cards.js`.
3. Borra la carpeta `/config/www/inventa-cards/`.
4. (Opcional) En cada navegador, el modo guardado queda en `localStorage` → se limpia borrando
   los datos del sitio.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Tarjeta roja "Custom element doesn't exist: inventa-header-card" | Recurso no registrado, URL mal escrita o caché | Revisar la URL del recurso (empieza con `/local/`, sin `www`), tipo *Módulo JavaScript*, Ctrl + Shift + R |
| No aparece `INVENTA-CARDS` en la consola | El archivo no se está sirviendo | Abrir `http://<ip-de-ha>:<puerto>/local/inventa-cards/inventa-cards.js` en el navegador: debe mostrar código. Si da 404, revisar la ruta o reiniciar HA |
| Se ve la versión anterior tras actualizar | Caché | Cambiar `?v=` del recurso y Ctrl + Shift + R / restablecer caché de la app |
| "Failed to execute 'define' on 'CustomElementRegistry'" en consola | El recurso está registrado dos veces | Dejar un solo recurso de inventa-cards |
| El fondo del panel no cambia | La vista tiene su propio `background:` o el encabezado tiene `background: false` | Quitar el `background:` de la vista (manda sobre el del template) |
| El logo no aparece | URL de la imagen incorrecta | Las imágenes propias van en `/config/www/...` y se referencian como `/local/...` |
| Un dispositivo se ve claro y otro oscuro | El modo se guarda por dispositivo | Comportamiento esperado; usar el botón luna/sol en cada uno |

---
*Última revisión: 02-11-2026 (v0.12.0)*
