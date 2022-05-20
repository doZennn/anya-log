'use strict';

const { resolve } = require('path');
const fs = require('fs');
const crypto = require('crypto');

let { mtimeMs: styleHash } = fs.statSync(resolve('public', 'style.css'));
let { mtimeMs: scriptHash } = fs.statSync(resolve('public', 'anyalog.js'));
styleHash = crypto.createHash('sha1').update(styleHash.toString()).digest('hex').substring(0, 6);
scriptHash = crypto.createHash('sha1').update(scriptHash.toString()).digest('hex').substring(0, 6);

module.exports = async function (fastify) {
  fastify.register(require('point-of-view'), {
    engine: {
      ejs: require('ejs'),
    },
    // layout: './templates/layout.ejs',
  });

  fastify.get('/', async function (request, reply) {
    return reply.view('./templates/index.ejs', {
      styleHash,
      scriptHash,
      appName: fastify.config.APP_NAME,
    });
  });
};
