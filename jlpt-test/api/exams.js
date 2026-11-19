'use strict';
// Trả toàn bộ đề cho người đã đăng nhập (đề nằm trong cơ sở dữ liệu).
const db = require('./_lib/db');
const { requireUser } = require('./_lib/session');
const { httpError, route } = require('./_lib/http');

module.exports = route(async function (req, res) {
  if (req.method !== 'GET') throw httpError(405, 'Phương thức không được hỗ trợ.');
  await requireUser(req, res);
  const v = await db.query("select count(*)::int as n, coalesce(extract(epoch from max(updated_at)), 0)::text as t, coalesce(sum(id), 0)::text as s from exams");
  const etag = '"e-' + v.rows[0].n + '-' + v.rows[0].t + '-' + v.rows[0].s + '"';
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, no-cache');
  if (req.headers['if-none-match'] === etag) { res.statusCode = 304; return res.end(); }
  const r = await db.query('select id, data from exams order by id');
  const files = r.rows.map(function (row) { return { path: 'de-' + row.id, text: JSON.stringify(row.data) }; });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ files: files }));
});
