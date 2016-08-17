'use strict';

const Joi = require('joi');
const Hoek = require('hoek');

const internals = {};

const getAllMethodsNames = (methods) => {

  const names = [];

  const resolveNamespace = (namespace, acc) => {

    const methodObj = Hoek.reach(methods, namespace);

    if (methodObj.cache) {
      acc.push(namespace);
    }
    else {
      Object.keys(methodObj).forEach((key) => {

        resolveNamespace(`${namespace}.${key}`, acc);
      });
    }
  };

  Object.keys(methods).forEach((namespace) => {

    resolveNamespace(namespace, names);
  });

  return names;
};

internals.invalidate = {
  validate: {
    payload: {
      data: Joi.array().items(
        Joi.object().keys({
          name: Joi.string().required(),
          keys: Joi.array().min(1).required()
        })
      ).required()
    }
  },
  handler: (request, reply) => reply().code(204)
};

internals.statistics = {
  validate: {
    query: {
      name: Joi.string().optional()
    }
  },
  handler: (request, reply) => {

    const name = request.query.name;

    let method;
    let statistics = {};

    if (name) {
      method = Hoek.reach(request.server.methods, name);
      if (method && method.cache) {
        statistics = method.cache.stats;
      }
    }
    else {
      const methods = getAllMethodsNames(request.server.methods);

      methods.forEach((namespace) => {

        method = Hoek.reach(request.server.methods, namespace);
        statistics[namespace] = method.cache.stats;
      });
    }

    return reply(statistics);
  }
};

module.exports = (options) => {

  internals.statistics.auth = options.statistics.auth;
  internals.invalidate.auth = options.invalidate.auth;
  internals.invalidate.pre = [`${options.namespace}.invalidate(payload.data)`];

  return [
    {
      method: 'DELETE',
      path: `/${options.invalidate.path}`,
      config: internals.invalidate
    },
    {
      method: 'GET',
      path: `/${options.statistics.path}`,
      config: internals.statistics
    }
  ];
};
