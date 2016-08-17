'use strict';

const Hoek = require('hoek');

exports.register = (server, options, next) => {

  const defaults = {
    namespace: 'cache',
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

  const routes = require('./routes')(options);
  const methods = require('./methods')(server, options);

  server.method(methods);
  server.route(routes);

  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
