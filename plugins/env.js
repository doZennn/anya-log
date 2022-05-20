'use strict';

const fp = require('fastify-plugin');

const schema = {
  type: 'object',
  required: [
    'APP_NAME',
    'MAX_LOGS_MINUTE',
    'MAX_SIZE_LOGS',
    'KEY_DICTIONARY',
    'KEY_LENGTH',
    'HASH_SALT',
    'LOG_EXPIRE_TIME',
    'ANYALOG_SERVE_STATIC_FILES'
  ],
  properties: {
    APP_NAME: {
      type: 'string',
      default: 'AnyaLog'
    },
    HASH_SALT: {
      type: 'string'
    },
    MAX_LOGS_MINUTE: {
      type: 'integer',
      default: 10
    },
    MAX_SIZE_LOGS: {
      type: 'integer',
      default: 5 * 1000000
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
