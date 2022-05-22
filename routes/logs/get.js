'use strict';

const hashKey = require('../../lib/hash-key');

module.exports = async function (fastify) {
  // Rate limit log downloads
  fastify.register(require('@fastify/rate-limit'), {
    max: 30,
    timeWindow: '1 minute'
  });

  fastify.post('/getlog', async function (request, reply) {
    const logKey = request.body;
    const hashedKey1 = await hashKey(logKey);
    const hashedKey2 = await hashKey(hashedKey1);
    const logDecInfo = await fastify.db.prepare('SELECT iv FROM logs WHERE id = ? AND expires < DATETIME()').get(hashedKey2);
    if (!logDecInfo) {
      return reply.code(404).send(new Error('Log not found.'));
    }
    const { iv } = logDecInfo;
    return { iv, path: `/log/${hashedKey2}.tar.gz`, hash: hashedKey1 };
  });
};
