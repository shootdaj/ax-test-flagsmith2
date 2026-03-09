const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('API Flag CRUD', () => {
  beforeEach((t) => {
    store.clear();
    setApiKey('test-api-key-123');
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  // We need to close the server after each test to free the port
  // Instead, let's use a single describe with sequential tests

  it('should return health check', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
    server.close();
  });

  it('should create a flag', async () => {
    const res = await request('POST', '/api/flags', {
      name: 'new-feature',
      description: 'A new feature flag',
      enabled: true
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'new-feature');
    assert.strictEqual(res.body.description, 'A new feature flag');
    assert.strictEqual(res.body.enabled, true);
    assert.ok(res.body.id);
    assert.ok(res.body.created_at);
    server.close();
  });

  it('should reject creating a flag without a name', async () => {
    const res = await request('POST', '/api/flags', {});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
    server.close();
  });

  it('should list all flags', async () => {
    await request('POST', '/api/flags', { name: 'flag-1' });
    await request('POST', '/api/flags', { name: 'flag-2' });
    const res = await request('GET', '/api/flags');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 2);
    server.close();
  });

  it('should get a flag by ID', async () => {
    const created = await request('POST', '/api/flags', { name: 'find-me' });
    const res = await request('GET', `/api/flags/${created.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'find-me');
    server.close();
  });

  it('should return 404 for non-existent flag', async () => {
    const res = await request('GET', '/api/flags/nonexistent');
    assert.strictEqual(res.status, 404);
    server.close();
  });

  it('should update a flag', async () => {
    const created = await request('POST', '/api/flags', { name: 'old-name' });
    const res = await request('PUT', `/api/flags/${created.body.id}`, {
      name: 'new-name',
      enabled: true
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'new-name');
    assert.strictEqual(res.body.enabled, true);
    server.close();
  });

  it('should return 404 when updating non-existent flag', async () => {
    const res = await request('PUT', '/api/flags/nonexistent', { name: 'test' });
    assert.strictEqual(res.status, 404);
    server.close();
  });

  it('should delete a flag', async () => {
    const created = await request('POST', '/api/flags', { name: 'delete-me' });
    const res = await request('DELETE', `/api/flags/${created.body.id}`);
    assert.strictEqual(res.status, 204);

    const check = await request('GET', `/api/flags/${created.body.id}`);
    assert.strictEqual(check.status, 404);
    server.close();
  });

  it('should return 404 when deleting non-existent flag', async () => {
    const res = await request('DELETE', '/api/flags/nonexistent');
    assert.strictEqual(res.status, 404);
    server.close();
  });
});
