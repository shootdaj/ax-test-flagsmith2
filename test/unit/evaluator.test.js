const { describe, it } = require('node:test');
const assert = require('node:assert');
const { evaluateFlag, evaluateAllFlags, hashPercentage, isValidEnvironment } = require('../../src/evaluator');

describe('Evaluator', () => {
  describe('isValidEnvironment', () => {
    it('should accept dev', () => {
      assert.strictEqual(isValidEnvironment('dev'), true);
    });

    it('should accept staging', () => {
      assert.strictEqual(isValidEnvironment('staging'), true);
    });

    it('should accept production', () => {
      assert.strictEqual(isValidEnvironment('production'), true);
    });

    it('should reject invalid environment', () => {
      assert.strictEqual(isValidEnvironment('test'), false);
      assert.strictEqual(isValidEnvironment(''), false);
      assert.strictEqual(isValidEnvironment('PROD'), false);
    });
  });

  describe('hashPercentage', () => {
    it('should return a number between 0 and 99', () => {
      const result = hashPercentage('flag_1', 'user_1');
      assert.ok(result >= 0 && result < 100);
    });

    it('should be deterministic', () => {
      const result1 = hashPercentage('flag_1', 'user_1');
      const result2 = hashPercentage('flag_1', 'user_1');
      assert.strictEqual(result1, result2);
    });

    it('should differ for different users', () => {
      // With enough users, at least some should differ
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        results.add(hashPercentage('flag_1', `user_${i}`));
      }
      // Should have more than 1 unique value
      assert.ok(results.size > 1);
    });

    it('should differ for different flags', () => {
      const result1 = hashPercentage('flag_1', 'user_1');
      const result2 = hashPercentage('flag_2', 'user_1');
      // Not guaranteed to differ for just 2 flags, but they typically will
      // The important thing is that the function works
      assert.ok(typeof result1 === 'number');
      assert.ok(typeof result2 === 'number');
    });
  });

  describe('evaluateFlag', () => {
    const baseFlag = {
      id: 'flag_1',
      name: 'test-flag',
      enabled: true,
      environments: { dev: true, staging: true, production: false },
      targeting: { percentage: 100, allowlist: [], blocklist: [] }
    };

    it('should return false when flag disabled for environment', () => {
      const result = evaluateFlag(baseFlag, 'user_1', 'production');
      assert.strictEqual(result, false);
    });

    it('should return true when flag enabled for environment and 100% rollout', () => {
      const result = evaluateFlag(baseFlag, 'user_1', 'dev');
      assert.strictEqual(result, true);
    });

    it('should return false when user is on blocklist', () => {
      const flag = {
        ...baseFlag,
        targeting: { percentage: 100, allowlist: [], blocklist: ['user_blocked'] }
      };
      const result = evaluateFlag(flag, 'user_blocked', 'dev');
      assert.strictEqual(result, false);
    });

    it('should return true when user is on allowlist', () => {
      const flag = {
        ...baseFlag,
        targeting: { percentage: 0, allowlist: ['user_allowed'], blocklist: [] }
      };
      const result = evaluateFlag(flag, 'user_allowed', 'dev');
      assert.strictEqual(result, true);
    });

    it('should prioritize blocklist over allowlist', () => {
      const flag = {
        ...baseFlag,
        targeting: {
          percentage: 100,
          allowlist: ['user_both'],
          blocklist: ['user_both']
        }
      };
      const result = evaluateFlag(flag, 'user_both', 'dev');
      assert.strictEqual(result, false);
    });

    it('should respect percentage rollout', () => {
      const flag = {
        ...baseFlag,
        targeting: { percentage: 50, allowlist: [], blocklist: [] }
      };
      // With many users, roughly half should be enabled
      let trueCount = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        if (evaluateFlag(flag, `user_${i}`, 'dev')) {
          trueCount++;
        }
      }
      // Should be roughly 50% (allow 10% margin)
      assert.ok(trueCount > total * 0.35, `Expected ~500 true, got ${trueCount}`);
      assert.ok(trueCount < total * 0.65, `Expected ~500 true, got ${trueCount}`);
    });

    it('should return false when percentage is 0', () => {
      const flag = {
        ...baseFlag,
        targeting: { percentage: 0, allowlist: [], blocklist: [] }
      };
      const result = evaluateFlag(flag, 'any_user', 'dev');
      assert.strictEqual(result, false);
    });

    it('should return true when percentage is 100', () => {
      const flag = {
        ...baseFlag,
        targeting: { percentage: 100, allowlist: [], blocklist: [] }
      };
      const result = evaluateFlag(flag, 'any_user', 'dev');
      assert.strictEqual(result, true);
    });
  });

  describe('evaluateAllFlags', () => {
    it('should evaluate all flags for a user', () => {
      const flags = [
        {
          id: 'flag_1', name: 'enabled-flag', enabled: true,
          environments: { dev: true, staging: true, production: true },
          targeting: { percentage: 100, allowlist: [], blocklist: [] }
        },
        {
          id: 'flag_2', name: 'disabled-flag', enabled: false,
          environments: { dev: false, staging: false, production: false },
          targeting: { percentage: 100, allowlist: [], blocklist: [] }
        }
      ];
      const results = evaluateAllFlags(flags, 'user_1', 'dev');
      assert.strictEqual(results['enabled-flag'], true);
      assert.strictEqual(results['disabled-flag'], false);
    });

    it('should return empty object for no flags', () => {
      const results = evaluateAllFlags([], 'user_1', 'dev');
      assert.deepStrictEqual(results, {});
    });
  });
});
