# 5. Guía de desarrollo

## Entorno

| Herramienta | Versión usada |
|---|---|
| Node.js | 20.15 |
| npm | 10.7 |
| git | 2.47 |
| Editor recomendado | VS Code (con soporte TypeScript y *lit-plugin*) |

```bash
npm install        # una vez
npm run dev        # página de pruebas en http://localhost:5173/dev/
npm run typecheck  # solo verificación de tipos
npm run build      # tipos + dist/inventa-cards.js
```

## Página de pruebas (`dev/`)

Permite ver y probar las tarjetas **sin Home Assistant** y sin tocar ninguna instalación real.

- `dev/main.ts` simula lo mínimo de HA:
  - `ha-card` (contenedor simple) e `ha-icon` (dibuja íconos MDI con `@mdi/js`).
  - Un objeto `hass` falso con usuario, idioma, modo oscuro y algunas entidades.
  - Escucha `hass-action` y `ll-custom` y los muestra en la consola (F12) para verificar
    que cada botón dispara la acción correcta.
- `dev/index.html` coloca varias instancias de cada tarjeta: configuración mínima, completa,
  ancho tablet (720 px) y celular (360 px).

> ⚠️ El simulador de `ha-icon` **debe** dibujar dentro de su *shadow DOM*. Si escribe en sus
> hijos, Lit pierde las marcas internas de la plantilla y aparecen textos vacíos. (Pasó con el
> buscador durante el desarrollo del encabezado.)

## Cómo crear una tarjeta nueva

Ejemplo: tarjeta de clima `inventa-climate-card`.

1. **Carpeta y archivo:** `src/cards/climate/climate-card.ts`.
2. **Esqueleto** (copiar la estructura del encabezado):
   ```ts
   @customElement('inventa-climate-card')
   export class InventaClimateCard extends LitElement {
     @property({ attribute: false }) public hass?: HomeAssistant;
     @state() private _config!: ClimateCardConfig;

     static getStubConfig(hass) { /* elegir una entidad climate.* existente */ }
     static getConfigForm() { /* esquema ha-form */ }
     setConfig(config) { /* validar + valores por defecto */ }
     getCardSize() { return 4; }
     getGridOptions() { return { columns: 6, rows: 'auto' }; }

     protected shouldUpdate(changed) { /* solo si cambió SU entidad */ }
     protected willUpdate(changed) { if (changed.has('hass')) ensureTheme(this.hass); }
     protected render() { /* html`<ha-card>…</ha-card>` */ }

     static styles = [tokens, css`…`];
   }
   ```
3. **Registrar** en `src/index.ts`: `import './cards/climate/climate-card';` y su entrada en
   `window.customCards` (tipo, nombre "Inventa · Clima", descripción, `preview: true`).
4. **Textos** nuevos en `src/i18n.ts` (siempre `es` y `en`).
5. **Probar** en `dev/`: agregar instancias en `index.html` y entidades simuladas en `main.ts`
   (encendida, apagada, *unavailable*, valores extremos).
6. **Documentar** en `docs/tarjetas/<nombre>.md` (usar `encabezado.md` como plantilla) y
   actualizar la tabla de la [hoja de ruta](06-hoja-de-ruta.md) y el `README.md`.

### Lista de verificación de cada tarjeta

- [ ] Funciona solo con la entidad (configuración mínima) y `getStubConfig` elige una real.
- [ ] Editor visual completo (`getConfigForm`) con etiquetas en es/en.
- [ ] Error claro si falta una opción obligatoria (`throw new Error(...)` en `setConfig`).
- [ ] Estados `unavailable` / `unknown` se muestran con estilo "sin conexión", sin romperse.
- [ ] `shouldUpdate` limitado a sus entidades.
- [ ] Modo oscuro, claro y `ha` revisados.
- [ ] Se ve bien a 360 px (container query).
- [ ] Botones accesibles (`<button>`, `aria-label`, foco visible).
- [ ] Sin valores de una instalación concreta (nada de "oficina", entity_id fijos, factores mágicos).
- [ ] Documentada.

## Convenciones

| Tema | Regla |
|---|---|
| Nombres de tarjeta | `inventa-<cosa>-card` (en YAML: `custom:inventa-<cosa>-card`) |
| Opciones | `snake_case`, igual que Home Assistant (`show_search`, `tap_action`) |
| Colores | Siempre tokens `--_x` de `styles.ts`; nunca hex fijos en una tarjeta |
| Íconos | `ha-icon` con nombres `mdi:*` |
| Textos visibles | Siempre por `t(hass, 'clave')` |
| Acciones | Siempre por `runAction()` |
| Comentarios | En español, explicando el *por qué* |
| Particularidades de un cliente | Se resuelven con opciones genéricas (ej. corrección automática de termostatos que reportan mal, `climate-scale.ts`), nunca con casos especiales en el código |

## Versiones

Se usa **versionado semántico** `MAYOR.MENOR.PARCHE`:

- **PARCHE** (0.1.1): correcciones sin cambios de opciones.
- **MENOR** (0.2.0): tarjetas u opciones nuevas, compatibles con lo anterior.
- **MAYOR** (1.0.0): cambios que obligan a editar configuraciones existentes.

Al publicar una versión:
1. Actualizar `version` en `package.json` y `VERSION` en `src/index.ts`.
2. Registrar los cambios en `CHANGELOG.md`.
3. `npm run build` y verificar en `dev/`.
4. Commit + etiqueta `vX.Y.Z` en GitLab; adjuntar `dist/inventa-cards.js` al *release*.

## Repositorio

- Rama principal: `main`.
- `dist/` y `node_modules/` están en `.gitignore`; el archivo compilado se entrega en los
  *releases*, no en el código.
- Destino: GitLab privado de Inventa (pendiente de crear el proyecto remoto).
- Más adelante: `.gitlab-ci.yml` que compile y adjunte `inventa-cards.js` automáticamente a
  cada etiqueta.

---
*Última revisión: 28-10-2026*
