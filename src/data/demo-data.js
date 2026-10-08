'use strict';

/*
 * DEMO DATA ONLY.
 * Illustrative APSRTC-style records for the POC. These are NOT live APSRTC production
 * records. Every API response that serves this data carries "demo": true.
 */

const DEPOTS = ['Vijayawada', 'Hyderabad', 'Tirupati', 'Visakhapatnam', 'Guntur', 'Kurnool', 'Nellore', 'Kakinada'];
const BUS_TYPES = ['City Services', 'Intercity Services', 'Express Services', 'Garuda', 'Super Luxury'];

const ROUTES = [
  ['Vijayawada', 'Hyderabad', 'Suryapet', 'Garuda', '06:00', '11:15'],
  ['Vijayawada', 'Visakhapatnam', 'Rajahmundry', 'Super Luxury', '07:30', '14:00'],
  ['Tirupati', 'Chennai', 'Puttur', 'Express Services', '05:45', '09:30'],
  ['Guntur', 'Vijayawada', 'Mangalagiri', 'Intercity Services', '08:10', '09:20'],
  ['Visakhapatnam', 'Srikakulam', 'Vizianagaram', 'Express Services', '09:00', '11:40'],
  ['Tirupati', 'Bengaluru', 'Chittoor', 'Garuda', '10:30', '16:00'],
  ['Kurnool', 'Hyderabad', 'Jadcherla', 'Super Luxury', '06:15', '10:30'],
  ['Nellore', 'Tirupati', 'Gudur', 'Express Services', '11:00', '13:45'],
  ['Hyderabad', 'Guntur', 'Narasaraopet', 'Super Luxury', '21:00', '03:30'],
  ['Kakinada', 'Vijayawada', 'Eluru', 'Intercity Services', '12:15', '17:00'],
  ['Vijayawada', 'Vijayawada', 'Benz Circle', 'City Services', '07:00', '07:55'],
  ['Visakhapatnam', 'Visakhapatnam', 'Gajuwaka', 'City Services', '08:20', '09:25'],
];

const OPS_STATUS = ['On Time', 'Departed', 'Arrived', 'Delayed', 'Scheduled', 'On Time'];
const DEPOT_CODES = {
  Vijayawada: 'VJA', Hyderabad: 'HYD', Tirupati: 'TPT', Visakhapatnam: 'VSP',
  Guntur: 'GNT', Kurnool: 'KNL', Nellore: 'NLR', Kakinada: 'KKD',
};

