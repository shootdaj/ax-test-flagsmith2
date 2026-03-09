const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

const API_KEY = 'test-api-key-eval';
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

describe('API Evaluation', () => {
  beforeEach(() => {
    store.clear();
    setApiKey(API_KEY);
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

  it('should reject evaluation without API key', async () => {
    const res = await request('POST', '/api/evaluate', { userId: 'user_1' });
    assert.strictEqual(res.status, 401);
    server.close();
  });

  it('should reject evaluation with wrong API key', async () => {
    const res = await request('POST', '/api/evaluate', { userId: 'user_1' }, {
      'X-API-Key': 'wrong-key'
    });
    assert.strictEqual(res.status, 403);
    server.close();
  });

  it('should require userId', async () => {
    const res = await request('POST', '/api/evaluate', {}, {
      'X-API-Key': API_KEY
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('userId'));
    server.close();
  });

  it('should reject invalid environment', async () => {
    const res = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'invalid'
    }, {
      'X-API-Key': API_KEY
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Invalid environment'));
    server.close();
  });

  it('should evaluate flags for a user', async () => {
    // Create a flag that's enabled for dev
    await request('POST', '/api/flags', {
      name: 'test-flag',
      enabled: true,
      environments: { dev: true, staging: false, production: false }
    });

    const res = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'dev'
    }, {
      'X-API-Key': API_KEY
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.userId, 'user_1');
    assert.strictEqual(res.body.environment, 'dev');
    assert.strictEqual(res.body.flags['test-flag'], true);
    assert.ok(res.body.evaluated_at);
    server.close();
  });

  it('should evaluate flags per environment', async () => {
    await request('POST', '/api/flags', {
      name: 'env-flag',
      environments: { dev: true, staging: false, production: false }
    });

    const devRes = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });

    const stagingRes = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'staging'
    }, { 'X-API-Key': API_KEY });

    assert.strictEqual(devRes.body.flags['env-flag'], true);
    assert.strictEqual(stagingRes.body.flags['env-flag'], false);
    server.close();
  });

  it('should apply blocklist in evaluation', async () => {
    await request('POST', '/api/flags', {
      name: 'block-test',
      environments: { dev: true, staging: true, production: true },
      targeting: { percentage: 100, allowlist: [], blocklist: ['blocked_user'] }
    });

    const res = await request('POST', '/api/evaluate', {
      userId: 'blocked_user',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });

    assert.strictEqual(res.body.flags['block-test'], false);
    server.close();
  });

  it('should apply allowlist in evaluation', async () => {
    await request('POST', '/api/flags', {
      name: 'allow-test',
      environments: { dev: true, staging: true, production: true },
      targeting: { percentage: 0, allowlist: ['vip_user'], blocklist: [] }
    });

    const res = await request('POST', '/api/evaluate', {
      userId: 'vip_user',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });

    assert.strictEqual(res.body.flags['allow-test'], true);
    server.close();
  });

  it('should record evaluation analytics', async () => {
    const created = await request('POST', '/api/flags', {
      name: 'analytics-test',
      environments: { dev: true, staging: true, production: true },
      targeting: { percentage: 100, allowlist: [], blocklist: [] }
    });

    // Evaluate
    await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });

    // Check analytics
    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.status, 200);
    assert.strictEqual(analytics.body.total_evaluations, 1);
    assert.strictEqual(analytics.body.true_count, 1);
    server.close();
  });

  it('should allow CRUD without API key', async () => {
    // Create without API key should work
    const created = await request('POST', '/api/flags', { name: 'no-auth-needed' });
    assert.strictEqual(created.status, 201);

    // List without API key should work
    const list = await request('GET', '/api/flags');
    assert.strictEqual(list.status, 200);

    // Update without API key should work
    const updated = await request('PUT', `/api/flags/${created.body.id}`, { name: 'updated' });
    assert.strictEqual(updated.status, 200);

    // Delete without API key should work
    const deleted = await request('DELETE', `/api/flags/${created.body.id}`);
    assert.strictEqual(deleted.status, 204);
    server.close();
  });
});
