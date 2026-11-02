// Motor del asistente: entiende pedidos en lenguaje natural (español e
// inglés básico) y actúa SOLO sobre una lista cerrada de equipos: los que el
// usuario eligió mostrar en el panel. Lo que no está en la lista no existe
// para el asistente.
//
// Entiende:
//   · encender / apagar   "apaga las luces del living", "enciende todo"
//   · persianas           "abre la cortina", "cierra las persianas"
//   · temperatura         "pon el aire de la oficina en 22", "sube el aire"
//   · escenas / scripts   "activa noche de cine"
//   · consultas           "¿qué luces están encendidas?", "¿qué temperatura hay?"
//   · búsqueda            cualquier nombre o área → su estado
// Por seguridad no abre cerraduras ni desarma alarmas.

import type { HassEntity, HomeAssistant } from '../types';
import { t } from '../i18n';
import { domain, entityArea, formatNumber, isUnavailable, stateText } from '../ha';
import { climateRaw, climateTemp, type ClimateScales } from '../climate-scale';

export type ReplyKind = 'ok' | 'bot' | 'warn' | 'block';
export interface Reply {
  kind: ReplyKind;
  text: string;
}

export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:"«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const has = (text: string, words: string[]) => words.some((w) => new RegExp(`(^| )${w}( |$)`).test(text));

const V_ON = ['enciende', 'encender', 'enciendan', 'prende', 'prender', 'activa', 'activar', 'turn on', 'switch on'];
const V_OFF = ['apaga', 'apagar', 'apaguen', 'desactiva', 'desactivar', 'turn off', 'switch off'];
const V_OPEN = ['abre', 'abrir', 'sube', 'subir', 'open', 'raise'];
const V_CLOSE = ['cierra', 'cerrar', 'baja', 'bajar', 'close', 'lower'];
const V_SET = ['pon', 'poner', 'ajusta', 'ajustar', 'cambia', 'cambiar', 'configura', 'deja', 'set'];
const V_RUN = ['ejecuta', 'ejecutar', 'corre', 'inicia', 'iniciar', 'lanza', 'run', 'start'];
const ALL = ['todas', 'todos', 'todo', 'all', 'everything'];
const PLURAL = ['luces', 'lamparas', 'focos', 'aires', 'climas', 'persianas', 'cortinas', 'ventiladores', 'todas', 'todos', 'lights', 'blinds'];
const V_ALARM = ['desarma', 'desarmar', 'arma', 'armar', 'disarm', 'arm'];
const Q_TEMP = ['temperatura', 'grados', 'calor', 'frio', 'cuanto hace', 'temperature'];
const Q_STATE = ['estado', 'como esta', 'como estan', 'encendida', 'encendidas', 'encendido', 'encendidos', 'prendida', 'prendidas', 'apagada', 'apagadas', 'abierta', 'abiertas', 'cerrada', 'cerradas', 'cuantas', 'cuantos', 'que', 'status', 'which'];

/** Palabras de tipo → dominios. */
const TYPES: Array<[string[], string[]]> = [
  [['luz', 'luces', 'lampara', 'lamparas', 'foco', 'focos', 'light', 'lights'], ['light', 'switch', 'input_boolean']],
  [['aire', 'aires', 'clima', 'climas', 'climatizacion', 'termostato', 'acondicionado', 'calefaccion', 'ac'], ['climate']],
  [['persiana', 'persianas', 'cortina', 'cortinas', 'porton', 'toldo', 'blind', 'blinds', 'cover'], ['cover']],
  [['tele', 'tv', 'television', 'televisor', 'parlante', 'musica', 'speaker'], ['media_player']],
  [['ventilador', 'ventiladores', 'fan'], ['fan']],
  [['cerradura', 'chapa', 'lock'], ['lock']],
  [['alarma', 'alarm'], ['alarm_control_panel']],
  [['aspiradora', 'robot', 'vacuum'], ['vacuum']],
  [['escena', 'escenas', 'rutina', 'modo', 'scene'], ['scene', 'script']],
  [['camara', 'camaras', 'camera'], ['camera']],
];
const POWER = ['light', 'switch', 'input_boolean', 'fan', 'media_player', 'climate', 'vacuum', 'cover'];

