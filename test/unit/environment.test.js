const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { FlagStore } = require('../../src/store');
const { evaluateFlag, isValidEnvironment, VALID_ENVIRONMENTS } = require('../../src/evaluator');

describe('Environment Scoping', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('Environment Validation', () => {
    it('should list three valid environments', () => {
      assert.deepStrictEqual(VALID_ENVIRONMENTS, ['dev', 'staging', 'production']);
    });

    it('should accept all valid environments', () => {
      for (const env of VALID_ENVIRONMENTS) {
        assert.strictEqual(isValidEnvironment(env), true, `${env} should be valid`);
      }
    });

    it('should reject invalid environments', () => {
      const invalid = ['test', 'Development', 'STAGING', 'prod', '', null, undefined];
      for (const env of invalid) {
        assert.strictEqual(isValidEnvironment(env), false, `${env} should be invalid`);
      }
    });
  });

  describe('Flag Environment State', () => {
    it('should create flag with per-environment state', () => {
      const flag = store.create({
        name: 'env-test',
        environments: { dev: true, staging: false, production: false }
      });
      assert.deepStrictEqual(flag.environments, {
        dev: true,
        staging: false,
        production: false
      });
    });

    it('should update environment-specific state', () => {
      const flag = store.create({
        name: 'env-test',
        environments: { dev: true, staging: false, production: false }
      });
      const updated = store.update(flag.id, {
        environments: { staging: true }
      });
      assert.strictEqual(updated.environments.dev, true);
      assert.strictEqual(updated.environments.staging, true);
      assert.strictEqual(updated.environments.production, false);
    });

    it('should default enabled environments based on enabled flag', () => {
      const enabledFlag = store.create({ name: 'enabled', enabled: true });
      assert.strictEqual(enabledFlag.environments.dev, true);

      const disabledFlag = store.create({ name: 'disabled', enabled: false });
      assert.strictEqual(disabledFlag.environments.dev, false);
    });
  });

  describe('Environment-Scoped Evaluation', () => {
    it('should evaluate differently per environment', () => {
      const flag = {
        id: 'flag_env',
        name: 'feature',
        enabled: true,
        environments: { dev: true, staging: true, production: false },
        targeting: { percentage: 100, allowlist: [], blocklist: [] }
      };

      assert.strictEqual(evaluateFlag(flag, 'user_1', 'dev'), true);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'staging'), true);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'production'), false);
    });

    it('should disable in all environments when all are false', () => {
      const flag = {
        id: 'flag_off',
        name: 'off-feature',
        enabled: false,
        environments: { dev: false, staging: false, production: false },
        targeting: { percentage: 100, allowlist: [], blocklist: [] }
      };

      assert.strictEqual(evaluateFlag(flag, 'user_1', 'dev'), false);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'staging'), false);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'production'), false);
    });

    it('should enable in all environments when all are true', () => {
      const flag = {
        id: 'flag_on',
        name: 'on-feature',
        enabled: true,
        environments: { dev: true, staging: true, production: true },
        targeting: { percentage: 100, allowlist: [], blocklist: [] }
      };

      assert.strictEqual(evaluateFlag(flag, 'user_1', 'dev'), true);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'staging'), true);
      assert.strictEqual(evaluateFlag(flag, 'user_1', 'production'), true);
    });
  });
});
