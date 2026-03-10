const { describe, it } = require('node:test');
const assert = require('node:assert');
const { evaluateFlag, hashPercentage } = require('../../src/evaluator');

describe('Targeting Rules', () => {
  const makeFlag = (targeting, environments = { dev: true, staging: true, production: true }) => ({
    id: 'flag_target',
    name: 'target-flag',
    enabled: true,
    environments,
    targeting
  });

  describe('Percentage Rollout', () => {
    it('should enable for 100% rollout', () => {
      const flag = makeFlag({ percentage: 100, allowlist: [], blocklist: [] });
      // All users should get true
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(evaluateFlag(flag, `user_${i}`, 'dev'), true);
      }
    });

    it('should disable for 0% rollout', () => {
      const flag = makeFlag({ percentage: 0, allowlist: [], blocklist: [] });
      // All users should get false
      for (let i = 0; i < 10; i++) {
        assert.strictEqual(evaluateFlag(flag, `user_${i}`, 'dev'), false);
      }
    });

    it('should approximately match rollout percentage', () => {
      const flag = makeFlag({ percentage: 25, allowlist: [], blocklist: [] });
      let trueCount = 0;
      const total = 10000;
      for (let i = 0; i < total; i++) {
        if (evaluateFlag(flag, `user_${i}`, 'dev')) trueCount++;
      }
      const ratio = trueCount / total;
      // Should be close to 25% (within 5% margin)
      assert.ok(ratio > 0.20, `Expected ~25%, got ${(ratio * 100).toFixed(1)}%`);
      assert.ok(ratio < 0.30, `Expected ~25%, got ${(ratio * 100).toFixed(1)}%`);
    });

    it('should be deterministic per userId', () => {
      const flag = makeFlag({ percentage: 50, allowlist: [], blocklist: [] });
      // Same user always gets same result
      for (let i = 0; i < 20; i++) {
        const result1 = evaluateFlag(flag, 'consistent_user', 'dev');
        const result2 = evaluateFlag(flag, 'consistent_user', 'dev');
        assert.strictEqual(result1, result2, 'Same user should get same result');
      }
    });

    it('hash should produce consistent results', () => {
      const h1 = hashPercentage('flag_1', 'user_42');
      const h2 = hashPercentage('flag_1', 'user_42');
      assert.strictEqual(h1, h2);
    });

    it('hash should distribute across 0-99 range', () => {
      const results = new Set();
      for (let i = 0; i < 1000; i++) {
        results.add(hashPercentage('flag_1', `user_${i}`));
      }
      // Should cover most of the 0-99 range
      assert.ok(results.size > 80, `Expected good distribution, got ${results.size} unique values`);
    });
  });

  describe('Allowlist', () => {
    it('should enable for allowlisted user regardless of percentage', () => {
      const flag = makeFlag({
        percentage: 0,
        allowlist: ['vip_1', 'vip_2', 'vip_3'],
        blocklist: []
      });
      assert.strictEqual(evaluateFlag(flag, 'vip_1', 'dev'), true);
      assert.strictEqual(evaluateFlag(flag, 'vip_2', 'dev'), true);
      assert.strictEqual(evaluateFlag(flag, 'vip_3', 'dev'), true);
    });

    it('should not affect non-allowlisted users', () => {
      const flag = makeFlag({
        percentage: 0,
        allowlist: ['vip_only'],
        blocklist: []
      });
      assert.strictEqual(evaluateFlag(flag, 'regular_user', 'dev'), false);
    });
  });

  describe('Blocklist', () => {
    it('should disable for blocklisted user regardless of percentage', () => {
      const flag = makeFlag({
        percentage: 100,
        allowlist: [],
        blocklist: ['banned_1', 'banned_2']
      });
      assert.strictEqual(evaluateFlag(flag, 'banned_1', 'dev'), false);
      assert.strictEqual(evaluateFlag(flag, 'banned_2', 'dev'), false);
    });

    it('should not affect non-blocklisted users', () => {
      const flag = makeFlag({
        percentage: 100,
        allowlist: [],
        blocklist: ['banned_only']
      });
      assert.strictEqual(evaluateFlag(flag, 'regular_user', 'dev'), true);
    });
  });

  describe('Priority: blocklist > allowlist > percentage', () => {
    it('blocklist should override allowlist', () => {
      const flag = makeFlag({
        percentage: 100,
        allowlist: ['user_conflict'],
        blocklist: ['user_conflict']
      });
      // Blocklist takes priority
      assert.strictEqual(evaluateFlag(flag, 'user_conflict', 'dev'), false);
    });

    it('allowlist should override percentage', () => {
      const flag = makeFlag({
        percentage: 0,
        allowlist: ['special_user'],
        blocklist: []
      });
      // Allowlist overrides 0% percentage
      assert.strictEqual(evaluateFlag(flag, 'special_user', 'dev'), true);
    });

    it('full priority chain test', () => {
      const flag = makeFlag({
        percentage: 50,
        allowlist: ['vip'],
        blocklist: ['banned']
      });

      // Blocked user: always false
      assert.strictEqual(evaluateFlag(flag, 'banned', 'dev'), false);
      // VIP user: always true (not on blocklist, on allowlist)
      assert.strictEqual(evaluateFlag(flag, 'vip', 'dev'), true);
      // Regular user: depends on hash (50% chance)
      const result = evaluateFlag(flag, 'regular', 'dev');
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  describe('Environment + Targeting Interaction', () => {
    it('environment disabled should override all targeting', () => {
      const flag = makeFlag(
        { percentage: 100, allowlist: ['vip'], blocklist: [] },
        { dev: false, staging: false, production: false }
      );
      // Even allowlisted user gets false when env is disabled
      assert.strictEqual(evaluateFlag(flag, 'vip', 'dev'), false);
      assert.strictEqual(evaluateFlag(flag, 'regular', 'dev'), false);
    });
  });
});
