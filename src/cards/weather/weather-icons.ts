// Íconos del tiempo dibujados en SVG, al estilo de los de Home Assistant
// (nube trasera oscura, nube delantera clara, sol, luna, gotas, copos, rayo),
// con las mismas animaciones que el Corporate Dashboard: el sol gira, las
// nubes se desplazan, la lluvia y la nieve caen y el rayo parpadea.
//
// Colores: variables --ic-wx-* del tema (cambian con el modo claro/oscuro).

import { svg, css, type SVGTemplateResult } from 'lit';

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function sun(cx: number, cy: number, r: number): SVGTemplateResult {
  return svg`<g class="sun" style="transform-origin:${cx}px ${cy}px">
    ${SUN_RAYS.map(
      (a) => svg`<rect x=${cx - 1.6} y=${cy - r - 7} width="3.2" height="5" rx="1.6" fill="var(--_wx-sun)" transform="rotate(${a} ${cx} ${cy})" />`,
    )}
    <circle cx=${cx} cy=${cy} r=${r} fill="var(--_wx-sun)" />
  </g>`;
}

const MOON = svg`<path class="moon" fill="var(--_wx-moon)" d="M36 12a20 20 0 1 0 17 30 16 16 0 0 1-17-30z" />`;

/** Nube: círculos + base redondeada del mismo color. */
function cloud(cls: string, x: number, y: number, s: number, fill: string): SVGTemplateResult {
  return svg`<g class=${cls} fill=${fill} transform="translate(${x} ${y}) scale(${s})">
    <circle cx="14" cy="20" r="9" />
    <circle cx="26" cy="14" r="12" />
    <circle cx="37" cy="21" r="8" />
    <rect x="5" y="20" width="40" height="11" rx="5.5" />
  </g>`;
}

const BACK = cloud('cloud-back', 4, 6, 0.9, 'var(--_wx-cloud2)');
const FRONT = cloud('cloud-front', 12, 16, 1, 'var(--_wx-cloud)');
const FRONT_LOW = cloud('cloud-front', 12, 22, 1, 'var(--_wx-cloud)');

function drops(n: number): SVGTemplateResult {
  const xs = n > 3 ? [20, 27, 34, 41, 48] : [24, 34, 44];
  return svg`${xs.map(
    (x, i) => svg`<rect class="rain" style="animation-delay:${(i * 0.37) % 1.3}s" x=${x} y="50" width="2.6" height="7" rx="1.3" fill="var(--_wx-rain)" transform="rotate(12 ${x} 53)" />`,
  )}`;
}

function flakes(color = 'var(--_wx-snow)', r = 2.4): SVGTemplateResult {
  return svg`${[24, 34, 44].map(
    (x, i) => svg`<circle class="snow" style="animation-delay:${i * 0.8}s" cx=${x} cy=${53 + (i % 2) * 3} r=${r} fill=${color} />`,
  )}`;
}

const BOLT = svg`<path class="bolt" fill="var(--_wx-sun)" d="M33 44h7l-4 7h6L30 63l3-9h-5z" />`;

const FOG = svg`<g class="fog" stroke="var(--_wx-cloud2)" stroke-width="3" stroke-linecap="round">
  <line x1="14" y1="52" x2="50" y2="52" /><line x1="20" y1="58" x2="44" y2="58" />
</g>`;

const WIND = svg`<g class="wind" fill="none" stroke="var(--_wx-cloud)" stroke-width="3.2" stroke-linecap="round">
  <path d="M8 26h30a6 6 0 1 0-6-6" /><path d="M8 36h40a6 6 0 1 1-6 6" /><path d="M8 46h22" />
</g>`;

/** SVG del estado (`sunny`, `rainy`…). */
export function weatherSvg(cond: string | undefined): SVGTemplateResult {
  let body: SVGTemplateResult;
  switch (cond) {
    case 'sunny':
      body = sun(32, 32, 12);
      break;
    case 'clear-night':
      body = MOON;
      break;
    case 'partlycloudy':
      body = svg`${sun(24, 22, 9)}${FRONT_LOW}`;
      break;
    case 'fog':
      body = svg`${BACK}${cloud('cloud-front', 12, 10, 1, 'var(--_wx-cloud)')}${FOG}`;
      break;
    case 'rainy':
      body = svg`${BACK}${FRONT}${drops(3)}`;
      break;
    case 'pouring':
      body = svg`${BACK}${FRONT}${drops(5)}`;
      break;
    case 'snowy':
      body = svg`${BACK}${FRONT}${flakes()}`;
      break;
    case 'snowy-rainy':
      body = svg`${BACK}${FRONT}${drops(3)}${flakes()}`;
      break;
    case 'hail':
      body = svg`${BACK}${FRONT}${flakes('var(--_wx-cloud)', 2.8)}`;
      break;
    case 'lightning':
      body = svg`${BACK}${FRONT}${BOLT}`;
      break;
    case 'lightning-rainy':
      body = svg`${BACK}${FRONT}${BOLT}${drops(3)}`;
      break;
    case 'windy':
      body = WIND;
      break;
    case 'windy-variant':
      body = svg`${BACK}${WIND}`;
      break;
    case 'exceptional':
      body = svg`${FRONT}<circle cx="50" cy="16" r="6" fill="var(--_heat)" />`;
      break;
    default: // cloudy y desconocidos
      body = svg`${BACK}${FRONT}`;
  }
  return svg`<svg class="wx-svg" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}

export const weatherIconStyles = css`
  :host {
    --_wx-sun: var(--ic-wx-sun, #fbbf24);
    --_wx-moon: var(--ic-wx-moon, #cbd5e1);
    --_wx-cloud: var(--ic-wx-cloud, #e2e8f0);
    --_wx-cloud2: var(--ic-wx-cloud2, #64748b);
    --_wx-rain: var(--ic-wx-rain, #60a5fa);
    --_wx-snow: var(--ic-wx-snow, #e0f2fe);
  }
  .wx-svg {
    display: block;
    overflow: visible;
  }
  .sun {
    animation: wx-spin 16s linear infinite;
  }
  .moon {
    animation: wx-float 4s ease-in-out infinite;
  }
  .cloud-back {
    animation: wx-drift 7s ease-in-out infinite;
  }
  .cloud-front {
    animation: wx-drift 5s ease-in-out infinite reverse;
  }
  .rain {
    animation: wx-rain 1.3s linear infinite;
  }
  .snow {
    animation: wx-snow 2.6s linear infinite;
  }
  .bolt {
    animation: wx-flash 3.5s infinite;
  }
  .wind,
  .fog {
    animation: wx-drift 4s ease-in-out infinite;
  }
  .cloud-back,
  .cloud-front,
  .wind,
  .fog,
  .rain,
  .snow,
  .moon {
    transform-box: fill-box;
  }
  @keyframes wx-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes wx-float {
    50% {
      transform: translateY(-1.5px);
    }
  }
  @keyframes wx-drift {
    50% {
      translate: 2px 0;
    }
  }
  @keyframes wx-rain {
    0% {
      translate: 0 -3px;
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      translate: -1px 5px;
      opacity: 0;
    }
  }
  @keyframes wx-snow {
    0% {
      translate: 0 -3px;
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      translate: 1.5px 4px;
      opacity: 0;
    }
  }
  @keyframes wx-flash {
    0%,
    88%,
    100% {
      opacity: 1;
    }
    91% {
      opacity: 0.35;
    }
    94% {
      opacity: 1;
    }
    96% {
      opacity: 0.45;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wx-svg * {
      animation: none !important;
    }
  }
`;