const STOP = new Set(['las', 'los', 'del', 'que', 'hay', 'una', 'uno', 'por', 'para', 'esta', 'estan', 'como', 'con', 'the', 'and', 'luz', 'interruptor', 'switch', 'sensor']);

interface Item {
  id: string;
  d: string;
  name: string;
  nname: string;
  area: string;
  words: string[];
}

function list(hass: HomeAssistant | undefined, names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${t(hass, 'and')} ${names[names.length - 1]}`;
}

export class AssistantEngine {
  constructor(
    private readonly hass: HomeAssistant,
    private readonly entities: string[],
    private readonly scales: ClimateScales = {},
  ) {}

  private _items(): Item[] {
    return this.entities
      .filter((id) => this.hass.states[id])
      .map((id) => {
        const name = this.hass.states[id].attributes.friendly_name || id;
        const a = entityArea(this.hass, id);
        const nname = norm(name);
        return {
          id,
          d: domain(id),
          name,
          nname,
          area: a ? norm(this.hass.areas?.[a]?.name || a) : '',
          words: nname.split(' ').filter((w) => w.length >= 3 && !STOP.has(w)),
        };
      });
  }

  /** Equipos nombrados en el texto: nombre completo > área > palabra distintiva. */
  private _match(text: string, pool: Item[]): Item[] {
    const contains = (s: string) => !!s && new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(text);
    // "las luces del living": con plural, el área manda sobre un equipo que se llame igual.
    if (has(text, PLURAL)) {
      const areaHits = pool.filter((i) => contains(i.area));
      if (areaHits.length) return areaHits;
    }
    const full = pool.filter((i) => contains(i.nname));
    if (full.length) {
      // Si "pasillo bano" y "pasillo" coinciden, quedarse con el más largo.
      const longest = Math.max(...full.map((i) => i.nname.length));
      return full.filter((i) => i.nname.length === longest || !full.some((o) => o !== i && o.nname.includes(i.nname)));
    }
    const byArea = pool.filter((i) => contains(i.area));
    if (byArea.length) return byArea;
    return pool.filter((i) => i.words.some((w) => contains(w)));
  }

  private _type(text: string): string[] | undefined {
    return TYPES.find(([words]) => has(text, words))?.[1];
  }

  private _st(id: string): HassEntity {
    return this.hass.states[id];
  }

  private _line(i: Item): string {
    const st = this._st(i.id);
    if (isUnavailable(st)) return `${i.name}: ${t(this.hass, 'unavailable').toLowerCase()}`;
    if (i.d === 'climate') {
      const cur = climateTemp(this.hass, st, 'current_temperature', this.scales[i.id]) ?? NaN;
      const target = climateTemp(this.hass, st, 'temperature', this.scales[i.id]) ?? NaN;
      const parts = [Number.isFinite(cur) ? `${formatNumber(this.hass, cur, 1)} °C` : '', Number.isFinite(target) ? `${t(this.hass, 'target').toLowerCase()} ${formatNumber(this.hass, target, 1)} °C` : ''];
      return `${i.name}: ${[stateText(this.hass, st), ...parts].filter(Boolean).join(' · ')}`;
    }
    return `${i.name}: ${stateText(this.hass, st)}`;
  }

  async handle(raw: string): Promise<Reply | null> {
    const text = norm(raw);
    const items = this._items();
    if (!text) return null;
    if (!items.length) return { kind: 'warn', text: t(this.hass, 'as_no_entities') };

    const type = this._type(text);
    const pool = type ? items.filter((i) => type.includes(i.d)) : items;
    const named = this._match(text, pool);
    const all = has(text, ALL);

    // 0) Alarma: nunca desde el asistente
    if (has(text, V_ALARM)) return { kind: 'block', text: t(this.hass, 'as_security') };

    // 1) Escena / script nombrado (o "activa/ejecuta" + nombre)
    const scenes = this._match(text, items.filter((i) => i.d === 'scene' || i.d === 'script'));
    if (scenes.length && (has(text, [...V_RUN, ...V_ON]) || scenes.some((s) => text === s.nname))) {
      for (const s of scenes) await this.hass.callService(s.d, 'turn_on', { entity_id: s.id });
      return { kind: 'ok', text: t(this.hass, 'as_ran', { names: list(this.hass, scenes.map((s) => s.name)) }) };
    }

    // 2) Temperatura de un clima ("pon el aire en 22", "sube el aire")
    const climates = items.filter((i) => i.d === 'climate');
    const num = text.match(/(\d{1,2}(?:[.,]\d)?)/);
    const climateCtx = (type?.includes('climate') || named.some((i) => i.d === 'climate')) && climates.length;
    if (climateCtx && (has(text, V_SET) || num || (has(text, ['sube', 'subir', 'baja', 'bajar']) && !has(text, V_ON) && !has(text, V_OFF)))) {
      const targets = named.filter((i) => i.d === 'climate').length ? named.filter((i) => i.d === 'climate') : climates.length === 1 ? climates : [];
      if (!targets.length) return { kind: 'warn', text: t(this.hass, 'as_which_climate', { names: list(this.hass, climates.map((c) => c.name)) }) };
      const up = has(text, ['sube', 'subir']);
      const down = has(text, ['baja', 'bajar']);
      const done: string[] = [];
      for (const c of targets) {
        const st = this._st(c.id);
        if (isUnavailable(st)) continue;
        const cur = climateTemp(this.hass, st, 'temperature', this.scales[c.id]) ?? NaN;
        let target = num ? Number(num[1].replace(',', '.')) : up ? cur + 1 : down ? cur - 1 : NaN;
        if (!Number.isFinite(target)) return { kind: 'warn', text: t(this.hass, 'as_say_temp') };
        const min = climateTemp(this.hass, st, 'min_temp', this.scales[c.id]) ?? 7;
        const max = climateTemp(this.hass, st, 'max_temp', this.scales[c.id]) ?? 35;
        target = Math.max(min, Math.min(max, Math.round(target * 2) / 2));
        await this.hass.callService('climate', 'set_temperature', { entity_id: c.id, temperature: climateRaw(this.hass, st, target, this.scales[c.id]) });
        done.push(`${c.name} → ${formatNumber(this.hass, target, 1)} °C`);
      }
      return done.length ? { kind: 'ok', text: t(this.hass, 'as_temp_set', { list: done.join(', ') }) } : { kind: 'warn', text: t(this.hass, 'as_offline') };
    }

    // 3) Encender / apagar / abrir / cerrar
    const on = has(text, V_ON);
    const off = has(text, V_OFF);
    const open = has(text, V_OPEN);
    const close = has(text, V_CLOSE);
    if (on || off || open || close) {
      let targets = named.length ? named : all || type ? pool : [];
      targets = targets.filter((i) => POWER.includes(i.d) || i.d === 'lock' || i.d === 'alarm_control_panel');
      if (!targets.length) return { kind: 'warn', text: t(this.hass, 'as_not_found') + this._hint(items) };
      if (targets.some((i) => i.d === 'alarm_control_panel') || (targets.some((i) => i.d === 'lock') && (open || on))) {
        return { kind: 'block', text: t(this.hass, 'as_security') };
      }
      const ok = targets.filter((i) => !isUnavailable(this._st(i.id)));
      const offline = targets.filter((i) => !ok.includes(i));
      for (const i of ok) {
        if (i.d === 'cover') await this.hass.callService('cover', open || on ? 'open_cover' : 'close_cover', { entity_id: i.id });
        else if (i.d === 'lock') await this.hass.callService('lock', 'lock', { entity_id: i.id });
        else if (i.d === 'climate') {
          const modes: string[] = this._st(i.id).attributes.hvac_modes || [];
          const mode = on || open ? ['heat_cool', 'cool', 'auto', 'heat', 'fan_only', 'dry'].find((m) => modes.includes(m)) : 'off';
          if (mode) await this.hass.callService('climate', 'set_hvac_mode', { entity_id: i.id, hvac_mode: mode });
        } else if (i.d === 'vacuum') await this.hass.callService('vacuum', on || open ? 'start' : 'return_to_base', { entity_id: i.id });
        else await this.hass.callService('homeassistant', on || open ? 'turn_on' : 'turn_off', { entity_id: i.id });
      }
      const verb = t(this.hass, open && !on ? 'as_opened' : close && !off ? 'as_closed' : on ? 'as_turned_on' : 'as_turned_off');
      let msg = ok.length ? `${verb}: ${list(this.hass, ok.map((i) => i.name))}.` : '';
      if (offline.length) msg += `${msg ? ' ' : ''}${t(this.hass, 'unavailable')}: ${list(this.hass, offline.map((i) => i.name))}.`;
      return { kind: ok.length ? 'ok' : 'warn', text: msg };
    }

    // 4) Temperatura
    if (has(text, Q_TEMP)) {
      const temps = items.filter((i) => i.d === 'climate' || (i.d === 'sensor' && this._st(i.id).attributes.device_class === 'temperature'));
      const sel = this._match(text, temps);
      const show = sel.length ? sel : temps;
      if (!show.length) return { kind: 'warn', text: t(this.hass, 'as_no_temp') };
      return { kind: 'bot', text: show.map((i) => this._line(i)).join('\n') };
    }

    // 5) Consultas de estado ("¿qué luces están encendidas?")
    if (has(text, Q_STATE) && (type || named.length)) {
      const sel = named.length ? named : pool;
      const wantOn = has(text, ['encendida', 'encendidas', 'encendido', 'encendidos', 'prendida', 'prendidas', 'abierta', 'abiertas', 'on', 'open']);
      const wantOff = has(text, ['apagada', 'apagadas', 'cerrada', 'cerradas', 'off', 'closed']);
      if ((wantOn || wantOff) && !named.length) {
        const active = (i: Item) => ['on', 'open', 'playing', 'unlocked', 'cleaning', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'].includes(this._st(i.id).state);
        const res = sel.filter((i) => !isUnavailable(this._st(i.id)) && (wantOn ? active(i) : !active(i)));
        const label = t(this.hass, wantOn ? 'as_active' : 'as_inactive');
        return { kind: 'bot', text: res.length ? `${label} (${res.length}): ${list(this.hass, res.map((i) => i.name))}.` : t(this.hass, 'as_none') };
      }
      return { kind: 'bot', text: sel.map((i) => this._line(i)).join('\n') };
    }

    // 6) Búsqueda por nombre o área
    if (named.length) return { kind: 'bot', text: named.map((i) => this._line(i)).join('\n') };
    return null;
  }

  private _hint(items: Item[]): string {
    const names = [...new Set(items.map((i) => i.name))];
    return `\n${t(this.hass, 'as_available')}: ${list(this.hass, names.slice(0, 8))}${names.length > 8 ? '…' : '.'}`;
  }

  help(): Reply {
    return { kind: 'warn', text: t(this.hass, 'as_not_understood') + this._hint(this._items()) };
  }

  /** Sugerencias según los equipos disponibles. */
  suggestions(): string[] {
    const items = this._items();
    const out: string[] = [];
    const lights = items.filter((i) => ['light', 'switch'].includes(i.d));
    if (lights.length) out.push(t(this.hass, 'as_sug_lights_on'));
    if (lights[0]) out.push(t(this.hass, 'as_sug_turn_on', { name: lights[0].name }));
    if (items.some((i) => i.d === 'climate')) out.push(t(this.hass, 'as_sug_temp'));
    const scene = items.find((i) => i.d === 'scene' || i.d === 'script');
    if (scene) out.push(t(this.hass, 'as_sug_run', { name: scene.name }));
    if (lights.length > 1) out.push(t(this.hass, 'as_sug_all_off'));
    return out.slice(0, 4);
  }
}
