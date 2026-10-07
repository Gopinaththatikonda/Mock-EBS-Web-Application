// Shared UI helpers. All dynamic values pass through esc() before entering HTML.

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true"><use href="/img/icons.svg#i-${name}"></use></svg>`;
}

export function fmtNumber(n) {
  return Number(n).toLocaleString('en-IN');
}

export function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const BADGE = {
  success: ['verified', 'active', 'on time', 'arrived', 'approved', 'success', 'completed', 'resolved', 'generated', 'operational', 'on duty'],
  warning: ['not detected', 'pending', 'delayed', 'in review', 'in progress', 'on leave', 'pending approval', 'attention', 'medium', 'training'],
  danger: ['rejected', 'failed', 'escalated', 'high', 'inactive', 'locked'],
  info: ['departed', 'scheduled', 'open', 'admin'],
};
export function badge(text) {
  const t = String(text || '').toLowerCase();
  const type = Object.keys(BADGE).find((k) => BADGE[k].includes(t)) || 'neutral';
  return `<span class="badge badge-${type}">${esc(text)}</span>`;
}

export function tag(kind) {
  if (kind === 'live') return `<span class="tag tag-live" title="Real data from the EBS PostgreSQL database">${icon('database')}Live · PostgreSQL</span>`;
  if (kind === 'gateway') return `<span class="tag tag-gateway" title="Identity forwarded by OAuth2 Proxy after Keycloak MFA">${icon('shield')}MFA Gateway</span>`;
  return '<span class="tag" title="Illustrative data for the POC, not live APSRTC records">Demo data</span>';
}

export function stateHtml(type, title, message = '') {
  if (type === 'loading') {
    return `<div class="state" role="status"><div class="spinner"></div><div>${esc(title || 'Loading…')}</div></div>`;
  }
  const ico = type === 'error' ? 'alert' : type === 'forbidden' ? 'lock' : 'file';
  return `<div class="state ${type === 'error' ? 'state-error' : ''}" role="${type === 'error' ? 'alert' : 'status'}">
    ${icon(ico)}<div class="state-title">${esc(title)}</div>${message ? `<div>${esc(message)}</div>` : ''}</div>`;
}

export function alertHtml(type, message) {
  const ico = { error: 'alert', success: 'check', info: 'shield', warning: 'alert' }[type] || 'alert';
  return `<div class="alert alert-${type}" role="${type === 'error' ? 'alert' : 'status'}">${icon(ico)}<div>${esc(message)}</div></div>`;
}

export function panel({ title, iconName, tagKind, body = '', tools = '', foot = '', id = '' }) {
  return `<section class="panel"${id ? ` id="${id}"` : ''}>
    <div class="panel-head">
      <h2 class="panel-title">${iconName ? icon(iconName) : ''}${esc(title)}</h2>
      <div class="toolbar">${tools}${tagKind ? tag(tagKind) : ''}</div>
    </div>
    ${body}
    ${foot ? `<div class="panel-foot">${foot}</div>` : ''}
  </section>`;
}

/*
 * Paginated, searchable table backed by an API call.
 * columns: [{ label, render(row) -> html, cls }]
 * fetchPage({ page, pageSize, q }) -> { items, page, pageSize, total }
 */
export function dataTable(host, { title, iconName, tagKind = 'demo', columns, fetchPage, pageSize = 8, searchable = false, emptyText = 'No records found.', errorText = 'Unable to load this information. Please try again.' }) {
  let page = 1;
  let q = '';
  let timer = null;

  const tools = searchable
    ? `<label class="search"><span class="sr-only">Search ${esc(title)}</span>${icon('search')}<input type="search" placeholder="Search…" maxlength="50"></label>`
    : '';
  host.innerHTML = panel({
    title, iconName, tagKind, tools,
    body: '<div class="table-wrap" data-body></div>',
    foot: '<div class="pager" data-pager></div>',
  });
  const body = host.querySelector('[data-body]');
  const pager = host.querySelector('[data-pager]');
  const foot = pager.parentElement;

  async function load() {
    body.innerHTML = stateHtml('loading', `Loading ${title.toLowerCase()}…`);
    foot.hidden = true;
    try {
      const data = await fetchPage({ page, pageSize, q });
      if (!data.items.length) {
        body.innerHTML = stateHtml('empty', q ? 'No matching records' : emptyText, q ? 'Try a different search term.' : '');
        return;
      }
      body.innerHTML = `<table class="table">
        <thead><tr>${columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${data.items.map((row) => `<tr>${columns.map((c) => `<td class="${c.cls || ''}">${c.render(row)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

      const pages = Math.max(Math.ceil(data.total / data.pageSize), 1);
      page = data.page;
      const from = (data.page - 1) * data.pageSize + 1;
      const to = Math.min(data.page * data.pageSize, data.total);
      pager.innerHTML = `<span>Showing ${from}-${to} of ${fmtNumber(data.total)}</span>
        <span class="pager-buttons">
          <button type="button" data-prev ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${icon('left')}</button>
          <span>Page ${page} of ${pages}</span>
          <button type="button" data-next ${page >= pages ? 'disabled' : ''} aria-label="Next page">${icon('right')}</button>
        </span>`;
      foot.hidden = false;
      pager.querySelector('[data-prev]').onclick = () => { page -= 1; load(); };
      pager.querySelector('[data-next]').onclick = () => { page += 1; load(); };
    } catch (err) {
      if (err.status === 401) return; // global handler redirects to sign-in
      const forbidden = err.status === 403;
      body.innerHTML = stateHtml(forbidden ? 'forbidden' : 'error', forbidden ? 'Access restricted' : errorText, err.message);
      if (!forbidden) {
        body.querySelector('.state').insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-outline btn-sm" data-retry>Try again</button>');
        body.querySelector('[data-retry]').onclick = load;
      }
    }
  }

  const input = host.querySelector('input[type="search"]');
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { q = input.value.trim(); page = 1; load(); }, 300);
    });
  }

  load();
  return { reload: load };
}
