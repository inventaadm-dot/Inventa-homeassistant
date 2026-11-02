// Tipos mínimos del objeto `hass` que usan las tarjetas.
// No dependemos de custom-card-helpers para mantener el paquete liviano.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  user?: { id: string; name: string; is_admin: boolean };
  locale?: { language: string };
  language?: string;
  themes?: { darkMode?: boolean };
  config?: { location_name?: string; unit_system?: { temperature?: string } };
  callService: (domain: string, service: string, data?: Record<string, any>, target?: Record<string, any>) => Promise<unknown>;
  callApi: <T>(method: 'GET' | 'POST', path: string, data?: Record<string, any>) => Promise<T>;
  /** Registro de áreas, entidades y dispositivos (lo trae el frontend de HA). */
  areas?: Record<string, { area_id: string; name: string; icon?: string | null; floor_id?: string | null }>;
  entities?: Record<string, { entity_id: string; area_id?: string | null; device_id?: string | null; hidden?: boolean; entity_category?: string | null }>;
  devices?: Record<string, { id: string; area_id?: string | null }>;
  callWS?: <T>(msg: Record<string, any>) => Promise<T>;
  /** Estado con formato e idioma de HA (2023.9+). */
  formatEntityState?: (stateObj: HassEntity, state?: string) => string;
  formatEntityAttributeValue?: (stateObj: HassEntity, attribute: string, value?: any) => string;
  fetchWithAuth?: (path: string, init?: RequestInit) => Promise<Response>;
  connection?: {
    subscribeMessage: <T>(callback: (msg: T) => void, msg: Record<string, any>) => Promise<() => void>;
  };
}

export interface ActionConfig {
  action: string;
  [key: string]: any;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: any): void;
  getCardSize?(): number | Promise<number>;
}
