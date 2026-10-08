// Pre-login landing animations: live clock, ticker, bus network, counters, ripples, Caps Lock hint.
import { busScene } from './ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Live bus network: buses board at the central bus stand, travel to destinations in every
// direction, stop and arrive; some services run back into the stand. Decorative / demo only.
const STAND = [290, 100];
// [label, x, y, label anchor, label dy, service type, trip seconds, start offset]
const DESTINATIONS = [
  ['Hyderabad', 40, 96, 'start', -9, 'Garuda', 9, 0],
  ['Guntur', 150, 22, 'middle', -8, 'Express', 7, 2.4],
  ['Rajahmundry', 410, 20, 'middle', -8, 'Super Luxury', 8, 4.1],
  ['Visakhapatnam', 548, 40, 'end', -9, 'Garuda', 10, 1.2],
  ['Kakinada', 548, 132, 'end', -9, 'Express', 8.5, 5.6],
  ['Nellore', 420, 180, 'middle', 15, 'Super Luxury', 7.5, 3.2],
  ['Tirupati', 220, 182, 'middle', 15, 'Garuda', 9.5, 6.3],
  ['Kurnool', 64, 172, 'start', 15, 'Express', 8, 7.4],
];
// Return services: [destination index, trip seconds, start offset] (destination -> stand).
const RETURNS = [[0, 9.5, 4.6], [3, 10.5, 7], [6, 9, 2], [2, 8.5, 0.6]];

function curve([x0, y0], [x1, y1], bend = 0.18) {
  const cx = (x0 + x1) / 2 + (y1 - y0) * bend;
  const cy = (y0 + y1) / 2 - (x1 - x0) * bend;
  return [cx.toFixed(1), cy.toFixed(1)];
}

// Top-down bus (front faces +x) so it reads correctly in any direction of travel.
const BUS_ICON = `
  <rect x="-11" y="-5" width="22" height="10" rx="2.6" fill="#FFFFFF"/>
  <rect x="-9" y="-3.2" width="13.5" height="6.4" rx="1.2" fill="#8B0000"/>
  <rect x="-8" y="-1.2" width="11.5" height="2.4" fill="#F2C14E"/>
  <rect x="5.6" y="-4" width="3.8" height="8" rx="1" fill="#2B3A4A"/>
  <circle cx="10.4" cy="-3.3" r="0.9" fill="#FFE9A8"/><circle cx="10.4" cy="3.3" r="0.9" fill="#FFE9A8"/>`;

function busMover(pathId, dur, begin, cls) {
  const timing = `dur="${dur}s" begin="-${begin}s" repeatCount="indefinite"`;
  // Board at the stand (0-8%), travel with ease-in/out (8-80%), wait at destination, fade out.
  return `<g class="net-bus ${cls}" opacity="0" data-path="${pathId}" data-dur="${dur}">
    <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.04;0.8;0.93;1" ${timing}/>
    <g><animateMotion ${timing} rotate="auto" keyPoints="0;0;1;1" keyTimes="0;0.08;0.8;1"
        calcMode="spline" keySplines="0 0 1 1;0.45 0 0.55 1;0 0 1 1"><mpath href="#${pathId}"/></animateMotion>
      <g class="net-bus-shape">${BUS_ICON}</g></g>
  </g>`;
}

function arrivalPulse(x, y, dur, begin) {
  const timing = `dur="${dur}s" begin="-${begin}s" repeatCount="indefinite"`;
  return `<circle class="arrive" cx="${x}" cy="${y}" r="4" opacity="0">
    <animate attributeName="r" values="4;4;4;17;17" keyTimes="0;0.79;0.8;0.95;1" ${timing}/>
    <animate attributeName="opacity" values="0;0;0.95;0;0" keyTimes="0;0.79;0.8;0.95;1" ${timing}/>
  </circle>`;
}

export function routeMap() {
  const roads = [];
  const lines = [];
  const buses = [];
  const places = [];

  DESTINATIONS.forEach(([name, x, y, anchor, dy, , dur, begin], i) => {
    const [cx, cy] = curve(STAND, [x, y]);
    const out = `M${STAND[0]} ${STAND[1]} Q${cx} ${cy} ${x} ${y}`;
    roads.push(`<path id="out-${i}" d="${out}"/>`);
    roads.push(`<path id="in-${i}" class="road-back" d="M${x} ${y} Q${cx} ${cy} ${STAND[0]} ${STAND[1]}"/>`);
    lines.push(`<path d="${out}"/>`);
    places.push(`<g class="dest">
      ${reduceMotion ? '' : arrivalPulse(x, y, dur, begin)}
      <circle class="dest-ring" cx="${x}" cy="${y}" r="6.5"/><circle class="dest-dot" cx="${x}" cy="${y}" r="3.2"/>
      <text x="${x}" y="${y + dy}" text-anchor="${anchor}">${name}</text></g>`);
    if (!reduceMotion) buses.push(busMover(`out-${i}`, dur, begin, 'outbound'));
  });
  if (!reduceMotion) {
    RETURNS.forEach(([i, dur, begin]) => buses.push(busMover(`in-${i}`, dur, begin, 'inbound')));
  }

  const [sx, sy] = STAND;
  const stand = `<g class="stand">
    <circle class="stand-glow" cx="${sx}" cy="${sy}" r="16"/>
    <rect x="${sx - 22}" y="${sy - 11}" width="44" height="22" rx="3" class="stand-body"/>
    <path d="M${sx - 26} ${sy - 10} L${sx} ${sy - 22} L${sx + 26} ${sy - 10} Z" class="stand-roof"/>
    <rect x="${sx - 16}" y="${sy - 6}" width="8" height="6" rx="1" class="stand-win"/>
    <rect x="${sx - 4}" y="${sy - 6}" width="8" height="6" rx="1" class="stand-win"/>
    <rect x="${sx + 8}" y="${sy - 6}" width="8" height="6" rx="1" class="stand-win"/>
    <rect x="${sx - 5}" y="${sy + 2}" width="10" height="9" class="stand-door"/>
    <text x="${sx}" y="${sy + 25}" text-anchor="middle" class="stand-label">Central Bus Stand</text>
  </g>`;

  return `<svg class="route-map bus-network" viewBox="0 0 580 200" aria-hidden="true" focusable="false">
    <g class="roads">${roads.join('')}</g>
    <g class="road-lines">${lines.join('')}</g>
    <g class="places">${places.join('')}</g>
    <g class="buses">${buses.join('')}</g>
    ${stand}
  </svg>`;
}

