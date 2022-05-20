'use strict';

const fp = require('fastify-plugin');
const path = require('path');
const fs = require('fs');

module.exports = fp(async function (fastify) {
  if (fastify.config.ANYALOG_SERVE_STATIC_FILES) {
    fastify.register(require('@fastify/static'), {
      root: path.resolve('public'),
      prefix: '/',
      index: false
    });

    fastify.get('/log/:file', function (req, reply) {
      if (!/^[\da-f]{64}\.tar\.gz$/.test(req.params.file)) {
        return reply.callNotFound();
      }
      const filePath = `log/${req.params.file.substring(0, 2)}/${req.params.file.substring(2, 4)}/${req.params.file}`;
      if (!fs.existsSync(path.resolve('public', filePath))) {
        return reply.callNotFound();
      }

      reply.download(filePath);
      return reply.send(); // workaround for ERR_STREAM_PREMATURE_CLOSE https://github.com/fastify/fastify-static/issues/116
    });
  }
}, {
  dependencies: ['env']
});
