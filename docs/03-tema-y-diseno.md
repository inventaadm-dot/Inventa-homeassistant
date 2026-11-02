# 3. Tema y diseño

## Modos

| Modo | Paleta usada | Cuándo conviene |
|---|---|---|
| `auto` *(por defecto)* | Oscura o clara según el modo oscuro de Home Assistant | Instalaciones nuevas: respeta la preferencia del usuario |
| `dark` | Oscura fija | Pantallas murales, salas, kioscos |
| `light` | Clara fija | Oficinas iluminadas, impresión de capturas |
| `ha` | Ninguna propia: se heredan los colores del tema activo de HA | Clientes con un tema corporativo ya definido |

- El modo se guarda **por dispositivo** (navegador o app) en `localStorage`, clave
  `inventa-cards-theme`. Dos personas pueden ver el mismo panel en modos distintos.
- El botón luna/sol del encabezado alterna entre `dark` y `light`.
- Si el navegador bloquea el almacenamiento (modo incógnito estricto), se usa `auto` y el cambio
  dura hasta recargar.

## Paleta

| Token | Uso | Oscuro | Claro |
|---|---|---|---|
| `--ic-bg` | Fondo del panel | `#0B1120` | `#F4F6FA` |
| `--ic-card` | Fondo de tarjeta | `#111A2E` | `#FFFFFF` |
| `--ic-card2` | Fondo secundario (botones, buscador, chips) | `#16213A` | `#F1F4F9` |
| `--ic-line` | Bordes y separadores | `#1F2A44` | `#E3E8EF` |
| `--ic-tx` | Texto principal | `#E6EDF7` | `#0F172A` |
| `--ic-tx2` | Texto secundario, íconos | `#94A3B8` | `#475569` |
| `--ic-tx3` | Texto tenue, ayudas | `#64748B` | `#94A3B8` |
| `--ic-acc` | Acento (acciones, selección, barras) | `#3B82F6` | `#2563EB` |
| `--ic-cyan` | Frío / clima activo | `#22D3EE` | `#0891B2` |
| `--ic-amb` | Luz encendida, advertencia | `#FBBF24` | `#D97706` |
| `--ic-heat` | Calor, globo de avisos | `#F59E0B` | `#D97706` |
| `--ic-ok` | Correcto, en línea | `#4ADE80` | `#15803D` |
| `--ic-okbg` | Fondo de pastilla "correcto" | `#0F2A1C` | `#DCFCE7` |
| `--ic-wbg` | Fondo de pastilla "advertencia" | `#2A1F0B` | `#FEF3C7` |
| `--ic-na` | Error, sin conexión, alarma | `#F87171` | `#DC2626` |
| `--ic-nabg` | Fondo de pastilla "error" | `#2A1215` | `#FEE2E2` |
| `--ic-pur` | Feriados, escenas nocturnas | `#A78BFA` | `#7C3AED` |

### Fondo del panel
Las tarjetas no cambian el fondo de Home Assistant. Para que el panel combine, en la
configuración de la vista:

```yaml
background: var(--ic-bg)
```

### Respaldo hacia el tema de Home Assistant
Dentro de las tarjetas nunca se usa `--ic-*` directamente, sino tokens privados que caen al tema
de HA si la paleta no está activa (modo `ha`):

| Token interno | Cadena de respaldo |
|---|---|
| `--_card` | `--ic-card` → `--ha-card-background` → `--card-background-color` |
| `--_card2` | `--ic-card2` → `--secondary-background-color` |
| `--_line` | `--ic-line` → `--divider-color` |
| `--_tx` / `--_tx2` / `--_tx3` | `--ic-tx*` → `--primary-text-color` / `--secondary-text-color` / `--disabled-text-color` |
| `--_acc` | `--ic-acc` → `--primary-color` |
| `--_amb` | `--ic-amb` → `--state-light-on-color` |
| `--_heat` | `--ic-heat` → `--warning-color` |
| `--_ok` | `--ic-ok` → `--success-color` |
| `--_na` | `--ic-na` → `--error-color` |
| `--_radius` | `--ic-radius` → `16px` |

## Reglas visuales

| Elemento | Regla |
|---|---|
| Tarjeta | Radio 16 px, borde 1 px `--ic-line`, **sin sombra** |
| Relleno de tarjeta | 14–16 px (encabezado: 10 × 16 px) |
| Botón cuadrado | 40 × 40 px, radio 10 px, fondo `--ic-card2`, ícono 18 px |
| Buscador | Alto 38 px, radio 10 px, ícono 18 px |
| Separación entre botones | 12 px (8 px en celular) |
| Pastillas de estado | Radio completo, texto 11–12 px, fondo suave del color de estado |
| Títulos de tarjeta | 15 px, peso 500 |
| Valores grandes | 26 px, peso 500 |
| Etiquetas | 12 px, `--ic-tx2` |
| Íconos | Material Design Icons (`mdi:*`) — los mismos de Home Assistant |
| Estados | Encendido = ámbar sutil; error = rojo; advertencia = ámbar; correcto = verde |
| Animaciones | Solo transiciones cortas (0,15 s). Las animaciones de tarjetas futuras (íconos del tiempo, etc.) deben desactivarse con `prefers-reduced-motion` |

## Diseño adaptable

- Punto de quiebre principal: **600 px de ancho de la tarjeta** (container query).
- Por debajo, las tarjetas pasan a una columna y los textos pueden ocupar varias líneas.
- La galería (`design/galeria.html`) muestra todas las tarjetas en ambos modos.

## Accesibilidad

- Todos los botones son `<button>` reales: se pueden usar con teclado y tienen `aria-label`.
- Foco visible: contorno de 2 px en color acento.
- Texto principal y secundario con buen contraste en ambos modos. El texto tenue (`--ic-tx3`)
  queda por debajo de 4,5 : 1 en modo claro: usarlo solo para ayudas y textos no esenciales.

---
*Última revisión: 28-10-2026*
