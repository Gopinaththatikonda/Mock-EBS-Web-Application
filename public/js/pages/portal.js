import { authService } from '../services/authService.js';
import { userService, demoService } from '../services/userService.js';
import { onUnauthorized } from '../services/apiClient.js';
import {
  esc, icon, badge, tag, panel, dataTable, stateHtml, alertHtml, fmtNumber, fmtDateTime, fmtDate,
} from '../ui.js';
import { renderMfaBadge } from '../common.js';

const root = document.getElementById('page-root');
const route = window.location.pathname.replace(/\/+$/, '') || '/home';

const state = { user: null, gateway: null };

// ---------- Session handling ----------
let redirecting = false;
onUnauthorized((err) => {
  if (redirecting) return;
  redirecting = true;
  if (err.code === 'GATEWAY_SESSION_ENDED') {
    window.location.reload(); // OAuth2 Proxy will send the browser through Keycloak MFA again
    return;
  }
  const reason = err.code === 'SESSION_INVALIDATED' ? 'invalid' : 'expired';
  window.location.replace(`/?reason=${reason}&next=${encodeURIComponent(route)}`);
});

document.getElementById('logout-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    await authService.logout();
  } catch (err) { /* session may already be gone; continue to sign-in */ }
  window.location.replace('/?reason=loggedout');
});

// ---------- Navigation ----------
const nav = document.getElementById('main-nav');
const navToggle = document.getElementById('nav-toggle');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav-list a').forEach((a) => {
  if (a.dataset.route === route) {
    a.classList.add('active');
    a.setAttribute('aria-current', 'page');
  }
});

// ---------- Shared fragments ----------
function pageHead(title, sub, crumb, extra = '') {
  return `<div class="page-head">
    <div>
      <div class="breadcrumb">EBS Portal / ${esc(crumb || title)}</div>
      <h1 class="page-title">${esc(title)}</h1>
      ${sub ? `<div class="page-sub">${esc(sub)}</div>` : ''}
    </div>${extra}
  </div>`;
}

const QUICK = [
  ['users', 'Employee Management', 'Manage employee information and records.', '/employees'],
  ['building', 'Depot Operations', 'Monitor depot-level operations.', '/operations'],
  ['bus', 'Service Management', 'View and manage services.', '/services'],
  ['chart', 'Reports & Analytics', 'Access operational reports and analytics.', '/reports'],
  ['sliders', 'Administration', 'Manage application configuration.', '/administration'],
  ['message', 'Grievances', 'View and manage employee/customer grievances.', '/grievance'],
];
function quickAccess() {
  return `<div class="section">
    <h2 class="section-title">Quick Access</h2>
    <div class="grid grid-3">${QUICK.map(([ic, t, d, href]) => `
      <a class="panel quick" href="${href}">
        <span class="quick-icon">${icon(ic, 'icon-lg')}</span>
        <span><span class="quick-title">${esc(t)}</span><br><span class="quick-desc">${esc(d)}</span></span>
      </a>`).join('')}
    </div></div>`;
}

function sessionChips() {
  const g = state.gateway;
  return `<div class="chips">
    <span class="chip ${g && g.authenticated ? 'ok' : 'warn'}">${icon('shield')}MFA Gateway: ${g && g.authenticated ? 'Verified' : 'Not detected'}</span>
    <span class="chip ok">${icon('key')}EBS Session: Active</span>
    <span class="chip">${icon('user')}Role: ${esc(state.user.role === 'admin' ? 'Administrator' : 'User')}</span>
  </div>`;
}

