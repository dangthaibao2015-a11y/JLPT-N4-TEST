'use strict';
// Khu quản lý (chỉ admin): /api/admin?action=...  Luôn kiểm tra quyền admin ở máy chủ.
const crypto = require('crypto');
const db = require('./_lib/db');
const { hashPassword } = require('./_lib/password');
const { requireAdmin } = require('./_lib/session');
const { parseExams, normLevel, stripFence } = require('./_lib/exam');
const { httpError, send, readJson, checkPost, route } = require('./_lib/http');

const TEMP_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function tempPassword() {
  let out = '';
  for (let i = 0; i < 10; i++) out += TEMP_CHARS[crypto.randomInt(TEMP_CHARS.length)];
  return out;
}

function idOf(v) {
  const s = String(v == null ? '' : v);
  if (!/^\d{1,15}$/.test(s)) throw httpError(400, 'Mã không hợp lệ.');
  return s;
}

/* ---------- đề ---------- */
async function examsList() {
  const r = await db.query(
    "select e.id, e.name, e.level, e.guest, e.updated_at, jsonb_array_length(e.data->'questions') as questions, " +
    "(select jsonb_agg(jsonb_build_object('section', s.sec, 'n', s.n) order by s.first) from " +
    "(select q->>'section' as sec, count(*)::int as n, min(ord) as first from jsonb_array_elements(e.data->'questions') with ordinality as t(q, ord) group by q->>'section') s) as sections " +
    'from exams e order by e.updated_at desc'
  );
  return { exams: r.rows.map(function (x) { return Object.assign({}, x, { id: String(x.id) }); }) };
}

