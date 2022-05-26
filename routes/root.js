'use strict';

const { resolve } = require('path');
const fs = require('fs');
const crypto = require('crypto');

const style = fs.readFileSync(resolve('public', 'style.css'));
const script = fs.readFileSync(resolve('public', 'anyalog.js'));
const styleHash = crypto.createHash('sha1').update(style.toString()).digest('hex').substring(0, 6);
const scriptHash = crypto.createHash('sha1').update(script.toString()).digest('hex').substring(0, 6);

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
      baseColor: fastify.config.BASE_COLOR,
      appName: fastify.config.APP_NAME,
    });
  });
};
