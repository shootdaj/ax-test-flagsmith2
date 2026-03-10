const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

const API_KEY = 'test-dashboard-key';
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

describe('Dashboard Workflow Scenarios', () => {
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

  it('Scenario: Dashboard serves static files', async () => {
    // Root should serve HTML
    const html = await request('GET', '/');
    assert.strictEqual(html.status, 200);
    assert.ok(typeof html.body === 'string');
    assert.ok(html.body.includes('Feature Flag'));

    server.close();
  });

  it('Scenario: Full dashboard workflow — create, toggle, analytics', async () => {
    // 1. Create a flag via API (simulating dashboard form submit)
    const created = await request('POST', '/api/flags', {
      name: 'dashboard-test',
      description: 'Created from dashboard',
      environments: { dev: true, staging: false, production: false },
      targeting: { percentage: 100, allowlist: [], blocklist: [] }
    });
    assert.strictEqual(created.status, 201);

    // 2. List flags (dashboard loads this on init)
    const list = await request('GET', '/api/flags');
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.body.length, 1);
    assert.strictEqual(list.body[0].name, 'dashboard-test');

    // 3. Toggle flag via environment update (simulating dashboard toggle)
    const toggled = await request('PUT', `/api/flags/${created.body.id}`, {
      environments: { staging: true }
    });
    assert.strictEqual(toggled.status, 200);
    assert.strictEqual(toggled.body.environments.staging, true);

    // 4. Evaluate to generate analytics
    await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    await request('POST', '/api/evaluate', {
      userId: 'user_2', environment: 'staging'
    }, { 'X-API-Key': API_KEY });

    // 5. Check analytics (dashboard analytics modal)
    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.status, 200);
    assert.strictEqual(analytics.body.total_evaluations, 2);
    assert.strictEqual(analytics.body.true_count, 2); // both should be true now

    // 6. Get API key (displayed in dashboard footer)
    const key = await request('GET', '/api/key');
    assert.strictEqual(key.status, 200);
    assert.ok(key.body.api_key);

    server.close();
  });

  it('Scenario: Edit flag targeting from dashboard', async () => {
    // Create initial flag
    const created = await request('POST', '/api/flags', {
      name: 'edit-targeting',
      environments: { dev: true, staging: true, production: true },
      targeting: { percentage: 100, allowlist: [], blocklist: [] }
    });

    // Edit targeting rules (simulating dashboard edit form)
    const updated = await request('PUT', `/api/flags/${created.body.id}`, {
      targeting: {
        percentage: 50,
        allowlist: ['vip_user'],
        blocklist: ['bad_user']
      }
    });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.targeting.percentage, 50);
    assert.deepStrictEqual(updated.body.targeting.allowlist, ['vip_user']);
    assert.deepStrictEqual(updated.body.targeting.blocklist, ['bad_user']);

    // Verify targeting is applied in evaluation
    const vipEval = await request('POST', '/api/evaluate', {
      userId: 'vip_user', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(vipEval.body.flags['edit-targeting'], true);

    const badEval = await request('POST', '/api/evaluate', {
      userId: 'bad_user', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(badEval.body.flags['edit-targeting'], false);

    server.close();
  });

  it('Scenario: Environment switcher — same flag different results', async () => {
    // Create flag enabled only in dev
    await request('POST', '/api/flags', {
      name: 'dev-feature',
      environments: { dev: true, staging: false, production: false }
    });

    // Evaluate in each environment
    const devEval = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    const stagingEval = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'staging'
    }, { 'X-API-Key': API_KEY });
    const prodEval = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'production'
    }, { 'X-API-Key': API_KEY });

    assert.strictEqual(devEval.body.flags['dev-feature'], true);
    assert.strictEqual(stagingEval.body.flags['dev-feature'], false);
    assert.strictEqual(prodEval.body.flags['dev-feature'], false);

    server.close();
  });
});
