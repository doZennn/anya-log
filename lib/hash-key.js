'use strict';

const argon2 = require('argon2');

module.exports = async (logKey) => (await argon2.hash(logKey, {
  type: argon2.argon2id,
  timeCost: 10,
  memoryCost: 4096,
  parallelism: 1,
  hashLength: 32,
  salt: Buffer.from(process.env.HASH_SALT, 'hex'),
  saltLength: 512,
  raw: true
})).toString('hex');
