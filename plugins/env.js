'use strict';

const fp = require('fastify-plugin');

const schema = {
  type: 'object',
  required: [
    'APP_NAME',
    'MAX_LOGS_MINUTE',
    'MAX_FILES',
    'MAX_FILES_SIZE',
    'KEY_DICTIONARY',
    'KEY_LENGTH',
    'HASH_SALT',
    'LOG_EXPIRE_TIME',
    'ANYALOG_SERVE_STATIC_FILES',
    'ANYALOG_USE_BUILTIN_CRON',
  ],
  properties: {
    APP_NAME: {
      type: 'string',
      default: 'AnyaLog'
    },
    BASE_COLOR: {
      type: 'string',
      pattern: '^\\d+, ?\\d+%$'
    },
    HASH_SALT: {
      type: 'string'
    },
    MAX_LOGS_MINUTE: {
      type: 'integer',
      default: 10
    },
    MAX_FILES_SIZE: {
      type: 'integer',
      default: 5 * 1000000
    },
    MAX_FILES: {
      type: 'integer',
      default: 20
    },
    KEY_DICTIONARY: {
      type: 'string',
      default: '346789ABCDEFGHJKLMNPQRTUVWXY'
    },
    KEY_LENGTH: {
      type: 'integer',
      default: 4,
      minimum: 4,
      maximum: 256
    },
    LOG_EXPIRE_TIME: {
      type: 'integer',
      default: 600
    },
    ANYALOG_SERVE_STATIC_FILES: {
      type: 'boolean',
      default: false
    },
    ANYALOG_USE_BUILTIN_CRON: {
      type: 'boolean',
      default: false
    },
  }
};

/**
 * @see https://github.com/fastify/fastify-env
 */
module.exports = fp(async function (fastify) {
  fastify.register(require('@fastify/env'), {
    dotenv: true,
    confKey: 'config',
    schema: schema,
    data: process.env
  });
}, {
  name: 'env'
});
