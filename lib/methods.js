'use strict';

const Hoek = require('hoek');

module.exports = (server, options) => {

  return [
    {
      name: `${options.namespace}.invalidate`,
      method: (data, next) => {

        let method;

        data.forEach((invalidateObj) => {

          method = Hoek.reach(server.methods, invalidateObj.name);

          if (method && method.cache) {
            invalidateObj.keys.forEach((key) => {

              method.cache.drop(key, () => {});
            });
          }
        });

        next();
      }
    }
  ];
};
