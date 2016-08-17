# Hapi Cache Manager

[**Hapi**](https://github.com/hapijs/hapi) Cache Manager plugin

Manage your [**Catbox**](https://github.com/hapijs/catbox) cache through REST endpoints and server methods.

### Plugin options

- `namespace` - (Default: `cache`) Namespace for methods registered by the plugin.
- `invalidate` - Cache invalidation options object
    - `path` - (Default: `/cache/invalidate`) Server endpoint to expose through DELETE method
    - `auth` - (Default: `false`) [**Hapi auth strategy**](https://github.com/hapijs/hapi/blob/master/API.md#serverauthstrategyname-scheme-mode-options) to use for cache invalidation endpoint
- `statistics` - Cache statistics options object
    - `path` - (Default: `/cache/statistics`) Server endpoint to expose through GET method
    - `auth` - (Default: `false`) [**Hapi auth strategy**](https://github.com/hapijs/hapi/blob/master/API.md#serverauthstrategyname-scheme-mode-options) to use for cache statistics endpoint

### Installation

```javascript
const Hapi = require('hapi');
const CacheManager = require('hapi-cache-manager');

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.register({
    register: CacheManager,
    options: {                        // default options 
        namespace: 'cache',           // server methods namespace
        invalidate: {
          path: 'cache/invalidate',   // cache invalidation endpoint
          auth: false                 // cache invalidation auth strategy
        },
        statistics: {
          path: 'cache/statistics',   // cache invalidation endpoint
          auth: false                 // cache invalidation auth strategy
        }
    }
}, (err) => {

    if (err) {
        throw err;
    }
});

server.start((err) => {
    if (err) {
      throw err;
    }
    console.log('Server started');
});

```

### Cache Statistics

You can get [cache statistics](https://github.com/hapijs/hapi/blob/master/API.md#servermethodname-method-options) for a single method or for all methods registered on the server:

```bash

# get statistics for all methods
curl http://localhost:3000/cache/statistics
# { 
#   'somemethod': { 
#     sets: 0, gets: 2, hits: 1, stales: 0, generates: 1, errors: 0 
#   }, 
#   'someothermethod': { ... } }

# get statistics for a single method
curl http://localhost:3000/cache/statistics\?name\=somemethod
# { 
#   sets: 0, gets: 3, hits: 2, stales: 0, generates: 1, errors: 0 
# }
```

### Cache Invalidation

You can drop as many cached keys for as many methods as you want with either a single external request or internally by calling a server method.

```javascript
const payload = {
    data: [
        { name: 'methodname', keys: ['blabla', '123'] },
        { name: 'someothermethodname', keys: ['abc'] },
        { ... }
    ]
};

// through REST
server.inject({ method: 'DELETE', url: '/cache/invalidate', payload: payload }, (res) => {
    console.log(res.statusCode)
    // 204
    console.log(res.payload == '');
    // true
});

// through server method
server.methods.cache.invalidate(payload, (err, res) => {
});
```

[MIT](http://opensource.org/licenses/MIT/ "MIT") Public License.
