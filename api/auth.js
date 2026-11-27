'use strict';
// Tài khoản: /api/auth?action=me | register | login | logout | change_password
const crypto = require('crypto');
const db = require('./_lib/db');
const { hashPassword, verifyPassword } = require('./_lib/password');
const { createSession, currentUser, destroySession, tokenHash, requireUser } = require('./_lib/session');
const { httpError, send, readJson, checkPost, clientIp, route } = require('./_lib/http');

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const LIMITS = { login_user: 8, login_ip: 30, register_ip: 60 };

let dummyHash = null; // để mất thời gian như thật khi tên đăng nhập không tồn tại
function getDummyHash() {
  if (!dummyHash) dummyHash = hashPassword('khong-ton-tai-' + crypto.randomBytes(8).toString('hex'));
  return dummyHash;
}

async function counts(kind, usernameLower, ip, interval) {
  const r = await db.query(
    "select count(*) filter (where username_lower = $2)::int as by_user, count(*) filter (where ip = $3)::int as by_ip " +
    "from auth_events where kind = $1 and at > now() - ($4)::interval",
    [kind, usernameLower, ip, interval]
  );
  return r.rows[0];
}

async function recordEvent(kind, usernameLower, ip) {
  await db.query('insert into auth_events (kind, username_lower, ip) values ($1, $2, $3)', [kind, usernameLower, ip]);
  await db.query("delete from auth_events where at < now() - interval '1 day'");
}

function tooMany() { return httpError(429, 'Thử quá nhiều lần. Hãy đợi một lúc rồi thử lại.'); }
function userView(row) { return { id: String(row.id), username: row.username, isAdmin: row.is_admin === true, canHsk: row.can_hsk === true, canKorean: row.can_korean === true }; }

function readCredentials(body) {
  return {
    username: typeof body.username === 'string' ? body.username.trim() : '',
    password: typeof body.password === 'string' ? body.password : ''
  };
}

async function register(req, res) {
  checkPost(req);
  const { username, password } = readCredentials(await readJson(req));
  const ip = clientIp(req);
  if (!USERNAME_RE.test(username)) throw httpError(400, 'Tên đăng nhập gồm 3 đến 30 ký tự: chữ cái không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  if (password.length < 8 || password.length > 128) throw httpError(400, 'Mật khẩu cần từ 8 đến 128 ký tự.');

  const c = await counts('register', '', ip, '1 hour');
  if (c.by_ip >= LIMITS.register_ip) throw tooMany();

  const hash = await hashPassword(password);
  const ins = await db.query(
    'insert into users (username, username_lower, password_hash) values ($1, $2, $3) ' +
    'on conflict (username_lower) do nothing returning id, username, is_admin, can_hsk, can_korean',
    [username, username.toLowerCase(), hash]
  );
  if (!ins.rows[0]) throw httpError(409, 'Tên đăng nhập này đã có người dùng.');
  await recordEvent('register', '', ip);
  await createSession(req, res, ins.rows[0].id);
  send(res, 201, { user: userView(ins.rows[0]) });
}

async function login(req, res) {
  checkPost(req);
  const { username, password } = readCredentials(await readJson(req));
  const lower = username.toLowerCase();
  const ip = clientIp(req);
  if (!username || !password || username.length > 60 || password.length > 128) throw httpError(400, 'Hãy nhập tên đăng nhập và mật khẩu.');

  const c = await counts('login_fail', lower, ip, '15 minutes');
  if (c.by_user >= LIMITS.login_user || c.by_ip >= LIMITS.login_ip) throw tooMany();

  const r = await db.query('select id, username, password_hash, is_admin, is_disabled, can_hsk, can_korean from users where username_lower = $1', [lower]);
  const row = r.rows[0];
  const ok = await verifyPassword(password, row ? row.password_hash : await getDummyHash());
  if (!row || !ok) {
    await recordEvent('login_fail', lower, ip);
    throw httpError(401, 'Sai tên đăng nhập hoặc mật khẩu.');
  }
  if (row.is_disabled) throw httpError(403, 'Tài khoản này đã bị khóa. Hãy liên hệ người quản lý.');

  await db.query('update users set last_login_at = now() where id = $1', [row.id]);
  await db.query("delete from auth_events where kind = 'login_fail' and username_lower = $1", [lower]);
  await db.query('delete from sessions where expires_at < now()');
  await createSession(req, res, row.id);
  send(res, 200, { user: userView(row) });
}

async function logout(req, res) {
  checkPost(req);
  await destroySession(req, res);
  send(res, 200, { ok: true });
}

async function me(req, res) {
  if (req.method !== 'GET') throw httpError(405, 'Phương thức không được hỗ trợ.');
  send(res, 200, { user: await currentUser(req, res) });
}

async function changePassword(req, res) {
  checkPost(req);
  const user = await requireUser(req, res);
  const body = await readJson(req);
  const cur = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (next.length < 8 || next.length > 128) throw httpError(400, 'Mật khẩu mới cần từ 8 đến 128 ký tự.');
  if (next === cur) throw httpError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại.');
  const lower = user.username.toLowerCase(), ip = clientIp(req);
  const c = await counts('login_fail', lower, ip, '15 minutes');
  if (c.by_user >= LIMITS.login_user || c.by_ip >= LIMITS.login_ip) throw tooMany();
  const r = await db.query('select password_hash from users where id = $1', [user.id]);
  if (!r.rows[0] || !(await verifyPassword(cur, r.rows[0].password_hash))) {
    await recordEvent('login_fail', lower, ip);
    throw httpError(401, 'Mật khẩu hiện tại chưa đúng.');
  }
  await db.query('update users set password_hash = $2 where id = $1', [user.id, await hashPassword(next)]);
  await db.query('delete from sessions where user_id = $1 and token_hash <> $2', [user.id, tokenHash(req)]); // đăng xuất các máy khác
  send(res, 200, { ok: true });
}

module.exports = route(async function (req, res) {
  const action = new URL(req.url, 'http://x').searchParams.get('action');
  if (action === 'me') return me(req, res);
  if (action === 'register') return register(req, res);
  if (action === 'login') return login(req, res);
  if (action === 'logout') return logout(req, res);
  if (action === 'change_password') return changePassword(req, res);
  throw httpError(404, 'Không có chức năng này.');
});
