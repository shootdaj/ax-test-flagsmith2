const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../../src/app');
const { store } = require('../../src/store');
const { setApiKey } = require('../../src/auth');

const API_KEY = 'test-auth-scenario-key';
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

describe('Auth & Targeting Workflow Scenarios', () => {
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

  it('Scenario: API key required for evaluation but not for CRUD', async () => {
    // CRUD operations work without API key
    const created = await request('POST', '/api/flags', {
      name: 'auth-test',
      environments: { dev: true, staging: true, production: true }
    });
    assert.strictEqual(created.status, 201);

    const list = await request('GET', '/api/flags');
    assert.strictEqual(list.status, 200);

    // Evaluation fails without key
    const noKey = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    });
    assert.strictEqual(noKey.status, 401);

    // Evaluation fails with wrong key
    const wrongKey = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    }, { 'X-API-Key': 'wrong-key' });
    assert.strictEqual(wrongKey.status, 403);

    // Evaluation succeeds with correct key
    const goodKey = await request('POST', '/api/evaluate', {
      userId: 'user_1', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(goodKey.status, 200);
    assert.strictEqual(goodKey.body.flags['auth-test'], true);

    server.close();
  });

  it('Scenario: Get API key from /api/key endpoint', async () => {
    const res = await request('GET', '/api/key');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.api_key, API_KEY);
    server.close();
  });

  it('Scenario: Complex targeting with environment override', async () => {
    // Create flag: enabled in dev only, 50% rollout, with targeting rules
    await request('POST', '/api/flags', {
      name: 'complex-target',
      environments: { dev: true, staging: false, production: false },
      targeting: {
        percentage: 50,
        allowlist: ['beta_user'],
        blocklist: ['excluded_user']
      }
    });

    // Beta user in dev: true (allowlist)
    const betaDev = await request('POST', '/api/evaluate', {
      userId: 'beta_user', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(betaDev.body.flags['complex-target'], true);

    // Beta user in staging: false (env disabled overrides allowlist)
    const betaStaging = await request('POST', '/api/evaluate', {
      userId: 'beta_user', environment: 'staging'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(betaStaging.body.flags['complex-target'], false);

    // Excluded user in dev: false (blocklist)
    const excludedDev = await request('POST', '/api/evaluate', {
      userId: 'excluded_user', environment: 'dev'
    }, { 'X-API-Key': API_KEY });
    assert.strictEqual(excludedDev.body.flags['complex-target'], false);

    server.close();
  });
});
