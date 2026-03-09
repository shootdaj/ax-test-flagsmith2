const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

const API_KEY = 'test-scenario-key';
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

describe('Full Workflow Scenarios', () => {
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

  it('Scenario: Create flag, enable for dev, evaluate, check analytics', async () => {
    // 1. Create a feature flag
    const created = await request('POST', '/api/flags', {
      name: 'dark-mode',
      description: 'Enable dark mode UI',
      enabled: false,
      environments: { dev: true, staging: false, production: false }
    });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.name, 'dark-mode');

    // 2. Verify it appears in the list
    const list = await request('GET', '/api/flags');
    assert.strictEqual(list.body.length, 1);
    assert.strictEqual(list.body[0].name, 'dark-mode');

    // 3. Evaluate for dev (should be true)
    const evalDev = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(evalDev.body.flags['dark-mode'], true);

    // 4. Evaluate for production (should be false)
    const evalProd = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'production'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(evalProd.body.flags['dark-mode'], false);

    // 5. Check analytics (2 evaluations: 1 true, 1 false)
    const analytics = await request('GET', `/api/flags/${created.body.id}/analytics`);
    assert.strictEqual(analytics.body.total_evaluations, 2);
    assert.strictEqual(analytics.body.true_count, 1);
    assert.strictEqual(analytics.body.false_count, 1);

    server.close();
  });

  it('Scenario: Targeting rules with percentage rollout', async () => {
    // 1. Create a flag with 50% rollout
    const created = await request('POST', '/api/flags', {
      name: 'new-checkout',
      description: 'New checkout flow',
      environments: { dev: true, staging: true, production: true },
      targeting: { percentage: 50, allowlist: [], blocklist: [] }
    });
    assert.strictEqual(created.status, 201);

    // 2. Evaluate for multiple users
    let trueCount = 0;
    const total = 100;
    for (let i = 0; i < total; i++) {
      const res = await request('POST', '/api/evaluate', {
        userId: `user_${i}`,
        environment: 'dev'
      }, { 'X-API-Key': API_KEY });
      if (res.body.flags['new-checkout']) trueCount++;
    }

    // 3. Roughly 50% should see the flag (allow wide margin due to small sample)
    assert.ok(trueCount > 20, `Expected ~50 true, got ${trueCount}`);
    assert.ok(trueCount < 80, `Expected ~50 true, got ${trueCount}`);

    // 4. Verify determinism: same user should get same result
    const eval1 = await request('POST', '/api/evaluate', {
      userId: 'user_42',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    const eval2 = await request('POST', '/api/evaluate', {
      userId: 'user_42',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(eval1.body.flags['new-checkout'], eval2.body.flags['new-checkout']);

    server.close();
  });

  it('Scenario: Allowlist and blocklist override percentage', async () => {
    // 1. Create flag with 0% rollout but with allowlist
    await request('POST', '/api/flags', {
      name: 'beta-feature',
      environments: { dev: true, staging: true, production: true },
      targeting: {
        percentage: 0,
        allowlist: ['vip_user'],
        blocklist: ['banned_user']
      }
    });

    // 2. VIP user should see it (allowlist overrides 0%)
    const vipEval = await request('POST', '/api/evaluate', {
      userId: 'vip_user',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(vipEval.body.flags['beta-feature'], true);

    // 3. Banned user should not see it
    const bannedEval = await request('POST', '/api/evaluate', {
      userId: 'banned_user',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(bannedEval.body.flags['beta-feature'], false);

    // 4. Regular user should not see it (0% rollout)
    const regularEval = await request('POST', '/api/evaluate', {
      userId: 'regular_user',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(regularEval.body.flags['beta-feature'], false);

    server.close();
  });

  it('Scenario: Full CRUD lifecycle', async () => {
    // 1. Create
    const created = await request('POST', '/api/flags', {
      name: 'lifecycle-flag',
      description: 'Will be updated then deleted'
    });
    assert.strictEqual(created.status, 201);
    const flagId = created.body.id;

    // 2. Read
    const read = await request('GET', `/api/flags/${flagId}`);
    assert.strictEqual(read.status, 200);
    assert.strictEqual(read.body.name, 'lifecycle-flag');

    // 3. Update
    const updated = await request('PUT', `/api/flags/${flagId}`, {
      name: 'renamed-flag',
      description: 'Updated description',
      enabled: true,
      environments: { dev: true, staging: true, production: false }
    });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.name, 'renamed-flag');
    assert.strictEqual(updated.body.enabled, true);
    assert.strictEqual(updated.body.environments.staging, true);

    // 4. Verify update persisted
    const readAfterUpdate = await request('GET', `/api/flags/${flagId}`);
    assert.strictEqual(readAfterUpdate.body.name, 'renamed-flag');

    // 5. Delete
    const deleted = await request('DELETE', `/api/flags/${flagId}`);
    assert.strictEqual(deleted.status, 204);

    // 6. Verify deleted
    const readAfterDelete = await request('GET', `/api/flags/${flagId}`);
    assert.strictEqual(readAfterDelete.status, 404);

    // 7. List should be empty
    const list = await request('GET', '/api/flags');
    assert.strictEqual(list.body.length, 0);

    server.close();
  });

  it('Scenario: Multiple flags with different environments', async () => {
    // Create two flags with different environment configs
    await request('POST', '/api/flags', {
      name: 'dev-only',
      environments: { dev: true, staging: false, production: false }
    });
    await request('POST', '/api/flags', {
      name: 'prod-ready',
      environments: { dev: true, staging: true, production: true }
    });

    // Evaluate for production
    const prodEval = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'production'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(prodEval.body.flags['dev-only'], false);
    assert.strictEqual(prodEval.body.flags['prod-ready'], true);

    // Evaluate for dev
    const devEval = await request('POST', '/api/evaluate', {
      userId: 'user_1',
      environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(devEval.body.flags['dev-only'], true);
    assert.strictEqual(devEval.body.flags['prod-ready'], true);

    server.close();
  });
});
