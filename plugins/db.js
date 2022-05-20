'use strict';

const fp = require('fastify-plugin');
const Database = require('better-sqlite3');

module.exports = fp(async function (fastify) {
  const db = new Database('anyalog.db', { fileMustExist: true });
  fastify.addHook('onClose', (instance, done) => {
    instance.db.close();
    done();
  });
  fastify.decorate('db', db);
}, {
  name: 'db',
  dependencies: ['env']
});
