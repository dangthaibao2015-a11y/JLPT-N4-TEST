'use strict';
// Chạy một lần mỗi khi hàm khởi động: tạo bảng, tạo admin từ biến môi trường, nạp các đề có sẵn trong data/exams.
const fs = require('fs');
const path = require('path');
const db = require('./db');
const schema = require('./schema');
const { hashPassword } = require('./password');
const { parseExams, stripFence } = require('./exam');

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
let readyPromise = null;

// Tạo bảng còn thiếu. Nếu bảng exams chưa tồn tại (lần chạy đầu) thì nạp luôn bộ đề trong data/exams.
// Làm trong một giao dịch để nếu nạp đề lỗi thì không để lại bảng dở dang, lần sau sẽ thử lại.
async function migrate() {
  const client = await db.getPool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(727001)');
    const fresh = (await client.query("select to_regclass('exams') as t")).rows[0].t === null;
    await client.query(schema);
    if (fresh) await seedExams(client);
    await client.query('commit');
  } catch (e) {
    try { await client.query('rollback'); } catch (x) { /* bỏ qua */ }
    throw e;
  } finally {
    client.release();
  }
}

async function seedAdmin() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!username || !password) return;
  if (!USERNAME_RE.test(username) || password.length < 8) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD không hợp lệ (tên 3-30 ký tự không dấu, mật khẩu từ 8 ký tự). Bỏ qua việc tạo admin.');
    return;
  }
  const lower = username.toLowerCase();
  const r = await db.query('select id, is_admin from users where username_lower = $1', [lower]);
  if (!r.rows[0]) {
    const hash = await hashPassword(password);
    await db.query(
      'insert into users (username, username_lower, password_hash, is_admin) values ($1, $2, $3, true) ' +
      'on conflict (username_lower) do update set is_admin = true',
      [username, lower, hash]
    );
  } else if (!r.rows[0].is_admin) {
    await db.query('update users set is_admin = true where id = $1', [r.rows[0].id]);
  }
}

function walk(dir, rel, out, depth) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.isDirectory()) {
      if (depth < 3 && e.name.charAt(0) !== '.') walk(path.join(dir, e.name), rel + e.name + '/', out, depth + 1);
    } else if (/\.json$/i.test(e.name)) out.push(rel + e.name);
  });
}

async function seedExams(client) {
  const root = path.join(process.cwd(), 'data', 'exams');
  if (!fs.existsSync(root)) return;
  const names = [];
  walk(root, '', names, 0);
  names.sort();
  for (const n of names) {
    let data;
    try { data = JSON.parse(stripFence(fs.readFileSync(path.join(root, n), 'utf8'))); } catch (e) { console.error('Bỏ qua ' + n + ': JSON hỏng'); continue; }
    const r = parseExams(data, n.replace(/\.json$/i, '').split('/').pop());
    if (r.errors.length) { console.error('Bỏ qua ' + n + ': ' + r.errors[0]); continue; }
    for (const ex of r.exams) {
      await client.query(
        'insert into exams (name, name_lower, level, data) values ($1, $2, $3, $4) on conflict (name_lower) do nothing',
        [ex.name, ex.name.toLowerCase(), ex.level, JSON.stringify(ex)]
      );
    }
  }
}

function ready() {
  if (!readyPromise) {
    readyPromise = (async function () {
      await migrate();
      await seedAdmin();
    })().catch(function (e) { readyPromise = null; throw e; });
  }
  return readyPromise;
}

module.exports = { ready };
