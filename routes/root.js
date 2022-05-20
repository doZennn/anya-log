'use strict';

module.exports = async function (fastify) {
  fastify.register(require('point-of-view'), {
    engine: {
      ejs: require('ejs'),
    },
    // layout: './templates/layout.ejs',
  });

  fastify.get('/', async function (request, reply) {
    return reply.view('./templates/index.ejs', {
      appName: fastify.config.APP_NAME,
    });
  });
};