const serviceOperations = [];
ROUTES.forEach((r, i) => {
  for (let k = 0; k < 3; k++) {
    const [from, to, via, busType, dep, arr] = r;
    const code = DEPOT_CODES[from];
    const serviceNo = `${code}-${2041 + i * 37 + k * 112}`;
    const shift = k * 2;
    const t = (s) => {
      const [h, m] = s.split(':').map(Number);
      return `${String((h + shift) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    serviceOperations.push({
      serviceNo,
      route: from === to ? `${from} City - ${via}` : `${from} - ${to}`,
      from,
      to: from === to ? via : to,
      via,
      depot: DEPOTS.includes(from) ? from : DEPOTS[i % DEPOTS.length],
      busType,
      status: OPS_STATUS[(i + k) % OPS_STATUS.length],
      departure: t(dep),
      arrival: t(arr),
    });
  }
});

const NAMES = [
  'K. Srinivasa Rao', 'P. Lakshmi Devi', 'M. Venkata Ramana', 'Ch. Anitha', 'B. Ravi Kumar',
  'S. Nagaraju', 'T. Padmavathi', 'G. Suresh Babu', 'D. Sai Krishna', 'N. Madhavi Latha',
  'V. Prasad', 'Y. Ramesh', 'A. Swathi', 'R. Mahesh', 'J. Kalyani', 'L. Narasimha Rao',
  'K. Bhaskar', 'P. Sujatha', 'M. Chandra Sekhar', 'G. Haritha', 'S. Koteswara Rao',
  'B. Divya', 'T. Raghavendra', 'V. Sravani', 'N. Anjaneyulu', 'R. Vijaya Lakshmi',
  'Ch. Mallikarjuna', 'D. Prameela', 'K. Venkatesh', 'A. Rajeswari', 'P. Gopal', 'M. Sunitha',
];
const ROLES = [
  ['Depot Manager', 'Operations'], ['Operations Officer', 'Operations'], ['Assistant Manager', 'Traffic'],
  ['Conductor', 'Traffic'], ['Driver', 'Traffic'], ['HR Officer', 'Human Resources'],
  ['Mechanical Supervisor', 'Mechanical'], ['Accounts Officer', 'Finance'], ['Driver', 'Traffic'],
  ['Conductor', 'Traffic'], ['Traffic Inspector', 'Traffic'], ['Administrative Officer', 'Administration'],
];
const EMP_STATUS = ['Active', 'On Duty', 'Active', 'On Leave', 'On Duty', 'Active', 'Training'];

const employees = NAMES.map((name, i) => {
  const [role, department] = ROLES[i % ROLES.length];
  return {
    employeeId: `APS${String(10234 + i * 17)}`,
    name,
    department,
    role,
    depot: DEPOTS[i % DEPOTS.length],
    status: EMP_STATUS[i % EMP_STATUS.length],
  };
});

// Timestamps relative to "now" so demo data always looks recent and never lies in the future.
function minutesAgo(min) {
  return new Date(Date.now() - min * 60000).toISOString();
}
function daysAgo(days, hh, mm) {
  return minutesAgo(days * 1440 + hh * 7 + mm);
}

const REQ_TYPES = ['Leave Application', 'Depot Transfer', 'Bus Pass Renewal', 'Vehicle Maintenance', 'Salary Advance', 'Duty Change'];
const REQ_STATUS = ['Pending', 'Approved', 'In Review', 'Approved', 'Rejected', 'Pending'];
const requests = Array.from({ length: 24 }, (_, i) => ({
  requestId: `REQ-2026-${String(1418 - i).padStart(4, '0')}`,
  type: REQ_TYPES[i % REQ_TYPES.length],
  submittedBy: NAMES[(i * 5) % NAMES.length],
  depot: DEPOTS[(i * 3) % DEPOTS.length],
  date: daysAgo(Math.floor(i / 3), 9 + (i % 8), (i * 7) % 60),
  status: REQ_STATUS[i % REQ_STATUS.length],
}));

const activity = [
  ['Service schedule updated', 'Operations Officer', 'Operations', 'Success'],
  ['Employee record modified', 'HR Officer', 'Employees', 'Success'],
  ['Monthly revenue report generated', 'Accounts Officer', 'Reports', 'Completed'],
  ['Depot fuel log submitted', 'Depot Manager', 'Operations', 'Success'],
  ['Grievance GRV-3051 assigned', 'Assistant Manager', 'Grievance', 'Pending'],
  ['New Garuda service added', 'Operations Officer', 'Services', 'Success'],
  ['Leave request approved', 'Depot Manager', 'Employees', 'Completed'],
  ['Bulk duty roster import', 'Administrative Officer', 'Administration', 'Failed'],
  ['Occupancy report exported', 'Assistant Manager', 'Reports', 'Completed'],
  ['Bus breakdown logged', 'Mechanical Supervisor', 'Operations', 'Pending'],
  ['User role updated', 'Administrative Officer', 'Administration', 'Success'],
  ['Route rationalisation draft saved', 'Operations Officer', 'Services', 'Pending'],
].map(([activityName, role, module, status], i) => ({
  activity: activityName,
  user: `${NAMES[(i * 3) % NAMES.length]} (${role})`,
  module,
  dateTime: minutesAgo(12 + i * 97 + (i * 13) % 40),
  status,
}));

const depots = DEPOTS.map((depot, i) => ({
  depot,
  region: ['Krishna', 'Telangana (Inter-state)', 'Chittoor', 'Visakhapatnam', 'Guntur', 'Kurnool', 'Nellore', 'East Godavari'][i],
  buses: 148 - i * 9,
  schedulesToday: 132 - i * 8,
  onTimePercent: [96.4, 92.1, 94.8, 91.5, 95.2, 89.7, 93.3, 90.8][i],
  status: i === 5 ? 'Attention' : 'Operational',
}));

const services = BUS_TYPES.map((busType, i) => ({
  busType,
  activeServices: [3240, 2860, 2415, 312, 968][i],
  avgOccupancyPercent: [84, 76, 71, 68, 73][i],
  status: 'Active',
}));

const reports = [
  ['Daily Operations Summary', 'Operations', 'Daily', 'Generated'],
  ['Depot-wise Revenue (EPKM)', 'Finance', 'Monthly', 'Pending Approval'],
  ['Fleet Utilisation', 'Operations', 'Weekly', 'Generated'],
  ['Employee Attendance', 'Human Resources', 'Monthly', 'Pending'],
  ['Fuel Efficiency (KMPL)', 'Mechanical', 'Monthly', 'Generated'],
  ['Grievance Resolution', 'Administration', 'Weekly', 'Pending'],
  ['Occupancy Ratio by Service Type', 'Operations', 'Monthly', 'Generated'],
  ['Accident & Safety Summary', 'Traffic', 'Quarterly', 'In Progress'],
  ['Pass Holder Statistics', 'Traffic', 'Monthly', 'Generated'],
  ['Payroll Reconciliation', 'Finance', 'Monthly', 'Pending'],
].map(([report, module, frequency, status], i) => ({
  report,
  module,
  frequency,
  lastGenerated: minutesAgo(45 + i * 410),
  status,
}));

const GRV_CATEGORIES = ['Bus Delay', 'Staff Behaviour', 'Cleanliness', 'Ticketing / Refund', 'Bus Condition', 'Salary / Allowance'];
const GRV_STATUS = ['Open', 'In Progress', 'Resolved', 'Open', 'Escalated', 'Resolved'];
const grievances = Array.from({ length: 16 }, (_, i) => ({
  grievanceId: `GRV-${3058 - i}`,
  category: GRV_CATEGORIES[i % GRV_CATEGORIES.length],
  raisedBy: i % 6 === 5 ? 'Employee' : 'Passenger',
  depot: DEPOTS[(i * 5) % DEPOTS.length],
  date: daysAgo(Math.floor(i / 2), 10 + (i % 7), (i * 11) % 60),
  priority: ['High', 'Medium', 'Low'][i % 3],
  status: GRV_STATUS[i % GRV_STATUS.length],
}));

const summary = {
  employees: { value: 48236, label: 'Total Employees', note: 'Across all zones' },
  services: { value: services.reduce((n, s) => n + s.activeServices, 0), label: 'Active Services', note: '5 service categories' },
  operations: { value: 9412, label: "Today's Operations", note: '94.1% on schedule' },
  depots: { value: 128, label: 'Active Depots', note: '4 zones' },
  reports: { value: reports.filter((r) => /Pending/.test(r.status)).length, label: 'Pending Reports', note: 'Awaiting approval' },
};

const notices = [
  { title: 'Portal maintenance window', body: 'Scheduled maintenance on Sunday 02:00-04:00 IST. Services will be read-only.', date: daysAgo(1, 10, 0) },
  { title: 'Dasara special services', body: 'Additional services planned from major depots for the festival season.', date: daysAgo(3, 12, 0) },
  { title: 'Advance reservation extended', body: 'Passengers can now reserve seats up to 60 days before the date of travel.', date: daysAgo(6, 9, 30) },
];

module.exports = {
  datasets: { serviceOperations, employees, requests, activity, depots, services, reports, grievances },
  summary,
  notices,
};