// Live counters + status line driven by each bus trip (SMIL repeatEvent).
function wireNetwork() {
  const card = document.querySelector('.network-card');
  if (!card) return;
  const dep = card.querySelector('[data-departures]');
  const arr = card.querySelector('[data-arrivals]');
  const status = card.querySelector('[data-net-status]');
  let departures = 1248;
  let arrivals = 1191;
  const render = () => {
    if (dep) dep.textContent = departures.toLocaleString('en-IN');
    if (arr) arr.textContent = arrivals.toLocaleString('en-IN');
  };
  const bump = (el) => {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  };
  const say = (text) => {
    if (!status) return;
    status.classList.remove('show');
    void status.offsetWidth;
    status.textContent = text;
    status.classList.add('show');
  };
  render();

  card.querySelectorAll('.net-bus').forEach((bus) => {
    const motion = bus.querySelector('animateMotion');
    const [dir, idx] = bus.dataset.path.split('-');
    const [name, , , , , type] = DESTINATIONS[Number(idx)];
    const tripMs = Number(bus.dataset.dur) * 1000 * 0.8;
    motion.addEventListener('repeatEvent', () => {
      departures += 1;
      bump(dep);
      render();
      say(dir === 'out'
        ? `Departed: Central Bus Stand → ${name} · ${type}`
        : `Departed: ${name} → Central Bus Stand · ${type}`);
      setTimeout(() => {
        arrivals += 1;
        bump(arr);
        render();
        say(dir === 'out'
          ? `Arrived: ${type} service reached ${name}`
          : `Arrived: ${name} service reached Central Bus Stand`);
      }, tripMs);
    });
  });
}

function startClock(el) {
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
  const out = el.querySelector('[data-time]');
  const tick = () => { out.textContent = `${fmt.format(new Date())} IST`; };
  tick();
  setInterval(tick, 1000);
}

function animateCount(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const show = (n) => { el.textContent = `${Math.round(n).toLocaleString('en-IN')}${suffix}`; };
  if (reduceMotion) return show(target);
  const duration = 1800;
  const start = performance.now() + 600;
  const step = (now) => {
    const t = Math.min(Math.max((now - start) / duration, 0), 1);
    show(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  show(0);
  requestAnimationFrame(step);
}

function wireRipples(root) {
  root.querySelectorAll('.btn-shine').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      if (reduceMotion) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.setProperty('width', `${size}px`);
      span.style.setProperty('height', `${size}px`);
      span.style.setProperty('left', `${e.clientX - r.left - size / 2}px`);
      span.style.setProperty('top', `${e.clientY - r.top - size / 2}px`);
      btn.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  });
}

function wireCapsLock(root) {
  root.querySelectorAll('input[type="password"]').forEach((input) => {
    const hint = document.createElement('div');
    hint.className = 'caps-hint';
    hint.hidden = true;
    hint.setAttribute('role', 'status');
    hint.innerHTML = '<svg class="icon" aria-hidden="true"><use href="/img/icons.svg#i-alert"></use></svg>Caps Lock is on';
    (input.closest('.input-group') || input).after(hint);
    const check = (e) => { if (e.getModifierState) hint.hidden = !e.getModifierState('CapsLock'); };
    input.addEventListener('keydown', check);
    input.addEventListener('keyup', check);
    input.addEventListener('blur', () => { hint.hidden = true; });
  });
}

export function initLanding() {
  document.querySelectorAll('[data-bus-scene]').forEach((el) => { el.outerHTML = busScene('dark'); });
  document.querySelectorAll('[data-route-map]').forEach((el) => { el.outerHTML = routeMap(); });
  if (!reduceMotion) wireNetwork();

  const clock = document.getElementById('live-clock');
  if (clock) startClock(clock);

  // Duplicate ticker items once for a seamless loop.
  document.querySelectorAll('.ticker-content').forEach((t) => { t.innerHTML += t.innerHTML; });

  document.querySelectorAll('[data-count]').forEach(animateCount);
  wireRipples(document);
  wireCapsLock(document);
}

// Button states for async submits.
export function buttonLoading(btn, text) {
  btn.disabled = true;
  btn.dataset.label = btn.dataset.label || btn.textContent.trim();
  btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${text}`;
}
export function buttonReset(btn) {
  btn.disabled = false;
  btn.classList.remove('is-success');
  btn.textContent = btn.dataset.label || 'Submit';
}
export function buttonSuccess(btn, text) {
  btn.classList.add('is-success');
  btn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="/img/icons.svg#i-check"></use></svg>${text}`;
}

export function shake(el) {
  if (reduceMotion || !el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart animation
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}
