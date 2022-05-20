'use strict';

const fp = require('fastify-plugin');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

module.exports = fp(async function (fastify) {
  if (fastify.config.ANYALOG_USE_BUILTIN_CRON) {
    fastify.register(require('fastify-cron'), {
      jobs: [
        {
          cronTime: '* * * * *', // every minute
          start: true,
          onTick: async () => {
            await exec('npm run clear-logs');
          },
        }
      ]
    });
  }
}, {
  dependencies: ['env']
});
