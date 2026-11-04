import './cards/header/header-card';
import './cards/calendar/calendar-card';
import './cards/stat/stat-card';
import './cards/weather/weather-card';
import './cards/light/light-card';
import './cards/climate/climate-card';
import './cards/group/group-card';
import './cards/entity/entity-card';
import './cards/sensor/sensor-card';
import './cards/binary/binary-card';
import './cards/action/action-card';
import './cards/person/person-card';
import './cards/camera/camera-card';
import './cards/cover/cover-card';
import './cards/fan/fan-card';
import './cards/lock/lock-card';
import './cards/alarm/alarm-card';
import './cards/media/media-card';
import './cards/vacuum/vacuum-card';
import './cards/irrigation/irrigation-card';
import './strategy/dashboard-strategy';

const VERSION = '0.15.2';

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string; preview?: boolean; documentationURL?: string }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'inventa-header-card',
  name: 'Inventa · Encabezado',
  description: 'Logo o nombre de la casa, saludo, buscador, agenda y modo claro/oscuro. Pinta el fondo del panel.',
  preview: true,
});
window.customCards.push({
  type: 'inventa-calendar-card',
  name: 'Inventa · Calendario',
  description: 'Agenda, mes, lista de la semana o vista completa de tus calendarios (local, Google…). Si no hay ninguno, explica cómo crearlo.',
  preview: true,
});

window.customCards.push(
  { type: 'inventa-stat-card', name: 'Inventa · Indicador de resumen', description: 'Promedio, suma o activos/total de varias entidades, con barra.', preview: true },
  { type: 'inventa-weather-card', name: 'Inventa · Tiempo', description: 'Condición actual y pronóstico de los próximos días.', preview: true },
  { type: 'inventa-light-card', name: 'Inventa · Luz', description: 'Luz o interruptor: el ícono enciende/apaga; barra de brillo si la luz la admite.', preview: true },
  { type: 'inventa-climate-card', name: 'Inventa · Clima', description: 'Termostato con anillo, temperatura ambiente, +/– y estado entendible.', preview: true },
  { type: 'inventa-entity-card', name: 'Inventa · Entidad', description: 'Cualquier entidad: ícono, nombre y estado; botón si se puede encender/apagar.', preview: true },
  { type: 'inventa-sensor-card', name: 'Inventa · Sensor', description: 'Valor, unidad, tendencia y mini gráfico de las últimas horas.', preview: true },
  { type: 'inventa-binary-card', name: 'Inventa · Sensor binario', description: 'Puerta, movimiento, humo, agua… se resalta en ámbar o rojo al activarse.', preview: true },
  { type: 'inventa-action-card', name: 'Inventa · Escena / script', description: 'Acción rápida de un toque (escena, script o botón).', preview: true },
  { type: 'inventa-person-card', name: 'Inventa · Presencia', description: 'Avatar, en casa / fuera y desde cuándo.', preview: true },
  { type: 'inventa-camera-card', name: 'Inventa · Cámara', description: 'Imagen en vivo, movimiento y estado de conexión.', preview: true },
  { type: 'inventa-cover-card', name: 'Inventa · Persiana', description: 'Posición arrastrable y botones subir / detener / bajar.', preview: true },
  { type: 'inventa-fan-card', name: 'Inventa · Ventilador', description: 'Encendido, velocidad por pasos y oscilación.', preview: true },
  { type: 'inventa-lock-card', name: 'Inventa · Cerradura', description: 'Estado claro y confirmación antes de abrir.', preview: true },
  { type: 'inventa-alarm-card', name: 'Inventa · Alarma', description: 'Estado y modos (desarmar, en casa, ausente, noche…).', preview: true },
  { type: 'inventa-media-card', name: 'Inventa · Reproductor / TV', description: 'Carátula, controles, volumen y encendido.', preview: true },
  { type: 'inventa-vacuum-card', name: 'Inventa · Aspiradora', description: 'Estado, batería e iniciar / pausar / volver a la base.', preview: true },
  { type: 'inventa-irrigation-card', name: 'Inventa · Riego', description: 'Zona de riego (Hunter Hydrawise u otra válvula): próximo riego, tiempo restante, regar ahora y programa automático.', preview: true },
  { type: 'inventa-group-card', name: 'Inventa · Bloque', description: 'Título, chips de filtro por área y grilla de tarjetas (Climatización, Luces…).', preview: false },
);

console.info(`%c INVENTA-CARDS %c v${VERSION} `, 'color:#fff;background:#2563EB;font-weight:600;border-radius:3px 0 0 3px', 'color:#2563EB;background:#E3E8EF;border-radius:0 3px 3px 0');
