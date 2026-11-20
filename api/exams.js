'use strict';
// Trả đề. Admin: tất cả đề. Tài khoản có cờ HSK: chỉ đề HSK. Tài khoản không có cờ: chỉ đề không phải HSK (JLPT).
// Khách (?guest=1, không cần đăng nhập): tất cả đề JLPT như người dùng thường, không bao giờ có đề HSK.
const db = require('./_lib/db');
const { requireUser } = require('./_lib/session');
const { httpError, route } = require('./_lib/http');

module.exports = route(async function (req, res) {
  if (req.method !== 'GET') throw httpError(405, 'Phương thức không được hỗ trợ.');
  const guest = new URL(req.url, 'http://x').searchParams.get('guest') === '1';
  let where, tag;
  if (guest) { where = "level not like 'HSK%'"; tag = 'g'; }
  else {
    const user = await requireUser(req, res);
    where = user.isAdmin ? 'true' : (user.canHsk ? "level like 'HSK%'" : "level not like 'HSK%'");
    tag = user.isAdmin ? 'a' : (user.canHsk ? 'h' : 'j');
  }
  const v = await db.query("select count(*)::int as n, coalesce(extract(epoch from max(updated_at)), 0)::text as t, coalesce(sum(id), 0)::text as s from exams where " + where);
  const etag = '"e-' + tag + '-' + v.rows[0].n + '-' + v.rows[0].t + '-' + v.rows[0].s + '"';
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, no-cache');
  if (req.headers['if-none-match'] === etag) { res.statusCode = 304; return res.end(); }
  const r = await db.query('select id, data from exams where ' + where + ' order by id');
  const files = r.rows.map(function (row) { return { path: 'de-' + row.id, text: JSON.stringify(row.data) }; });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ files: files }));
});
