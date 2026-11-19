'use strict';
const crypto = require('crypto');

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scrypt(password, salt, n, r, p, keylen) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(password, salt, keylen, { N: n, r: r, p: p, maxmem: 64 * 1024 * 1024 }, function (err, key) {
      if (err) reject(err); else resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, N, R, P, KEYLEN);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const p = String(stored || '').split('$');
  if (p.length !== 6 || p[0] !== 'scrypt') return false;
  const want = Buffer.from(p[5], 'base64');
  const key = await scrypt(password, Buffer.from(p[4], 'base64'), +p[1], +p[2], +p[3], want.length);
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

module.exports = { hashPassword, verifyPassword };
