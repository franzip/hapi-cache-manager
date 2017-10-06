'use strict';

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const JsonServer = require('json-server');
const Request = require('request');
const lab = exports.lab = Lab.script();

const expect = Code.expect;
const describe = lab.describe;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const jsonServer = JsonServer.create();

jsonServer.use(JsonServer.defaults());
jsonServer.use(JsonServer.router('./test/db.json'));

let server = new Hapi.Server({ debug: false });
server.connection();

let response;
let apiServer;

const testPlugin = {
  register: (srv, options, next) => {

    next();
  }
};

testPlugin.register.attributes = {
  name: 'testPlugin',
  version: '1.0.0'
};

before((done) => {

  server.method([
    {
      name: 'dog.get',
      method: (id, next) => {

        Request(`http://127.0.0.1:3000/dogs/${id}`, (err, res, body) => next(err || body));
      },
      options: {
        cache: {
          expiresIn: 100000,
          staleIn: 50000,
          staleTimeout: 1000,
          generateTimeout: 1000
        },
        generateKey: (opts) => JSON.stringify(opts)
      }
    },
    {
      name: 'cat.get',
      method: (id, next) => {

        Request(`http://127.0.0.1:3000/cats/${id}`, (err, res, body) => next(err || body));
      },
      options: {
        cache: {
          expiresIn: 100000,
          staleIn: 50000,
          staleTimeout: 1000,
          generateTimeout: 1000
        },
        generateKey: (opts) => JSON.stringify(opts)
      }
    }
  ]);

  server.route([
    {
      method: 'GET',
      path: '/dogs/{id}',
      config: {
        handler: (request, reply) => {

          request.server.methods.dog.get(request.params.id, (dog) => reply(dog));
        }
      }
    },
    {
      method: 'PATCH',
      path: '/dogs/{id}',
      config: {
        handler: (request, reply) => {

          Request({
            method: 'PATCH',
            url: `http://127.0.0.1:3000/dogs/${request.params.id}`,
            body: request.payload,
            json: true
          },
          (err, res, body) => reply(err || body)
          );
        }
      }
    },
    {
      method: 'PATCH',
      path: '/cats/{id}',
      config: {
        handler: (request, reply) => {

          Request({
            method: 'PATCH',
            url: `http://127.0.0.1:3000/cats/${request.params.id}`,
            body: request.payload,
            json: true
          },
          (err, res, body) => reply(err || body)
          );
        }
      }
    },
    {
      method: 'GET',
      path: '/cats/{id}',
      config: {
        handler: (request, reply) => {

          request.server.methods.cat.get(request.params.id, (cat) => reply(cat));
        }
      }
    }
  ]);

  server.register([
    testPlugin,
    { register: require('../'), options: { dependencies: 'testPlugin' } }
  ], (err) => {

    expect(err).to.not.exists();

    server.initialize((err) => {

      expect(err).to.not.exists();

      apiServer = jsonServer.listen(3000, done);
    });
  });
});

after((done) => {

  server = null;
  apiServer.close();
  done();
});

