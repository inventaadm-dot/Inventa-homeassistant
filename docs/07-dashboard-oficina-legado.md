# 7. Dashboard de la oficina (legado)

Referencia del **Corporate Dashboard** de la oficina de Inventa, tal como funciona hoy. Es el
origen del diseño de Inventa Cards y **sigue en uso**; este proyecto no lo modifica.

## Datos generales

| Dato | Valor |
|---|---|
| Home Assistant | 2026.10.1 sobre HAOS, Raspberry Pi 5 |
| Panel | `corporate-dashboard` (modo almacenamiento, editable desde la UI) |
| Vistas | `oficina` (principal), `calendario` (subvista), `camaras` (subvista) |
| Respaldo del YAML | `legacy/corporate-dashboard/corporate-dashboard-v8.yaml` |

> ⚠️ El respaldo v8 es anterior al ajuste del **encabezado para celular** (15-10-2026), que se
> aplicó directamente en Home Assistant: `mediaquery` en el layout de la vista, del encabezado
> y de la fila "Oficina", y `extra_styles` en el logo, el saludo y las pastillas.
> Para un respaldo exacto, exportar de nuevo desde **Editar panel → ⋮ → Editor de configuración**.

## Dependencias (HACS)

| Complemento | Uso |
|---|---|
| button-card | Casi todas las tarjetas (con JavaScript incrustado) |
| card-mod | Estilos del calendario y de tarjetas nativas |
| layout-card | Grillas (`custom:grid-layout`) y diseño adaptable |
| decluttering-card | Plantillas reutilizables: `weather_card`, `climate_card`, `light_card`, `cam_tile` |

### Recursos propios (`/config/www/corporate-dashboard/`)

| Archivo | Recurso | Función |
|---|---|---|
| `office-assistant-card.js` | `?v=3` | Buscador/asistente: interpreta pedidos sobre una lista cerrada de 15 luces y 4 climas. Bloquea palabras de servidores. No usa Assist. Botón Limpiar, máx. 30 mensajes |
| `office-alerts-card.js` | `?v=1` | Campana de avisos: humo cocina, puerta >10 min, sala >3 °C sobre objetivo, equipos sin conexión, batería <20 %, feriado ≤7 días, actualizaciones (solo admin) |
| `logos/logo_hortizontal_blanco_svg.svg` | — | Logo modo oscuro (recortado con `#svgView(viewBox(38,303,537,186))`) |
| `logos/logo_inventasa.svg` | — | Logo modo claro |

Copias de los dos `.js` en `legacy/corporate-dashboard/`.

## Contenido de la vista principal

| Sección | Detalle |
|---|---|
| Encabezado | Logo, saludo dinámico, buscador (abre el asistente con `ll-custom {cd_assistant: toggle}`), calendario, luna/sol, campana (`ll-custom {cd_alerts: toggle}`) |
| Estado | "Sistema en línea" + cantidad de entidades no disponibles |
| Resumen | Temperatura promedio y climas activos |
| Tiempo | `weather.oficina_inventa` con pronóstico |
| Climatización | 4 termostatos: Oficina, I+D, Soporte, Sala de Reuniones |
| Iluminación | 15 luces en 4 zonas (Trabajo, Gerencia, Accesos, Baños), filtro con `input_select.dashboard_filtro_luces`, "Apagar todo" con confirmación |
| Seguridad | Cámaras Pasillo Baños y Cámara Aires (UniFi Protect); acceso a la subvista de cámaras |
| Próximos eventos | Calendarios disponibles (incluye `calendar.chile` = feriados) |

## Reglas y particularidades

| Tema | Detalle |
|---|---|
| **Servidores** | Regla del usuario: *nada relacionado con servidores* en este panel, y **no tocar nada de servidores** en Home Assistant (ni el termostato `climate.t7_air_conditioner_thermostat_wifi`, ni luces o SonoffLAN de la sala de servidores) |
| **Termostatos Tuya** | Reportan en unidades de 0,5 °C y HA divide por 10: el valor real es **×5**. El panel lo corrige con `factor: 5` |
| **Fan coils** | No entregan aire frío (sistema central apagado o en calefacción): bajar el objetivo no enfría |
| **Tema** | Variables `--cd-*` definidas por el botón luna; modo por dispositivo en `localStorage` `cd-theme`; oscuro por defecto |
| **Cámaras** | UniFi Protect con `override_connection_host` activado (el RTSP iba a 192.168.1.1). Entrada y Estaciones 1 están desconectadas y se quitaron de los mosaicos |
| **Autorización** | Todo cambio en Home Assistant requiere autorización explícita previa |

## Auditoría de Home Assistant (limpieza en curso)

| Bloque | Estado |
|---|---|
| Fire Tablet (Fully Kiosk, sin conexión) | **Se mantiene** por decisión del usuario |
| Balizas iTrack (iBeacon) | 8 de 9 eliminadas (14-10-2026). Pendiente: borrar a mano *iTrack C1E6*, desactivar "entidades nuevas" en iBeacon, decidir sobre *J65118647 35EB* |
| TV Reuniones duplicadas | ✅ 4 entidades fantasma eliminadas (15-10-2026); la tele real es `media_player.reuniones_3` |
| SmartThings | ⚠️ Sus 16 entidades están no disponibles (incluida la TV de Operaciones, usada por la automatización "Enciende TV Operaciones"). Probable reautenticación. No se tocó |
| Equipos/escenas de prueba, duplicados SonoffLAN de oficina, Hockey/Rugby/Calle Sur | ⏳ Pendientes (los SonoffLAN de servidores quedan excluidos) |

## Pendientes externos

- Calendario Zimbra (CalDAV/ICS, lo agrega el usuario).
- Reparar cámaras Entrada y Estaciones 1.
- Confirmar ubicación de la Cámara Aires (si es sala técnica/servidores, quitarla del panel).
- Pilas del sensor de temperatura/humedad.
- Mantención del frío de los fan coils.

---
*Última revisión: 28-10-2026*
