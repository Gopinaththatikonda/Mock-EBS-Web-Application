// Pre-login landing animations: live clock, ticker, route map, counters, ripples, Caps Lock hint.
import { busScene } from './ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Stylised Andhra Pradesh route network (not to scale).
// [x, y, label, anchor]
const CITIES = {
  hyd: [48, 48, 'Hyderabad', 'start'], knl: [118, 112, 'Kurnool', 'start'], atp: [102, 168, 'Anantapur', 'start'],
  tpt: [232, 176, 'Tirupati', 'start'], nlr: [308, 146, 'Nellore', 'start'], gnt: [338, 104, 'Guntur', 'end'],
  vja: [372, 80, 'Vijayawada', 'start'], rjy: [452, 58, 'Rajahmundry', 'end'], vsp: [512, 36, 'Visakhapatnam', 'end'],
  skl: [552, 16, 'Srikakulam', 'end'],
};
const ROUTES = [
  ['vja', 'rjy', 'vsp'], ['vsp', 'skl'], ['vja', 'gnt', 'nlr', 'tpt'], ['vja', 'hyd'],
  ['knl', 'hyd'], ['knl', 'atp', 'tpt'], ['gnt', 'knl'],
];
const MOVERS = [[0, '7s'], [2, '9s'], [3, '8s'], [5, '10s'], [6, '6.5s']];

function routePath(stops) {
  const pts = stops.map((c) => CITIES[c]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2 + (y1 - y0) * 0.15;
    const cy = (y0 + y1) / 2 - (x1 - x0) * 0.15;
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`;
  }
  return d;
}

export function routeMap() {
  const paths = ROUTES.map((r, i) => `<path id="rt-${i}" d="${routePath(r)}"/>`).join('');
  const cities = Object.values(CITIES).map(([x, y, name, anchor]) => `
    <g class="city" transform="translate(${x} ${y})"><circle class="pulse" r="3.5"/><circle class="dot" r="3"/>
    ${name ? `<text x="${anchor === 'end' ? -7 : 7}" y="-6" text-anchor="${anchor}">${name}</text>` : ''}</g>`).join('');
  const movers = reduceMotion ? '' : MOVERS.map(([i, dur]) => `
    <circle class="mover" r="2.8"><animateMotion dur="${dur}" repeatCount="indefinite"><mpath href="#rt-${i}"/></animateMotion></circle>`).join('');
  return `<svg class="route-map" viewBox="0 0 580 196" aria-hidden="true" focusable="false">
    <g class="routes">${paths}</g><g class="cities">${cities}</g><g>${movers}</g></svg>`;
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
