'use strict';
const { ready } = require('./boot');

function httpError(status, message) {
  const e = new Error(message);
  e.status = status; e.expose = true;
  return e;
}

function send(res, status, obj, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (headers) Object.keys(headers).forEach(function (k) { res.setHeader(k, headers[k]); });
  res.end(JSON.stringify(obj));
}

async function readJson(req, maxBytes) {
  const limit = maxBytes || 100000;
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch (e) { throw httpError(400, 'Dữ liệu gửi lên không hợp lệ.'); }
  }
  const chunks = []; let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > limit) throw httpError(413, 'Dữ liệu gửi lên quá lớn.');
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch (e) { throw httpError(400, 'Dữ liệu gửi lên không hợp lệ.'); }
}

// Chặn yêu cầu ghi từ trang khác: phải là JSON và (nếu trình duyệt gửi Origin) phải cùng tên miền.
function checkPost(req) {
  if (req.method !== 'POST') throw httpError(405, 'Phương thức không được hỗ trợ.');
  if (!/application\/json/i.test(String(req.headers['content-type'] || ''))) throw httpError(415, 'Yêu cầu không hợp lệ.');
  const origin = req.headers.origin;
  if (origin) {
    let h = '';
    try { h = new URL(origin).host; } catch (e) { h = ''; }
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (h !== host) throw httpError(403, 'Yêu cầu bị từ chối.');
  }
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || '';
}

// Bọc handler: bắt lỗi, chỉ hiện thông điệp an toàn cho người dùng.
function route(handler) {
  return async function (req, res) {
    try {
      await ready();
      await handler(req, res);
    } catch (e) {
      if (e && e.expose) return send(res, e.status || 400, Object.assign({ error: e.message }, e.extra || {}));
      console.error('API error:', e && e.stack ? e.stack : e);
      send(res, 500, { error: 'Máy chủ gặp lỗi. Hãy thử lại sau.' });
    }
  };
}

module.exports = { httpError, send, readJson, checkPost, clientIp, route };
