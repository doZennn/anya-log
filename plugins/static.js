'use strict';

const fp = require('fastify-plugin');
const path = require('path');
const fs = require('fs');

module.exports = fp(async function (fastify) {
  if (fastify.config.ANYALOG_SERVE_STATIC_FILES) {
    fastify.register(require('@fastify/static'), {
      root: path.resolve('public'),
      prefix: '/',
      index: false,
      decorateReply: false,
      dotfiles: 'ignore',
    });

    fastify.get('/log/:file', function (req, reply) {
      if (!/^[\da-f]{64}\.tar\.gz$/.test(req.params.file)) {
        return reply.callNotFound();
      }
      const filePath = path.resolve('public', `log/${req.params.file.substring(0, 2)}/${req.params.file.substring(2, 4)}/${req.params.file}`);
      if (!fs.existsSync(filePath)) {
        return reply.callNotFound();
      }
      fs.readFile(filePath, (err, fileBuffer) => {
        reply.send(err || fileBuffer);
      });
    });
  }
}, {
  dependencies: ['env']
});
