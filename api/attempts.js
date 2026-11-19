'use strict';
// Kết quả làm bài: POST lưu một lần làm xong, GET xem lịch sử của chính mình.
const db = require('./_lib/db');
const { requireUser } = require('./_lib/session');
const { httpError, send, readJson, checkPost, route } = require('./_lib/http');

function int(v, min, max, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw httpError(400, 'Dữ liệu “' + label + '” không hợp lệ.');
  return n;
}
function text(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

function validate(b) {
  const clientId = text(b.clientId, 64);
  if (clientId.length < 8) throw httpError(400, 'Thiếu mã bài làm.');
  const total = int(b.total, 1, 600, 'total'), correct = int(b.correct, 0, 600, 'correct');
  const wrong = int(b.wrong, 0, 600, 'wrong'), blank = int(b.blank, 0, 600, 'blank');
  if (correct + wrong + blank !== total) throw httpError(400, 'Số câu đúng, sai, bỏ trống không khớp với tổng số câu.');
  if (!Array.isArray(b.sections) || b.sections.length < 1 || b.sections.length > 12) throw httpError(400, 'Dữ liệu các phần không hợp lệ.');
  let st = 0, sc = 0;
  const sections = b.sections.map(function (s) {
    const t = int(s && s.total, 0, 600, 'sections.total'), c = int(s && s.correct, 0, t, 'sections.correct');
    st += t; sc += c;
    return { section: text(s.section, 10), title: text(s.title, 60), total: t, correct: c };
  });
  if (st !== total || sc !== correct) throw httpError(400, 'Điểm các phần không khớp với tổng.');
  const exams = (Array.isArray(b.exams) ? b.exams : []).slice(0, 20).map(function (x) { return text(x, 100); }).filter(Boolean);
  const level = /^N[1-5]$/.test(String(b.level)) ? String(b.level) : '';
  const started = new Date(b.startedAt);
  const ok = !isNaN(started) && started.getTime() > Date.now() - 3 * 86400000 && started.getTime() < Date.now() + 3600000;
  return {
    clientId: clientId, level: level, exams: exams, total: total, correct: correct, wrong: wrong, blank: blank, sections: sections,
    durationSec: int(b.durationSec, 0, 172800, 'durationSec'), limitSec: int(b.limitSec || 0, 0, 86400, 'limitSec'),
    auto: b.auto === true, startedAt: (ok ? started : new Date()).toISOString()
  };
}

async function save(req, res) {
  checkPost(req);
  const user = await requireUser(req, res);
  const a = validate(await readJson(req));
  const r = await db.query(
    'insert into attempts (user_id, client_id, level, exams, total, correct, wrong, blank, sections, duration_sec, limit_sec, auto_submitted, started_at) ' +
    'values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) on conflict (user_id, client_id) do nothing returning id',
    [user.id, a.clientId, a.level, JSON.stringify(a.exams), a.total, a.correct, a.wrong, a.blank, JSON.stringify(a.sections), a.durationSec, a.limitSec, a.auto, a.startedAt]
  );
  send(res, 201, { ok: true, duplicate: !r.rows[0] });
}

async function list(req, res) {
  const user = await requireUser(req, res);
  const stats = await db.query(
    'select count(*)::int as attempts, coalesce(sum(total),0)::int as questions, coalesce(sum(correct),0)::int as correct, ' +
    "count(distinct (finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::int as days from attempts where user_id = $1", [user.id]);
  const rows = await db.query(
    'select id, level, exams, total, correct, wrong, blank, sections, duration_sec, limit_sec, auto_submitted, finished_at ' +
    'from attempts where user_id = $1 order by finished_at desc limit 200', [user.id]);
  send(res, 200, { stats: stats.rows[0], items: rows.rows });
}

module.exports = route(async function (req, res) {
  if (req.method === 'GET') return list(req, res);
  return save(req, res);
});