function securityLayers() {
  const g = state.gateway || {};
  const u = state.user;
  const groups = g.groups && g.groups.length ? g.groups.join(', ') : 'Not forwarded';
  return `<div class="section">
    <h2 class="section-title">Security Layers</h2>
    <div class="grid grid-3">
      <div class="panel layer">
        <div class="layer-head"><span class="layer-icon">${icon('shield')}</span>
          <span><span class="layer-num">Layer 1</span><br><span class="layer-title">MFA Gateway</span></span></div>
        <dl class="dl">
          <dt>Status</dt><dd>${g.authenticated ? badge('Verified') : badge('Not detected')}</dd>
          <dt>Identity</dt><dd>${esc(g.email || g.username || '-')}</dd>
          <dt>Managed by</dt><dd>Keycloak + OAuth2 Proxy</dd>
          <dt>Factors</dt><dd>Password + Google Authenticator</dd>
        </dl>
      </div>
      <div class="panel layer">
        <div class="layer-head"><span class="layer-icon">${icon('key')}</span>
          <span><span class="layer-num">Layer 2</span><br><span class="layer-title">EBS Application Session</span></span></div>
        <dl class="dl">
          <dt>Status</dt><dd>${badge('Active')}</dd>
          <dt>EBS user</dt><dd>${esc(u.username)} (${esc(u.employeeId)})</dd>
          <dt>Verified by</dt><dd>EBS API + PostgreSQL</dd>
          <dt>Last sign-in</dt><dd>${esc(fmtDateTime(u.lastLogin))}</dd>
        </dl>
      </div>
      <div class="panel layer">
        <div class="layer-head"><span class="layer-icon">${icon('lock')}</span>
          <span><span class="layer-num">Layer 3</span><br><span class="layer-title">Authorisation</span></span></div>
        <dl class="dl">
          <dt>EBS role</dt><dd>${badge(u.role === 'admin' ? 'Admin' : 'User')}</dd>
          <dt>Gateway groups</dt><dd>${esc(groups)}</dd>
          <dt>Required group</dt><dd>EBS_ACCESS (enforced at gateway)</dd>
        </dl>
      </div>
    </div></div>`;
}

function mount(html) {
  root.innerHTML = html;
}
function host(id) {
  return root.querySelector(`#${id}`);
}