describe('Cache manager', () => {

  before((done) => {

    server.inject({ method: 'GET', url: '/dogs/1' }, (res) => {});
    server.inject({ method: 'GET', url: '/dogs/1' }, (res) => {});
    server.inject({ method: 'GET', url: '/dogs/1' }, (res) => {});
    server.inject({ method: 'GET', url: '/dogs/2' }, (res) => {});
    server.inject({ method: 'GET', url: '/cats/1' }, (res) => {});
    server.inject({ method: 'GET', url: '/cats/1' }, (res) => {});
    server.inject({ method: 'GET', url: '/cats/2' }, (res) => {});
    done();
  });

  after((done) => {

    server.inject({ method: 'PATCH', url: '/dogs/1', payload: { name: 'Hachiko' } }, (r) => {

      server.inject({ method: 'PATCH', url: '/dogs/2', payload: { name: 'Lessie' } }, (i) => {

        server.inject({ method: 'PATCH', url: '/cats/1', payload: { name: 'Ketty' } }, (s) => {

          server.inject({ method: 'PATCH', url: '/cats/2', payload: { name: 'Scarlett' } }, (z) => {

            done();
          });
        });
      });
    });
  });

  it('returns an empty object if the method does not exist', (done) => {

    server.inject({ method: 'GET', url: '/cache/statistics?name=foobar' }, (res) => {

      response = JSON.parse(res.payload);
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.contain('application/json');
      expect(response).to.equal({});
      done();
    });
  });

  it('returns cache statistics for a single method', (done) => {

    server.inject({ method: 'GET', url: '/cache/statistics?name=dog.get' }, (res) => {

      response = JSON.parse(res.payload);
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.contain('application/json');
      expect(response).to.equal({ sets: 0, gets: 4, hits: 0, stales: 0, generates: 2, errors: 0 });

      server.inject({ method: 'GET', url: '/cache/statistics?name=cat.get' }, (rs) => {

        response = JSON.parse(rs.payload);
        expect(rs.statusCode).to.equal(200);
        expect(rs.headers['content-type']).to.contain('application/json');
        expect(response).to.equal({ sets: 0, gets: 3, hits: 0, stales: 0, generates: 2, errors: 0 });

        done();
      });
    });
  });

  it('returns cache statistics for all registered methods', (done) => {

    server.inject({ method: 'GET', url: '/cache/statistics' }, (res) => {

      response = JSON.parse(res.payload);
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.contain('application/json');
      expect(response).to.equal({
        'dog.get': {
          sets: 0, gets: 4, hits: 0, stales: 0, generates: 2, errors: 0
        },
        'cat.get': {
          sets: 0, gets: 3, hits: 0, stales: 0, generates: 2, errors: 0
        }
      });
      done();
    });
  });

  it('invalidates a single key for a given method', (done) => {

    let body;

    body = { name: 'Aiko' };

    server.inject({ method: 'PATCH', url: '/dogs/1', payload: body }, (r) => {

      body = { data: [{ name: 'dog.get', keys: [1] }] };

      server.inject({ method: 'DELETE', url: '/cache/invalidate', payload: body }, (res) => {

        expect(res.statusCode).to.equal(204);

        server.inject({ method: 'GET', url: '/dogs/1' }, (rs) => {

          response = JSON.parse(rs.payload);
          expect(rs.statusCode).to.equal(200);
          expect(response).to.equal({ id: 1, name: 'Aiko' });

          server.inject({ method: 'GET', url: '/cache/statistics?name=dog.get' }, (rz) => {

            response = JSON.parse(rz.payload);
            expect(response.generates).to.equal(3);
            done();
          });
        });
      });
    });
  });

  it('invalidates multiple keys for a given method', (done) => {

    let body;

    body = { name: 'Cristal' };

    server.inject({ method: 'PATCH', url: '/cats/1', payload: body }, (r) => {

      body = { name: 'Aria' };

      server.inject({ method: 'PATCH', url: '/cats/2', payload: body }, (z) => {

        body = { data: [{ name: 'cat.get', keys: [1, 2] }] };

        server.inject({ method: 'DELETE', url: '/cache/invalidate', payload: body }, (res) => {

          expect(res.statusCode).to.equal(204);


          server.inject({ method: 'GET', url: '/cats/1' }, (rs) => {

            response = JSON.parse(rs.payload);
            expect(rs.statusCode).to.equal(200);
            expect(response).to.equal({ id: 1, name: 'Cristal' });

            server.inject({ method: 'GET', url: '/cats/2' }, (rz) => {

              response = JSON.parse(rz.payload);
              expect(rz.statusCode).to.equal(200);
              expect(response).to.equal({ id: 2, name: 'Aria' });

              server.inject({ method: 'GET', url: '/cache/statistics?name=cat.get' }, (rp) => {

                response = JSON.parse(rp.payload);
                expect(response.generates).to.equal(4);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('can be safely called for non existing methods', (done) => {

    let data = [{ name: 'foo.bar', keys: [1, 2] }];
    server.methods.cache.invalidate(data, (err, res) => {

      expect(err).to.not.exists();

      data = [{ name: 'baz.foo', keys: [1, 2] }, { name: 'bar.foo', keys: ['a', 'b'] }];

      server.methods.cache.invalidate(data, (err, rz) => {

        expect(err).to.not.exists();
        done();
      });
    });
  });

  it('exposes the plugin options', (done) => {

    expect(server.plugins['hapi-cache-manager'].options).to.exist();
    expect(server.plugins['hapi-cache-manager'].options.dependencies).to.equal('testPlugin');
    expect(Object.keys(server.registrations)).to.equal(['testPlugin', 'hapi-cache-manager']);
    done();

  });
});
