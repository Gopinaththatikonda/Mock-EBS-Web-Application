import { esc } from './ui.js';

// MFA indicator in the header. Display only; it is NOT an authentication mechanism.
export function renderMfaBadge(el, gateway) {
  if (!el) return;
  const ok = gateway && gateway.authenticated;
  el.classList.toggle('off', !ok);
  el.querySelector('span').textContent = ok ? 'MFA Protected' : 'MFA gateway not detected';
  el.title = ok
    ? `MFA gateway session verified for ${gateway.email || gateway.username} (Keycloak + Google Authenticator)`
    : 'No identity was received from OAuth2 Proxy. In production this page is only reachable through the MFA gateway.';
}

export function wirePasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-toggle'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
}

export function setFieldErrors(form, errors = {}) {
  form.querySelectorAll('input[name]').forEach((input) => {
    const msg = errors[input.name] || '';
    const el = document.getElementById(`${input.name}-error`);
    if (el) el.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (el) input.setAttribute('aria-describedby', el.id);
  });
  const first = form.querySelector('[aria-invalid="true"]');
  if (first) first.focus();
}

export function showAlert(host, html) {
  host.innerHTML = html;
}

// Only allow redirects to local portal paths.
export function safeNext(value) {
  return typeof value === 'string' && /^\/[a-z-]+$/.test(value) ? value : '/dashboard';
}

export { esc };
