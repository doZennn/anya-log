'use strict';

const path = require('path');
const AutoLoad = require('@fastify/autoload');

module.exports = async function (fastify, opts) {
  fastify.setErrorHandler(function (error, request, reply) {
    let statusCode = reply.statusCode;
    if (!statusCode) {
      statusCode = 500;
    }

    // Log error
    if (reply.statusCode < 500) {
      reply.log.info(
        { res: reply, err: error },
        error && error.message
      );
    } else {
      reply.log.error(
        { req: request, res: reply, err: error },
        error && error.message
      );
    }

    // Send error response
    reply.status(statusCode).headers(reply.headers).send({ error: error.message });
  });

  // Load plugins
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  });

  // Load routes
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  });
};
