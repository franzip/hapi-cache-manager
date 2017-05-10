'use strict';

const Hoek = require('hoek');
const Pkg = require('../package.json');

const internals = {};

internals.after = (server, next) => {

  const options = server.plugins[Pkg.name].options;

  const routes = require('./routes')(options);
  const methods = require('./methods')(server, options);

  server.method(methods);
  server.route(routes);

  next();
};

exports.register = (server, options, next) => {

  const defaults = {
    namespace: 'cache',
    dependency: [],
    invalidate: {
      path: 'cache/invalidate',
      auth: false
    },
    statistics: {
      path: 'cache/statistics',
      auth: false
    }
  };

  options = Hoek.applyToDefaults(defaults, options);

  Hoek.assert(typeof options.namespace === 'string', 'options.namespace must be a string');
  Hoek.assert(typeof options.invalidate.path === 'string', 'options.invalidate.path must be a string');
  Hoek.assert(typeof options.statistics.path === 'string', 'options.statistics.path must be a string');

  server.expose('options', options);
  server.dependency(options.dependency, internals.after);

  next();
};

exports.register.attributes = {
  pkg: Pkg
};