// ---------- Column definitions ----------
const COLS = {
  serviceOperations: [
    { label: 'Service No', render: (r) => `<span class="mono">${esc(r.serviceNo)}</span>` },
    { label: 'Route', render: (r) => esc(r.route) },
    { label: 'Depot', render: (r) => esc(r.depot) },
    { label: 'Bus Type', render: (r) => esc(r.busType) },
    { label: 'Status', render: (r) => badge(r.status) },
    { label: 'Departure', render: (r) => esc(r.departure) },
    { label: 'Arrival', render: (r) => esc(r.arrival) },
  ],
  employees: [
    { label: 'Employee ID', render: (r) => `<span class="mono">${esc(r.employeeId)}</span>` },
    { label: 'Employee Name', render: (r) => esc(r.name) },
    { label: 'Department', render: (r) => esc(r.department) },
    { label: 'Role', render: (r) => esc(r.role) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  employeesFull: [
    { label: 'Employee ID', render: (r) => `<span class="mono">${esc(r.employeeId)}</span>` },
    { label: 'Employee Name', render: (r) => esc(r.name) },
    { label: 'Department', render: (r) => esc(r.department) },
    { label: 'Role', render: (r) => esc(r.role) },
    { label: 'Depot', render: (r) => esc(r.depot) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  requests: [
    { label: 'Request ID', render: (r) => `<span class="mono">${esc(r.requestId)}</span>` },
    { label: 'Type', render: (r) => esc(r.type) },
    { label: 'Submitted By', render: (r) => esc(r.submittedBy) },
    { label: 'Date', render: (r) => esc(fmtDate(r.date)) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  activity: [
    { label: 'Activity', render: (r) => esc(r.activity), cls: 'wrap-cell' },
    { label: 'User', render: (r) => esc(r.user) },
    { label: 'Module', render: (r) => esc(r.module) },
    { label: 'Date & Time', render: (r) => esc(fmtDateTime(r.dateTime)) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  depots: [
    { label: 'Depot', render: (r) => `<strong>${esc(r.depot)}</strong>` },
    { label: 'Region', render: (r) => esc(r.region) },
    { label: 'Buses', render: (r) => fmtNumber(r.buses) },
    { label: 'Schedules Today', render: (r) => fmtNumber(r.schedulesToday) },
    { label: 'On-time %', render: (r) => `${esc(r.onTimePercent)}%` },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  services: [
    { label: 'Service Category', render: (r) => `<strong>${esc(r.busType)}</strong>` },
    { label: 'Active Services', render: (r) => fmtNumber(r.activeServices) },
    { label: 'Avg. Occupancy', render: (r) => `${esc(r.avgOccupancyPercent)}%` },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  reports: [
    { label: 'Report', render: (r) => `<strong>${esc(r.report)}</strong>` },
    { label: 'Module', render: (r) => esc(r.module) },
    { label: 'Frequency', render: (r) => esc(r.frequency) },
    { label: 'Last Generated', render: (r) => esc(fmtDateTime(r.lastGenerated)) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  grievances: [
    { label: 'Grievance ID', render: (r) => `<span class="mono">${esc(r.grievanceId)}</span>` },
    { label: 'Category', render: (r) => esc(r.category) },
    { label: 'Raised By', render: (r) => esc(r.raisedBy) },
    { label: 'Depot', render: (r) => esc(r.depot) },
    { label: 'Date', render: (r) => esc(fmtDate(r.date)) },
    { label: 'Priority', render: (r) => badge(r.priority) },
    { label: 'Status', render: (r) => badge(r.status) },
  ],
  ebsUsers: [
    { label: 'Employee ID', render: (r) => `<span class="mono">${esc(r.employeeId)}</span>` },
    { label: 'Full Name', render: (r) => esc(r.fullName) },
    { label: 'Username', render: (r) => esc(r.username) },
    { label: 'Email', render: (r) => esc(r.email) },
    { label: 'Mobile', render: (r) => esc(r.mobile) },
    { label: 'Role', render: (r) => badge(r.role === 'admin' ? 'Admin' : 'User') },
    { label: 'Status', render: (r) => badge(r.status.charAt(0).toUpperCase() + r.status.slice(1)) },
    { label: 'Registered', render: (r) => esc(fmtDateTime(r.createdAt)) },
    { label: 'Last Login', render: (r) => esc(fmtDateTime(r.lastLogin)) },
  ],
};

function table(id, title, iconName, dataset, cols, opts = {}) {
  return dataTable(host(id), {
    title,
    iconName,
    columns: cols,
    fetchPage: (p) => demoService.list(dataset, p),
    ...opts,
  });
}

// ---------- Pages ----------
const PAGES = {
  '/home': {
    title: 'Home',
    render() {
      const u = state.user;
      mount(`
        <div class="section panel welcome">
          <div><h1>Welcome, ${esc(u.fullName)}</h1>
          <p>APSRTC EBS Portal &middot; Enterprise Business Suite</p></div>
          ${sessionChips()}
        </div>
        ${securityLayers()}
        <div class="grid grid-2 section">
          <div id="notices"></div>
          ${panel({
            title: 'Your EBS Account', iconName: 'user', tagKind: 'live',
            body: `<div class="panel-body"><dl class="dl">
              <dt>Full name</dt><dd>${esc(u.fullName)}</dd>
              <dt>Employee ID</dt><dd>${esc(u.employeeId)}</dd>
              <dt>Username</dt><dd>${esc(u.username)}</dd>
              <dt>Email</dt><dd>${esc(u.email)}</dd>
              <dt>Member since</dt><dd>${esc(fmtDate(u.createdAt))}</dd>
            </dl></div>`,
          })}
        </div>`);

      const n = host('notices');
      n.innerHTML = panel({ title: 'Notices & Circulars', iconName: 'bell', tagKind: 'demo', body: `<div class="panel-body">${stateHtml('loading', 'Loading notices…')}</div>` });
      demoService.summary()
        .then((d) => {
          n.querySelector('.panel-body').innerHTML = d.notices.length
            ? d.notices.map((x) => `<div class="notice"><div class="notice-title">${esc(x.title)}</div>
                <div>${esc(x.body)}</div><div class="notice-date">${esc(fmtDate(x.date))}</div></div>`).join('')
            : stateHtml('empty', 'No notices at the moment.');
        })
        .catch((err) => {
          if (err.status !== 401) n.querySelector('.panel-body').innerHTML = stateHtml('error', 'Unable to load notices. Please try again.', err.message);
        });
    },
  },

  '/dashboard': {
    title: 'Dashboard',
    render() {
      mount(`
        <div class="section panel welcome">
          <div><h1>Welcome to APSRTC EBS Portal</h1><p>Enterprise Business Suite</p></div>
          ${sessionChips()}
        </div>
        <div class="section">
          <h2 class="section-title">Summary ${tag('demo')}</h2>
          <div class="grid grid-kpi" id="kpis">${stateHtml('loading', 'Loading summary…')}</div>
        </div>
        ${quickAccess()}
        <div class="section" id="t-ops"></div>
        <div class="grid grid-2 section">
          <div id="t-emp"></div>
          <div id="t-req"></div>
        </div>
        <div class="section" id="t-act"></div>`);

      const kpis = host('kpis');
      const KPI_ICONS = { employees: 'users', services: 'bus', operations: 'activity', depots: 'building', reports: 'file' };
      demoService.summary()
        .then(({ summary }) => {
          kpis.innerHTML = Object.entries(summary).map(([k, s]) => `
            <div class="panel kpi">
              <span class="kpi-icon">${icon(KPI_ICONS[k] || 'chart')}</span>
              <div><div class="kpi-label">${esc(s.label)}</div>
              <div class="kpi-value">${fmtNumber(s.value)}</div>
              <div class="kpi-note">${esc(s.note)}</div></div>
            </div>`).join('');
        })
        .catch((err) => {
          if (err.status !== 401) kpis.innerHTML = `<div class="panel">${stateHtml('error', 'Unable to load summary information. Please try again.', err.message)}</div>`;
        });

      table('t-ops', 'Service Operations', 'bus', 'serviceOperations', COLS.serviceOperations, { pageSize: 6, searchable: true });
      table('t-emp', 'Employee Activity', 'users', 'employees', COLS.employees, { pageSize: 6 });
      table('t-req', 'Recent Requests', 'file', 'requests', COLS.requests, { pageSize: 6 });
      table('t-act', 'Recent Activity', 'clock', 'activity', COLS.activity, { pageSize: 6 });
    },
  },

  '/services': {
    title: 'Services',
    render() {
      mount(`${pageHead('Service Management', 'Service categories and scheduled operations', 'Services')}
        <div class="section" id="t-cat"></div>
        <div class="section" id="t-ops"></div>`);
      table('t-cat', 'Service Categories', 'bus', 'services', COLS.services, { pageSize: 10 });
      table('t-ops', 'Scheduled Services', 'clock', 'serviceOperations', COLS.serviceOperations, { pageSize: 10, searchable: true });
    },
  },

  '/operations': {
    title: 'Operations',
    render() {
      mount(`${pageHead('Depot Operations', 'Depot-level operational status for today', 'Operations')}
        <div class="section" id="t-dep"></div>
        <div class="section" id="t-ops"></div>`);
      table('t-dep', 'Depot Status', 'building', 'depots', COLS.depots, { pageSize: 10 });
      table('t-ops', "Today's Service Operations", 'activity', 'serviceOperations', COLS.serviceOperations, { pageSize: 8, searchable: true });
    },
  },

  '/employees': {
    title: 'Employees',
    render() {
      mount(`${pageHead('Employee Management', 'Employee records across depots', 'Employees')}
        <div class="section" id="t-emp"></div>`);
      table('t-emp', 'Employees', 'users', 'employees', COLS.employeesFull, {
        pageSize: 10, searchable: true, errorText: 'Unable to load employee information. Please try again.',
      });
    },
  },

  '/reports': {
    title: 'Reports',
    render() {
      mount(`${pageHead('Reports & Analytics', 'Operational, financial and HR reports', 'Reports')}
        <div class="section" id="t-rep"></div>
        <div class="section" id="t-req"></div>`);
      table('t-rep', 'Reports', 'chart', 'reports', COLS.reports, { pageSize: 10, searchable: true });
      table('t-req', 'Recent Requests', 'file', 'requests', COLS.requests, { pageSize: 8, searchable: true });
    },
  },

  '/track-service': {
    title: 'Track Service',
    render() {
      mount(`${pageHead('Track Service', 'Check the live status of a scheduled service', 'Track Service')}
        <div class="section">${panel({
          title: 'Find a Service', iconName: 'pin', tagKind: 'demo',
          body: `<div class="panel-body">
            <form class="track-form" id="track-form" novalidate>
              <label class="sr-only" for="service-no">Service number</label>
              <input id="service-no" name="serviceNo" type="text" placeholder="Enter service number, e.g. VJA-2041" maxlength="20" required>
              <button type="submit" class="btn btn-primary">${icon('search')}Track</button>
            </form>
            <div class="sample-list" id="samples">Sample services:</div>
          </div>`,
        })}</div>
        <div class="section" id="track-result"></div>`);

      const form = host('track-form');
      const result = host('track-result');
      const input = form.serviceNo;

      async function track(no) {
        if (!no) {
          result.innerHTML = alertHtml('warning', 'Please enter a service number.');
          return;
        }
        result.innerHTML = `<div class="panel">${stateHtml('loading', 'Locating service…')}</div>`;
        try {
          const { service: s, stops } = await demoService.track(no);
          result.innerHTML = panel({
            title: `Service ${s.serviceNo}`, iconName: 'bus', tagKind: 'demo',
            tools: badge(s.status),
            body: `<div class="panel-body">
              <dl class="dl section"><dt>Route</dt><dd>${esc(s.route)}</dd><dt>Depot</dt><dd>${esc(s.depot)}</dd><dt>Bus type</dt><dd>${esc(s.busType)}</dd></dl>
              <ol class="timeline">${stops.map((st) => `<li class="${st.done ? 'done' : ''}"><span class="dot"></span>
                <div class="stop">${esc(st.stop)}</div><div class="meta">${esc(st.label)} &middot; ${esc(st.time)}</div></li>`).join('')}</ol>
            </div>`,
          });
        } catch (err) {
          if (err.status === 401) return;
          result.innerHTML = `<div class="panel">${stateHtml(err.status === 404 ? 'empty' : 'error', err.status === 404 ? 'Service not found' : 'Unable to track this service. Please try again.', err.message)}</div>`;
        }
      }

      form.addEventListener('submit', (e) => { e.preventDefault(); track(input.value.trim()); });

      demoService.list('serviceOperations', { pageSize: 5 })
        .then((d) => {
          host('samples').insertAdjacentHTML('beforeend', d.items.map((s) =>
            `<button type="button" class="link-btn" data-no="${esc(s.serviceNo)}">${esc(s.serviceNo)}</button>`).join(''));
          host('samples').querySelectorAll('[data-no]').forEach((b) => {
            b.addEventListener('click', () => { input.value = b.dataset.no; track(b.dataset.no); });
          });
        })
        .catch(() => host('samples').remove());
    },
  },

  '/grievance': {
    title: 'Grievance',
    render() {
      mount(`${pageHead('Grievance Management', 'Passenger and employee grievances', 'Grievance')}
        <div class="section" id="t-grv"></div>`);
      table('t-grv', 'Grievances', 'message', 'grievances', COLS.grievances, { pageSize: 10, searchable: true });
    },
  },

  '/administration': {
    title: 'Administration',
    render() {
      mount(`${pageHead('Administration', 'EBS application users and access configuration', 'Administration')}
        <div class="section" id="t-users"></div>
        <div class="section">${panel({
          title: 'Access Control Model', iconName: 'lock',
          body: `<div class="panel-body"><dl class="dl">
            <dt>Gateway authentication</dt><dd>Keycloak username/password + Google Authenticator TOTP (via OAuth2 Proxy)</dd>
            <dt>Gateway authorisation</dt><dd>Keycloak group EBS_ACCESS (OAuth2 Proxy --allowed-group)</dd>
            <dt>EBS authentication</dt><dd>EBS username/Employee ID + password, verified by the EBS API against PostgreSQL (bcrypt)</dd>
            <dt>EBS authorisation</dt><dd>Role-based (user / admin), enforced by the EBS API</dd>
          </dl></div>`,
        })}</div>`);

      dataTable(host('t-users'), {
        title: 'Registered EBS Users',
        iconName: 'database',
        tagKind: 'live',
        columns: COLS.ebsUsers,
        pageSize: 10,
        searchable: true,
        emptyText: 'No EBS users have registered yet.',
        errorText: 'Unable to load EBS users. Please try again.',
        fetchPage: (p) => userService.listUsers(p),
      });
    },
  },

  '/profile': {
    title: 'My Profile',
    render() {
      mount(`${pageHead('My Profile', 'Your EBS account and security session details', 'Profile')}
        <div id="profile">${stateHtml('loading', 'Loading profile…')}</div>`);
      userService.getProfile()
        .then(({ user: u, gateway: g, session: s }) => {
          host('profile').innerHTML = `<div class="grid grid-2 section">
            ${panel({
              title: 'EBS Account', iconName: 'user', tagKind: 'live',
              body: `<div class="panel-body"><dl class="dl">
                <dt>Full name</dt><dd>${esc(u.fullName)}</dd>
                <dt>Employee ID</dt><dd>${esc(u.employeeId)}</dd>
                <dt>Username</dt><dd>${esc(u.username)}</dd>
                <dt>Email</dt><dd>${esc(u.email)}</dd>
                <dt>Mobile</dt><dd>${esc(u.mobile)}</dd>
                <dt>Role</dt><dd>${badge(u.role === 'admin' ? 'Admin' : 'User')}</dd>
                <dt>Account status</dt><dd>${badge(u.status.charAt(0).toUpperCase() + u.status.slice(1))}</dd>
                <dt>Registered</dt><dd>${esc(fmtDateTime(u.createdAt))}</dd>
              </dl></div>`,
            })}
            <div class="grid">
              ${panel({
                title: 'MFA Gateway Identity', iconName: 'shield', tagKind: 'gateway',
                body: `<div class="panel-body"><dl class="dl">
                  <dt>Status</dt><dd>${g.authenticated ? badge('Verified') : badge('Not detected')}</dd>
                  <dt>Username</dt><dd>${esc(g.username || '-')}</dd>
                  <dt>Email</dt><dd>${esc(g.email || '-')}</dd>
                  <dt>Groups</dt><dd>${esc(g.groups.length ? g.groups.join(', ') : 'Not forwarded')}</dd>
                </dl></div>`,
              })}
              ${panel({
                title: 'EBS Session', iconName: 'key',
                body: `<div class="panel-body"><dl class="dl">
                  <dt>Signed in at</dt><dd>${esc(fmtDateTime(s.loginAt))}</dd>
                  <dt>Session expires</dt><dd>${esc(fmtDateTime(s.expiresAt))} (extends with activity)</dd>
                  <dt>Cookie</dt><dd>HTTP-only, server-side session</dd>
                </dl></div>`,
              })}
            </div>
          </div>`;
        })
        .catch((err) => {
          if (err.status !== 401) host('profile').innerHTML = `<div class="panel">${stateHtml('error', 'Unable to load your profile. Please try again.', err.message)}</div>`;
        });
    },
  },
};

// ---------- Boot ----------
async function boot() {
  root.innerHTML = `<div class="panel">${stateHtml('loading', 'Verifying your EBS session…')}</div>`;
  try {
    const [session, gateway] = await Promise.all([authService.session(), userService.getCurrentUser()]);
    if (!session.authenticated) {
      const reason = session.code === 'SESSION_EXPIRED' ? 'expired' : session.code === 'SESSION_INVALIDATED' ? 'invalid' : '';
      window.location.replace(`/?next=${encodeURIComponent(route)}${reason ? `&reason=${reason}` : ''}`);
      return;
    }
    state.user = session.user;
    state.gateway = gateway;
  } catch (err) {
    if (err.status === 401) return;
    root.innerHTML = `<div class="panel">${stateHtml('error', 'Unable to verify your session. Please try again.', err.message)}</div>`;
    return;
  }

  document.getElementById('hdr-name').textContent = state.user.fullName;
  document.getElementById('hdr-email').textContent = state.user.email;
  renderMfaBadge(document.getElementById('mfa-badge'), state.gateway);

  const page = PAGES[route] || PAGES['/home'];
  document.title = `${page.title} | APSRTC EBS Portal`;
  page.render();
}

boot();
