// DANFO RUSH — everything the player sees, drawn on one canvas: the Lagos
// road and roadside, the danfo and the traffic, the HUD, and every screen
// (title, pause, day complete, game over). No images, no fonts over the
// network — every pixel is procedural.

import { BUS, DAY, ROAD, VIEW } from './config.js';
import { dayProgress, duskBlend } from './world.js';
import { bestScore, targetForDay } from './state.js';

const N = '₦';

// -- small helpers -------------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.font = `${weight || 700} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.45)';
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    rr(ctx, x + 2, y + 2, Math.max(6, (w - 4) * Math.min(1, frac)), h - 4, (h - 4) / 2);
    ctx.fill();
  }
}

// A canvas button: drawn, and registered for click handling.
function button(state, ctx, id, x, y, w, h, label, color) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 26, '#1c1408', 'center', 800);
  state.buttons.push({ id, x, y, w, h });
}

// -- the road ------------------------------------------------------------

function drawRoad(ctx, state) {
  const dusk = duskBlend(state);
  // Sky: warm day orange sliding into dusk purple as the sun sets.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, dusk > 0.5 ? '#3a2350' : '#ff9d5c');
  sky.addColorStop(1, dusk > 0.5 ? '#c65d3a' : '#ffd27a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Roadside ground.
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(0, 0, ROAD.left - 8, VIEW.height);
  ctx.fillRect(ROAD.right + 8, 0, VIEW.width - ROAD.right - 8, VIEW.height);

  // The tarmac.
  ctx.fillStyle = '#33373f';
  ctx.fillRect(ROAD.left, 0, ROAD.right - ROAD.left, VIEW.height);
  // Edge lines.
  ctx.fillStyle = '#ffd21f';
  ctx.fillRect(ROAD.left + 6, 0, 5, VIEW.height);
  ctx.fillRect(ROAD.right - 11, 0, 5, VIEW.height);
  // Dashed lane lines, scrolling with the road.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const dashH = 34;
  const gap = 46;
  const off = state.scroll % (dashH + gap);
  for (let lane = 1; lane < ROAD.lanes; lane++) {
    const x = ROAD.left + ROAD.laneWidth * lane;
    for (let y = -off - dashH; y < VIEW.height + dashH; y += dashH + gap) {
      ctx.fillRect(x - 3, y, 6, dashH);
    }
  }
  // Shoulder bays: fuel on the left, bus stops on the right.
  ctx.fillStyle = 'rgba(122,217,255,0.16)';
  ctx.fillRect(ROAD.left - 68, 0, 60, VIEW.height);
  ctx.fillStyle = 'rgba(255,228,94,0.14)';
  ctx.fillRect(ROAD.right + 8, 0, 60, VIEW.height);

  // The sun, sinking toward the horizon as the day runs out. It hangs over
  // the right roadside so it stays visible beside the road.
  const p = dayProgress(state);
  const sunX = 1150;
  const sunY = 120 + p * 360;
  const sunR = 40;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, 'rgba(255,240,170,0.85)');
  glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 110, sunY - 110, 220, 220);
  ctx.fillStyle = '#ffdf6b';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Dusk tint: the whole scene darkens toward purple as sunset nears.
  if (dusk > 0) {
    ctx.fillStyle = `rgba(43,27,61,${(dusk * 0.25).toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

// -- roadside scenery ----------------------------------------------------

function drawScenery(ctx, state) {
  for (const s of state.scenery) {
    if (s.kind === 'palm') {
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + 30);
      ctx.quadraticCurveTo(s.x + 6, s.y, s.x + 2, s.y - 34);
      ctx.stroke();
      ctx.strokeStyle = '#3f8f4f';
      ctx.lineWidth = 5;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x + 2, s.y - 34);
        ctx.quadraticCurveTo(
          s.x + 2 + Math.cos(a) * 22,
          s.y - 34 + Math.sin(a) * 22 - 8,
          s.x + 2 + Math.cos(a) * 36,
          s.y - 34 + Math.sin(a) * 36 + 10,
        );
        ctx.stroke();
      }
    } else if (s.kind === 'billboard') {
      ctx.fillStyle = '#5a4632';
      ctx.fillRect(s.x + 34, s.y - 6, 8, 44);
      ctx.fillStyle = '#1e2a4a';
      rr(ctx, s.x, s.y - 52, 84, 48, 4);
      ctx.fill();
      ctx.strokeStyle = '#ffd21f';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, s.text, s.x + 42, s.y - 28, 11, '#ffe45e', 'center', 800);
    } else if (s.kind === 'kiosk') {
      ctx.fillStyle = s.color;
      rr(ctx, s.x, s.y - 10, 64, 46, 4);
      ctx.fill();
      ctx.fillStyle = '#2b2118';
      rr(ctx, s.x + 6, s.y - 26, 52, 18, 3);
      ctx.fill();
      text(ctx, 'SHOP', s.x + 32, s.y + 14, 13, '#1c1408', 'center', 800);
    } else {
      // Market stall: striped awning, crates, fruit dots.
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y);
      ctx.lineTo(s.x + 6, s.y - 26);
      ctx.lineTo(s.x + 58, s.y - 26);
      ctx.lineTo(s.x + 70, s.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 4; i++) ctx.fillRect(s.x + 8 + i * 15, s.y - 24, 7, 22);
      ctx.fillStyle = '#8a6a44';
      ctx.fillRect(s.x + 4, s.y, 56, 26);
      ctx.fillStyle = '#ff6b5e';
      ctx.beginPath();
      ctx.arc(s.x + 16, s.y - 4, 5, 0, Math.PI * 2);
      ctx.arc(s.x + 34, s.y - 4, 5, 0, Math.PI * 2);
      ctx.arc(s.x + 50, s.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// -- vehicles ------------------------------------------------------------

function drawVehicleBody(ctx, x, y, w, h, color, kind) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, x - w / 2 + 4, y - h / 2 + 6, w, h, 10);
  ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, x - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,225,255,0.9)';
  rr(ctx, x - w / 2 + 6, y - h / 2 + 14, w - 12, 20, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,225,255,0.7)';
  rr(ctx, x - w / 2 + 6, y + h / 2 - 30, w - 12, 16, 5);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(x - w / 2 - 3, y - h / 2 + 12, 6, 18);
  ctx.fillRect(x + w / 2 - 3, y - h / 2 + 12, 6, 18);
  ctx.fillRect(x - w / 2 - 3, y + h / 2 - 30, 6, 18);
  ctx.fillRect(x + w / 2 - 3, y + h / 2 - 30, 6, 18);
  if (kind === 'truck') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - w / 2 + 8, y - 6, w - 16, h / 2 - 14);
  }
}

function drawOkada(ctx, v) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(v.x + 2, v.y + 4, 14, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = v.color;
  rr(ctx, v.x - 9, v.y - 26, 18, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(v.x, v.y - 30, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd21f';
  ctx.beginPath();
  ctx.arc(v.x, v.y - 30, 9, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.arc(v.x, v.y + 2, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawBus(ctx, state) {
  const bus = state.bus;
  const flash = bus.crashFlash > 0 && Math.floor(state.time * 14) % 2 === 0;
  const body = flash ? '#ff8a7a' : '#ffd21f';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, bus.x - BUS.width / 2 + 5, bus.y - BUS.height / 2 + 7, BUS.width, BUS.height, 12);
  ctx.fill();
  ctx.fillStyle = body;
  rr(ctx, bus.x - BUS.width / 2, bus.y - BUS.height / 2, BUS.width, BUS.height, 12);
  ctx.fill();
  // Black danfo stripes down the sides.
  ctx.fillStyle = '#1c1408';
  ctx.fillRect(bus.x - BUS.width / 2, bus.y - 18, 7, 44);
  ctx.fillRect(bus.x + BUS.width / 2 - 7, bus.y - 18, 7, 44);
  ctx.fillStyle = 'rgba(180,225,255,0.95)';
  rr(ctx, bus.x - BUS.width / 2 + 7, bus.y - BUS.height / 2 + 12, BUS.width - 14, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,225,255,0.75)';
  rr(ctx, bus.x - BUS.width / 2 + 7, bus.y + BUS.height / 2 - 34, BUS.width - 14, 18, 6);
  ctx.fill();
  // Side windows, one per row of seats.
  ctx.fillStyle = 'rgba(30,60,90,0.85)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(bus.x - BUS.width / 2 + 8, bus.y - 26 + i * 18, 10, 12);
    ctx.fillRect(bus.x + BUS.width / 2 - 18, bus.y - 26 + i * 18, 10, 12);
  }
  // Roof sign.
  ctx.fillStyle = '#1c1408';
  rr(ctx, bus.x - 22, bus.y - BUS.height / 2 - 8, 44, 14, 4);
  ctx.fill();
  text(ctx, 'DANFO', bus.x, bus.y - BUS.height / 2, 9, '#ffd21f', 'center', 800);
  ctx.fillStyle = '#222';
  ctx.fillRect(bus.x - BUS.width / 2 - 3, bus.y - BUS.height / 2 + 16, 6, 20);
  ctx.fillRect(bus.x + BUS.width / 2 - 3, bus.y - BUS.height / 2 + 16, 6, 20);
  ctx.fillRect(bus.x - BUS.width / 2 - 3, bus.y + BUS.height / 2 - 36, 6, 20);
  ctx.fillRect(bus.x + BUS.width / 2 - 3, bus.y + BUS.height / 2 - 36, 6, 20);
  // Passengers aboard, peeking through the windows.
  const shown = Math.min(bus.passengers.length, 6);
  for (let i = 0; i < shown; i++) {
    ctx.fillStyle = bus.passengers[i].color;
    ctx.beginPath();
    ctx.arc(bus.x - 14 + (i % 2) * 28, bus.y - 20 + Math.floor(i / 2) * 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Horn flash ring.
  if (bus.hornFlash > 0) {
    ctx.strokeStyle = `rgba(255,228,94,${bus.hornFlash * 2})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bus.x, bus.y - BUS.height / 2, 40 + (0.5 - bus.hornFlash) * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTraffic(ctx, state) {
  for (const v of state.traffic) {
    if (v.kind === 'okada') drawOkada(ctx, v);
    else drawVehicleBody(ctx, v.x, v.y, v.w, v.h, v.color, v.kind);
  }
  for (const p of state.potholes) {
    ctx.fillStyle = '#14161c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555a63';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawStops(ctx, state) {
  for (const stop of state.stops) {
    // The stop bay: a yellow box on the right shoulder.
    ctx.fillStyle = 'rgba(255,210,31,0.25)';
    rr(ctx, ROAD.right + 10, stop.y - 70, 78, 140, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // The sign post.
    ctx.fillStyle = '#1c1408';
    ctx.fillRect(stop.x + 26, stop.y - 92, 5, 40);
    ctx.fillStyle = '#ffd21f';
    rr(ctx, stop.x + 6, stop.y - 116, 46, 28, 4);
    ctx.fill();
    text(ctx, 'BUS', stop.x + 29, stop.y - 101, 14, '#1c1408', 'center', 800);
    // Waiting passengers in a single queue, each with their fare above
    // their head. One column keeps the fare labels from colliding.
    stop.waiting.forEach((w, i) => {
      const px = stop.x + 26;
      const py = stop.y - 48 + i * 28;
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1408';
      ctx.beginPath();
      ctx.arc(px, py - 3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, `${N}${w.fare}`, px, py - 19, 12, '#ffffff', 'center', 800);
    });
    // The hint only shows while the bus still needs to slow down; once it
    // is crawling at the stop, boarding is already happening.
    if (stop.waiting.length > 0 && state.bus.speed >= 25 && Math.abs(stop.y - state.bus.y) < 160 && state.bus.x > ROAD.right - 160) {
      text(ctx, 'SLOW DOWN TO PICK UP', ROAD.right - 130, stop.y - 96, 15, '#ffe45e', 'center', 800);
    }
  }
}

function drawStations(ctx, state) {
  for (const st of state.stations) {
    ctx.fillStyle = 'rgba(122,217,255,0.25)';
    rr(ctx, ROAD.left - 78, st.y - 70, 78, 140, 8);
    ctx.fill();
    ctx.strokeStyle = '#7ad9ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f3a5c';
    rr(ctx, st.x - 30, st.y - 40, 60, 80, 6);
    ctx.fill();
    ctx.fillStyle = '#7ad9ff';
    rr(ctx, st.x - 30, st.y - 40, 60, 18, 6);
    ctx.fill();
    text(ctx, 'FUEL', st.x, st.y - 30, 13, '#0f3a5c', 'center', 800);
    text(ctx, '⛽', st.x, st.y + 8, 30, '#ffffff', 'center');
    if (state.bus.speed >= 25 && Math.abs(st.y - state.bus.y) < 160 && state.bus.x < ROAD.left + 160) {
      text(ctx, 'SLOW DOWN TO REFUEL', ROAD.left + 130, st.y - 96, 15, '#7ad9ff', 'center', 800);
    }
  }
}

// Speed lines at high speed, and floating fare popups.
function drawEffects(ctx, state) {
  const bus = state.bus;
  if (bus.speed > 75 && state.screen === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    const rng = Math.sin(state.time * 40);
    for (let i = 0; i < 8; i++) {
      const x = ROAD.left + ((i * 173 + Math.floor(state.time * 900)) % (ROAD.right - ROAD.left));
      const y = (i * 211 + Math.floor(state.time * 1400)) % VIEW.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 26 + rng * 4);
      ctx.stroke();
    }
  }
  for (const p of state.popups) {
    const alpha = Math.min(1, p.life / 0.6);
    ctx.globalAlpha = alpha;
    text(ctx, p.text, p.x, p.y, 24, p.color, 'center', 800);
    ctx.globalAlpha = 1;
  }
}

// -- the HUD -------------------------------------------------------------

function clockText(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = 'rgba(20,14,8,0.82)';
  ctx.fillRect(0, 0, VIEW.width, 86);
  ctx.fillStyle = '#ffd21f';
  ctx.fillRect(0, 86, VIEW.width, 3);

  text(ctx, `DAY ${state.day}`, 18, 26, 22, '#ffd21f', 'left', 800);
  text(ctx, `SCORE ${state.score.toLocaleString()}`, 18, 58, 16, '#ffffff', 'left', 700);

  // Fare vs target, the big one.
  text(ctx, `FARE  ${N}${state.fare.toLocaleString()} / ${N}${state.target.toLocaleString()}`, 210, 26, 20, '#ffffff', 'left', 800);
  bar(ctx, 210, 42, 340, 18, state.fare / state.target, '#7ad97a', 'rgba(255,255,255,0.18)');
  if (state.combo > 1) {
    text(ctx, `COMBO x${state.combo}`, 210, 76, 16, '#ffe45e', 'left', 800);
  }

  // Sun clock: time to sunset.
  text(ctx, `☀ ${clockText(state.timeLeft)} TO SUNSET`, 640, 26, 18, '#ffdf6b', 'left', 800);
  bar(ctx, 640, 42, 180, 18, state.timeLeft / DAY.lengthSeconds, '#ff9d5c', 'rgba(255,255,255,0.18)');

  // Passengers, condition, fuel.
  text(ctx, `👥 ${state.bus.passengers.length}/${BUS.seats}`, 850, 26, 18, '#ffffff', 'left', 800);
  text(ctx, 'CONDITION', 850, 52, 12, '#bbbbbb', 'left', 700);
  bar(ctx, 940, 44, 110, 14, state.bus.condition / 100, state.bus.condition < 30 ? '#ff6b5e' : '#7ad97a');
  text(ctx, 'FUEL', 850, 74, 12, '#bbbbbb', 'left', 700);
  bar(ctx, 940, 66, 110, 14, state.bus.fuel / 100, state.bus.fuel < 25 ? '#ff6b5e' : '#7ad9ff');

  // Speed.
  text(ctx, `${Math.round(state.bus.speed)}`, 1100, 34, 34, '#ffffff', 'left', 800);
  text(ctx, 'km/h', 1170, 38, 14, '#bbbbbb', 'left', 700);
  text(ctx, state.muted ? '🔇 M' : '🔊 M', 1100, 68, 14, '#bbbbbb', 'left', 700);

  // WIN / LOSE line, always visible like the leaders do it.
  text(ctx, `WIN: ${N}${state.target.toLocaleString()} before sunset`, 210, 108, 15, '#7ad97a', 'left', 800);
  text(ctx, 'LOSE: wrecked • dry tank • sunset short', 640, 108, 15, '#ff9d9d', 'left', 800);

  // Controls footer.
  text(ctx, '← → steer • ↑ ↓ speed • SPACE horn • P pause • R restart', 18, VIEW.height - 16, 14, 'rgba(255,255,255,0.75)', 'left', 700);

  // Centre message (DAY 1, BUS FULL, …).
  if (state.message && state.time < state.message.until) {
    const alpha = Math.min(1, (state.message.until - state.time) / 0.5);
    ctx.globalAlpha = alpha;
    text(ctx, state.message.text, VIEW.width / 2, 240, 44, '#ffd21f', 'center', 800);
    if (state.message.sub) text(ctx, state.message.sub, VIEW.width / 2, 282, 20, '#ffffff', 'center', 700);
    ctx.globalAlpha = 1;
  }
}

// -- screens -------------------------------------------------------------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20,14,8,0.88)';
  rr(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffd21f';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTitle(ctx, state) {
  drawRoad(ctx, state);
  drawScenery(ctx, state);
  // A parked danfo showpiece below the START button.
  const demo = { bus: { x: 640, y: 650, passengers: [], crashFlash: 0, hornFlash: 0 }, time: state.time };
  drawBus(ctx, demo);
  ctx.fillStyle = 'rgba(20,10,5,0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  text(ctx, 'DANFO RUSH', VIEW.width / 2, 120, 84, '#ffd21f', 'center', 900);
  text(ctx, 'LAGOS • SUNSET SHIFT • ONE BUS', VIEW.width / 2, 176, 22, '#ffffff', 'center', 800);

  panel(ctx, 290, 210, 700, 200);
  text(ctx, 'HOW TO PLAY', 640, 240, 22, '#ffe45e', 'center', 800);
  text(ctx, 'Drive the yellow danfo. Pull up at BUS STOPS and slow down —', 640, 276, 18, '#ffffff', 'center', 700);
  text(ctx, 'passengers board and pay their fare in ₦. Chain pickups for a combo.', 640, 302, 18, '#ffffff', 'center', 700);
  text(ctx, 'Dodge traffic, okadas and potholes. Refuel at blue FUEL bays.', 640, 328, 18, '#ffffff', 'center', 700);
  text(ctx, `WIN: earn ₦${targetForDay(1).toLocaleString()} before sunset`, 632, 366, 17, '#7ad97a', 'right', 800);
  text(ctx, '•  LOSE: wrecked, dry, or short at sunset', 648, 366, 17, '#ff9d9d', 'left', 800);
  text(ctx, '← → steer   ↑ ↓ speed   SPACE horn   P pause   R restart', 640, 392, 16, '#bbbbbb', 'center', 700);

  button(state, ctx, 'start', 490, 440, 300, 62, '▶  START DAY 1', '#ffd21f');
  const best = bestScore();
  if (best > 0) text(ctx, `BEST SCORE: ${best.toLocaleString()}`, 640, 540, 18, '#ffe45e', 'center', 800);
  text(ctx, 'or press ENTER', 640, 576, 15, '#bbbbbb', 'center', 700);
}

function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(10,8,5,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 390, 230, 500, 220);
  text(ctx, 'PAUSED', 640, 280, 40, '#ffd21f', 'center', 800);
  text(ctx, 'The danfo waits. Lagos does not.', 640, 322, 18, '#ffffff', 'center', 700);
  button(state, ctx, 'resume', 465, 352, 350, 54, '▶  RESUME  (P)', '#ffd21f');
}

function statRow(ctx, label, value, y) {
  text(ctx, label, 480, y, 20, '#bbbbbb', 'left', 700);
  text(ctx, value, 800, y, 20, '#ffffff', 'right', 800);
}

function drawDayComplete(ctx, state) {
  ctx.fillStyle = 'rgba(10,8,5,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 330, 110, 620, 470);
  text(ctx, '🎉  DAY COMPLETE!', 640, 162, 42, '#7ad97a', 'center', 900);
  text(ctx, `You made the ₦${state.target.toLocaleString()} target before sunset.`, 640, 206, 19, '#ffffff', 'center', 700);
  statRow(ctx, 'Fare earned today', `${N}${state.fare.toLocaleString()}`, 258);
  statRow(ctx, 'Passengers carried', String(state.pickupsToday), 292);
  statRow(ctx, 'Crashes', String(state.crashesToday), 326);
  statRow(ctx, 'Distance driven', `${state.distanceKm.toFixed(1)} km`, 360);
  statRow(ctx, 'Total score', state.score.toLocaleString(), 394);
  text(ctx, `DAY ${state.day + 1}: target ₦${targetForDay(state.day + 1).toLocaleString()} — busier roads`, 640, 436, 18, '#ffe45e', 'center', 800);
  button(state, ctx, 'nextday', 390, 470, 220, 56, 'NEXT DAY ▶', '#7ad97a');
  button(state, ctx, 'restart', 630, 470, 220, 56, '↻ RESTART', '#ffd21f');
  text(ctx, 'or press ENTER for the next day', 640, 556, 15, '#bbbbbb', 'center', 700);
}

const LOSE_LINES = {
  wrecked: ['💥  BUS WRECKED', 'The danfo gave up. The conductor is already shouting.'],
  dry: ['⛽  TANK DRY', 'Out of fuel mid-shift. The passengers walked home.'],
  sunset: ['🌇  SUNSET — TARGET MISSED', 'The sun went down with the target still short.'],
};

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(10,8,5,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 330, 110, 620, 470);
  const lines = LOSE_LINES[state.endReason] || LOSE_LINES.sunset;
  text(ctx, lines[0], 640, 162, 38, '#ff6b5e', 'center', 900);
  text(ctx, lines[1], 640, 206, 19, '#ffffff', 'center', 700);
  statRow(ctx, 'Fare earned', `${N}${state.fare.toLocaleString()} of ${N}${state.target.toLocaleString()}`, 258);
  statRow(ctx, 'Passengers carried', String(state.pickupsToday), 292);
  statRow(ctx, 'Day reached', String(state.day), 326);
  statRow(ctx, 'Total score', state.score.toLocaleString(), 360);
  statRow(ctx, 'Best score', bestScore().toLocaleString(), 394);
  text(ctx, 'Tomorrow is another shift.', 640, 436, 18, '#ffe45e', 'center', 800);
  button(state, ctx, 'restart', 470, 470, 340, 56, '↻  TRY AGAIN  (R)', '#ffd21f');
  text(ctx, 'or press ENTER to restart', 640, 556, 15, '#bbbbbb', 'center', 700);
}

// -- the frame -----------------------------------------------------------

export function render(ctx, state) {
  state.buttons = [];
  ctx.save();
  if (state.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  if (state.screen === 'title') {
    drawTitle(ctx, state);
    ctx.restore();
    return;
  }
  drawRoad(ctx, state);
  drawScenery(ctx, state);
  drawStations(ctx, state);
  drawStops(ctx, state);
  drawTraffic(ctx, state);
  drawBus(ctx, state);
  drawEffects(ctx, state);
  drawHud(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx, state);
  if (state.screen === 'daycomplete') drawDayComplete(ctx, state);
  if (state.screen === 'gameover') drawGameOver(ctx, state);
  ctx.restore();
}
