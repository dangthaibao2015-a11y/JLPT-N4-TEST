'use strict';
const { Pool } = require('pg');

let pool = null;

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function getPool() {
  if (!pool) {
    const cs = connectionString();
    if (!cs) {
      const e = new Error('Máy chủ chưa được cấu hình cơ sở dữ liệu.');
      e.status = 500; e.expose = true;
      throw e;
    }
    // Dùng chuỗi kết nối "pooled" của Neon. Giữ số kết nối nhỏ vì mỗi lần gọi hàm là một tiến trình riêng.
    pool = new Pool({ connectionString: cs, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
    pool.on('error', function (e) { console.error('pg pool error:', e.message); });
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { query, getPool };
