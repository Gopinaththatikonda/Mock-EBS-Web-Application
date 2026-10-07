'use strict';

const db = require('../config/database');

// Columns that are safe to return to the browser (never password_hash).
const PUBLIC_COLUMNS = `id, full_name, employee_id, email, mobile, username, role, status,
  created_at, updated_at, last_login`;

function toPublic(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.full_name,
    employeeId: row.employee_id,
    email: row.email,
    mobile: row.mobile,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

async function create({ fullName, employeeId, email, mobile, username, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (full_name, employee_id, email, mobile, username, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${PUBLIC_COLUMNS}`,
    [fullName, employeeId, email, mobile, username, passwordHash]
  );
  return toPublic(rows[0]);
}

// Login identifier may be a username, employee ID or email. Returns the raw row
// (including password_hash) for credential checking only.
async function findForLogin(identifier) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users
     WHERE username = LOWER($1) OR employee_id = UPPER($1) OR email = LOWER($1)
     LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return toPublic(rows[0]);
}

async function recordLogin(id) {
  const { rows } = await db.query(
    `UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [id]
  );
  return toPublic(rows[0]);
}

async function list({ limit, offset, search }) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `WHERE LOWER(full_name) LIKE $1 OR username LIKE $1 OR email LIKE $1 OR LOWER(employee_id) LIKE $1`;
  }
  const total = await db.query(`SELECT COUNT(*)::int AS n FROM users ${where}`, params);
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${where}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { total: total.rows[0].n, items: rows.map(toPublic) };
}

module.exports = { toPublic, create, findForLogin, findById, recordLogin, list };
