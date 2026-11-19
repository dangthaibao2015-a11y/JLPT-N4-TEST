'use strict';
const crypto = require('crypto');
const db = require('./db');

const COOKIE = 'jlpt_sid';
const DAY = 86400;
const LIFETIME_DAYS = 30;

function sha(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* bỏ qua cookie hỏng */ }
    }
  });
  return out;
}

function isSecure(req) {
  return req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL === '1';
}

function setCookie(req, res, token, maxAge) {
  const c = COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (isSecure(req) ? '; Secure' : '');
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}

async function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.query(
    "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' days')::interval)",
    [sha(token), userId, String(LIFETIME_DAYS)]
  );
  setCookie(req, res, token, LIFETIME_DAYS * DAY);
}

// Trả về { id, username, isAdmin } hoặc null. Cờ admin và trạng thái khóa luôn đọc lại từ cơ sở dữ liệu.
async function currentUser(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const r = await db.query(
    "select u.id, u.username, u.is_admin, u.is_disabled, (s.expires_at < now() + interval '15 days') as renew " +
    'from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()',
    [sha(token)]
  );
  const row = r.rows[0];
  if (!row || row.is_disabled) return null;
  if (row.renew && res) {
    await db.query("update sessions set expires_at = now() + ($2 || ' days')::interval where token_hash = $1", [sha(token), String(LIFETIME_DAYS)]);
    setCookie(req, res, token, LIFETIME_DAYS * DAY);
  }
  return { id: String(row.id), username: row.username, isAdmin: row.is_admin === true };
}

async function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) await db.query('delete from sessions where token_hash = $1', [sha(token)]);
  setCookie(req, res, '', 0);
}

function tokenHash(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  return token ? sha(token) : '';
}

async function requireUser(req, res) {
  const user = await currentUser(req, res);
  if (!user) { const e = new Error('Bạn cần đăng nhập.'); e.status = 401; e.expose = true; throw e; }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user.isAdmin) { const e = new Error('Bạn không có quyền làm việc này.'); e.status = 403; e.expose = true; throw e; }
  return user;
}

module.exports = { createSession, currentUser, destroySession, tokenHash, requireUser, requireAdmin };
