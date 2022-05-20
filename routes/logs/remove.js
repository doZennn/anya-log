'use strict';

const hashKey = require('../../lib/hash-key');

module.exports = async function (fastify) {
  // Rate limit log deletes
  fastify.register(require('@fastify/rate-limit'), {
    max: 8,
    timeWindow: '1 minute'
  });

  fastify.delete('/', async function (request, reply) {
    const deleteKey = request.body;
    const splitKeys = deleteKey.split(':');
    if (splitKeys.length > 2) {
      return reply.code(400).send(new Error('Invalid delete key.'));
    }
    const hashedKey1 = await hashKey(splitKeys[0]);
    const hashedKey2 = await hashKey(hashedKey1);
    const logDecInfo = await fastify.db.prepare(`
      SELECT id
      FROM logs
      WHERE
        deleted = 0
        AND id = ?
        AND delkey = ?
    `).get(hashedKey2, splitKeys[1]);
    if (!logDecInfo) {
      return reply.code(404).send(new Error('Invalid delete key.'));
    }

    // Mark as "deleted" and change date, let cron do the actual deleting
    await fastify.db.prepare(`
      UPDATE logs
      SET
        expires = DATETIME(),
        deleted = 1
      WHERE
        id = ?
        AND delkey = ?
    `).run(hashedKey2, splitKeys[1]);

    return reply.code(204).send('');
  });
};
