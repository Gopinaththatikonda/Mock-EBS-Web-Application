// Portal-wide toast notifications.
import { esc, icon } from './ui.js';

const ICONS = { success: 'check', error: 'alert', warning: 'alert', info: 'bell' };
const TITLES = { success: 'Success', error: 'Something went wrong', warning: 'Attention', info: 'Information' };
const MAX_TOASTS = 4;
const FLASH_KEY = 'apsrtc_flash';

function region() {
  let el = document.getElementById('toast-region');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-region';
    el.className = 'toast-region';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

function dismiss(el) {
  if (!el || el.classList.contains('leaving')) return;
  el.classList.add('leaving');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 400); // fallback when animations are disabled
}

export function toast(type, message, { title, duration = 5000 } = {}) {
  const kind = ICONS[type] ? type : 'info';
  const host = region();
  while (host.children.length >= MAX_TOASTS) host.firstElementChild.remove();

  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="toast-icon">${icon(ICONS[kind])}</span>
    <div class="toast-body">
      <div class="toast-title">${esc(title || TITLES[kind])}</div>
      <div class="toast-msg">${esc(message)}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss notification">${icon('close')}</button>
    <span class="toast-progress"></span>`;
  el.style.setProperty('--toast-duration', `${duration}ms`);
  host.appendChild(el);

  // Auto-dismiss, paused while hovered or focused.
  let remaining = duration;
  let started = Date.now();
  let timer = setTimeout(() => dismiss(el), remaining);
  const pause = () => { clearTimeout(timer); remaining -= Date.now() - started; el.classList.add('paused'); };
  const resume = () => { started = Date.now(); el.classList.remove('paused'); timer = setTimeout(() => dismiss(el), Math.max(remaining, 800)); };
  el.addEventListener('mouseenter', pause);
  el.addEventListener('mouseleave', resume);
  el.addEventListener('focusin', pause);
  el.addEventListener('focusout', resume);
  el.querySelector('.toast-close').addEventListener('click', () => { clearTimeout(timer); dismiss(el); });
  return el;
}

toast.success = (msg, opts) => toast('success', msg, opts);
toast.error = (msg, opts) => toast('error', msg, opts);
toast.warning = (msg, opts) => toast('warning', msg, opts);
toast.info = (msg, opts) => toast('info', msg, opts);

// One-time message carried across a page redirect (no sensitive data).
export function flash(type, message, opts = {}) {
  try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ type, message, ...opts })); } catch (e) { /* ignore */ }
}

export function showFlash() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const f = JSON.parse(raw);
    toast(f.type, f.message, { title: f.title });
  } catch (e) { /* ignore */ }
}