async function examGet(req) {
  const id = idOf(new URL(req.url, 'http://x').searchParams.get('id'));
  const r = await db.query('select data from exams where id = $1', [id]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy đề này.');
  return { data: r.rows[0].data };
}

async function examSave(req, user) {
  checkPost(req);
  const body = await readJson(req, 3000000);
  let data = body.json;
  if (typeof data === 'string') {
    try { data = JSON.parse(stripFence(data)); } catch (e) { throw httpError(400, 'JSON không đọc được: ' + e.message); }
  }
  if (data == null || typeof data !== 'object') throw httpError(400, 'Hãy dán nội dung JSON của đề.');
  const parsed = parseExams(data, typeof body.name === 'string' ? body.name.trim() : '');
  if (parsed.errors.length) { const e = httpError(400, 'Đề có lỗi, chưa lưu được.'); e.extra = { errors: parsed.errors.slice(0, 12) }; throw e; }
  if (!parsed.exams.length) throw httpError(400, 'Không có đề nào để lưu.');
  const replace = body.replace === true, guest = body.guest === true;
  const names = parsed.exams.map(function (x) { return x.name.toLowerCase(); });
  const ex = await db.query('select name from exams where name_lower = any($1)', [names]);
  if (ex.rows.length && !replace) {
    const e = httpError(409, 'Đã có đề tên “' + ex.rows[0].name + '”. Bấm ghi đè nếu muốn thay bằng nội dung mới.');
    e.extra = { code: 'exists', names: ex.rows.map(function (r) { return r.name; }) };
    throw e;
  }
  const saved = [];
  for (const x of parsed.exams) {
    const r = await db.query(
      'insert into exams (name, name_lower, level, data, created_by, guest) values ($1, $2, $3, $4, $5, $6) ' +
      'on conflict (name_lower) do update set name = excluded.name, level = excluded.level, data = excluded.data, guest = excluded.guest, updated_at = now() returning id',
      [x.name, x.name.toLowerCase(), x.level, JSON.stringify(x), user.id, guest]
    );
    saved.push({ id: String(r.rows[0].id), name: x.name, questions: x.questions.length });
  }
  return { saved: saved };
}

async function examUpdate(req) {
  checkPost(req);
  const body = await readJson(req);
  const id = idOf(body.id);
  const name = String(body.name || '').trim();
  if (!name || name.length > 100) throw httpError(400, 'Tên đề cần từ 1 đến 100 ký tự.');
  const level = normLevel(body.level);
  const dup = await db.query('select 1 from exams where name_lower = $1 and id <> $2', [name.toLowerCase(), id]);
  if (dup.rows.length) throw httpError(409, 'Đã có một đề trùng tên này.');
  const r = await db.query(
    "update exams set name = $2, name_lower = $3, level = $4, guest = coalesce($5, guest), data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($2::text)), '{level}', to_jsonb($4::text)), updated_at = now() where id = $1 returning id",
    [id, name, name.toLowerCase(), level, typeof body.guest === 'boolean' ? body.guest : null]
  );
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy đề này.');
  return { ok: true };
}

async function examDelete(req) {
  checkPost(req);
  const id = idOf((await readJson(req)).id);
  const r = await db.query('delete from exams where id = $1 returning id', [id]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy đề này.');
  return { ok: true };
}

/* ---------- người dùng ---------- */
async function usersList() {
  const r = await db.query(
    'select u.id, u.username, u.is_admin, u.is_disabled, u.can_hsk, u.can_korean, u.created_at, u.last_login_at, ' +
    '(select count(*)::int from attempts a where a.user_id = u.id) as attempts from users u order by u.created_at desc limit 500'
  );
  return { users: r.rows.map(function (x) { return Object.assign({}, x, { id: String(x.id) }); }) };
}

async function userReset(req, admin) {
  checkPost(req);
  const id = idOf((await readJson(req)).id);
  if (id === admin.id) throw httpError(400, 'Hãy đổi mật khẩu của chính bạn ở mục Tài khoản.');
  const pw = tempPassword();
  const r = await db.query('update users set password_hash = $2 where id = $1 returning username', [id, await hashPassword(pw)]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy người dùng này.');
  await db.query('delete from sessions where user_id = $1', [id]);
  await db.query('delete from auth_events where username_lower = $1', [r.rows[0].username.toLowerCase()]);
  return { username: r.rows[0].username, password: pw };
}

async function userDisable(req, admin) {
  checkPost(req);
  const body = await readJson(req);
  const id = idOf(body.id);
  if (id === admin.id) throw httpError(400, 'Bạn không thể tự khóa tài khoản của mình.');
  const disabled = body.disabled === true;
  const r = await db.query('update users set is_disabled = $2 where id = $1 returning id', [id, disabled]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy người dùng này.');
  if (disabled) await db.query('delete from sessions where user_id = $1', [id]);
  return { ok: true };
}

async function userAdmin(req, admin) {
  checkPost(req);
  const body = await readJson(req);
  const id = idOf(body.id);
  if (id === admin.id) throw httpError(400, 'Bạn không thể tự đổi quyền của mình.');
  const value = body.isAdmin === true;
  if (!value) {
    const n = (await db.query('select count(*)::int as c from users where is_admin and id <> $1', [id])).rows[0].c;
    if (n < 1) throw httpError(400, 'Phải còn ít nhất một admin.');
  }
  const r = await db.query('update users set is_admin = $2 where id = $1 returning id', [id, value]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy người dùng này.');
  return { ok: true };
}

async function userKorean(req) {
  checkPost(req);
  const body = await readJson(req);
  const r = await db.query('update users set can_korean = $2 where id = $1 returning id', [idOf(body.id), body.canKorean === true]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy người dùng này.');
  return { ok: true };
}

async function userHsk(req) {
  checkPost(req);
  const body = await readJson(req);
  const r = await db.query('update users set can_hsk = $2 where id = $1 returning id', [idOf(body.id), body.canHsk === true]);
  if (!r.rows[0]) throw httpError(404, 'Không tìm thấy người dùng này.');
  return { ok: true };
}

/* ---------- kết quả ---------- */
async function results() {
  const r = await db.query(
    'select a.id, u.username, a.level, a.exams, a.total, a.correct, a.wrong, a.blank, a.sections, a.duration_sec, a.finished_at ' +
    'from attempts a join users u on u.id = a.user_id order by a.finished_at desc limit 300'
  );
  const s = await db.query('select count(*)::int as attempts, count(distinct user_id)::int as users, coalesce(sum(total),0)::int as questions, coalesce(sum(correct),0)::int as correct from attempts');
  return { stats: s.rows[0], items: r.rows.map(function (x) { return Object.assign({}, x, { id: String(x.id) }); }) };
}

module.exports = route(async function (req, res) {
  const admin = await requireAdmin(req, res);
  const action = new URL(req.url, 'http://x').searchParams.get('action');
  const get = { exams: examsList, exam_get: examGet, users: usersList, results: results };
  const post = { exam_save: examSave, exam_update: examUpdate, exam_delete: examDelete, user_reset: userReset, user_disable: userDisable, user_admin: userAdmin, user_hsk: userHsk, user_korean: userKorean };
  if (get[action]) {
    if (req.method !== 'GET') throw httpError(405, 'Phương thức không được hỗ trợ.');
    return send(res, 200, await get[action](req, admin));
  }
  if (post[action]) return send(res, 200, await post[action](req, admin));
  throw httpError(404, 'Không có chức năng này.');
});
