const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

const API_KEY = 'test-analytics-key';
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
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('API Analytics', () => {
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

  it('should return analytics for a flag with no evaluations', async () => {
    const created = await request('POST', '/api/flags', { name: 'no-evals' });
    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.status, 200);
    assert.strictEqual(analytics.body.total_evaluations, 0);
    assert.strictEqual(analytics.body.true_count, 0);
    assert.strictEqual(analytics.body.false_count, 0);
    assert.strictEqual(analytics.body.true_ratio, 0);
    assert.strictEqual(analytics.body.false_ratio, 0);
    server.close();
  });

  it('should track true evaluations', async () => {
    const created = await request('POST', '/api/flags', {
      name: 'track-true',
      environments: { dev: true, staging: true, production: true }
    });

    // Evaluate 3 times (all true)
    for (let i = 0; i < 3; i++) {
      await request('POST', '/api/evaluate', {
        userId: `user_${i}`, environment: 'dev'
      }, { 'X-API-Key': API_KEY });
    }

    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.body.total_evaluations, 3);
    assert.strictEqual(analytics.body.true_count, 3);
    assert.strictEqual(analytics.body.false_count, 0);
    assert.strictEqual(analytics.body.true_ratio, 1);
    server.close();
  });

  it('should track mixed true/false evaluations', async () => {
    const created = await request('POST', '/api/flags', {
      name: 'track-mixed',
      environments: { dev: true, staging: false, production: false }
    });

    // Evaluate in dev (true) and staging (false)
    await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'staging'
    }, { 'X-API-Key': API_KEY });

    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.body.total_evaluations, 2);
    assert.strictEqual(analytics.body.true_count, 1);
    assert.strictEqual(analytics.body.false_count, 1);
    assert.strictEqual(analytics.body.true_ratio, 0.5);
    server.close();
  });

  it('should return 404 for analytics of non-existent flag', async () => {
    const analytics = await request('GET', '/api/flags/nonexistent/analytics');
    assert.strictEqual(analytics.status, 404);
    server.close();
  });

  it('should include flag name in analytics', async () => {
    const created = await request('POST', '/api/flags', { name: 'named-flag' });
    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.body.flag_name, 'named-flag');
    assert.strictEqual(analytics.body.flag_id, created.body.id);
    server.close();
  });

  it('should return API key from /api/key', async () => {
    const res = await request('GET', '/api/key');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.api_key, API_KEY);
    server.close();
  });

  it('should serve dashboard HTML at root', async () => {
    const res = await request('GET', '/');
    assert.strictEqual(res.status, 200);
    // Body is HTML string, not JSON
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.includes('Feature Flag'));
    server.close();
  });
});
