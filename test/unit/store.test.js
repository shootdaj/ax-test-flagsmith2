const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { FlagStore } = require('../../src/store');

describe('FlagStore', () => {
  let store;

  beforeEach(() => {
    store = new FlagStore();
  });

  describe('create', () => {
    it('should create a flag with required fields', () => {
      const flag = store.create({ name: 'test-flag' });
      assert.ok(flag.id);
      assert.strictEqual(flag.name, 'test-flag');
      assert.strictEqual(flag.description, '');
      assert.strictEqual(flag.enabled, false);
      assert.ok(flag.created_at);
      assert.ok(flag.updated_at);
    });

    it('should create a flag with all fields', () => {
      const flag = store.create({
        name: 'full-flag',
        description: 'A test flag',
        enabled: true
      });
      assert.strictEqual(flag.name, 'full-flag');
      assert.strictEqual(flag.description, 'A test flag');
      assert.strictEqual(flag.enabled, true);
    });

    it('should auto-generate unique IDs', () => {
      const flag1 = store.create({ name: 'flag-1' });
      const flag2 = store.create({ name: 'flag-2' });
      assert.notStrictEqual(flag1.id, flag2.id);
    });

    it('should auto-generate created_at timestamp', () => {
      const before = new Date().toISOString();
      const flag = store.create({ name: 'timestamped' });
      const after = new Date().toISOString();
      assert.ok(flag.created_at >= before);
      assert.ok(flag.created_at <= after);
    });

    it('should throw on empty name', () => {
      assert.throws(() => store.create({ name: '' }), /name is required/);
    });

    it('should throw on missing name', () => {
      assert.throws(() => store.create({}), /name is required/);
    });

    it('should trim whitespace from name', () => {
      const flag = store.create({ name: '  spaced  ' });
      assert.strictEqual(flag.name, 'spaced');
    });

    it('should initialize default environments', () => {
      const flag = store.create({ name: 'env-test', enabled: true });
      assert.deepStrictEqual(flag.environments, {
        dev: true,
        staging: false,
        production: false
      });
    });

    it('should initialize default targeting rules', () => {
      const flag = store.create({ name: 'target-test' });
      assert.deepStrictEqual(flag.targeting, {
        percentage: 100,
        allowlist: [],
        blocklist: []
      });
    });
  });

  describe('getAll', () => {
    it('should return empty array when no flags', () => {
      const flags = store.getAll();
      assert.deepStrictEqual(flags, []);
    });

    it('should return all created flags', () => {
      store.create({ name: 'flag-1' });
      store.create({ name: 'flag-2' });
      const flags = store.getAll();
      assert.strictEqual(flags.length, 2);
    });

    it('should return copies (not references)', () => {
      store.create({ name: 'original' });
      const flags = store.getAll();
      flags[0].name = 'modified';
      const original = store.getAll();
      assert.strictEqual(original[0].name, 'original');
    });
  });

  describe('getById', () => {
    it('should return flag by ID', () => {
      const created = store.create({ name: 'find-me' });
      const found = store.getById(created.id);
      assert.strictEqual(found.name, 'find-me');
      assert.strictEqual(found.id, created.id);
    });

    it('should return null for non-existent ID', () => {
      const result = store.getById('nonexistent');
      assert.strictEqual(result, null);
    });

    it('should return copy (not reference)', () => {
      const created = store.create({ name: 'original' });
      const found = store.getById(created.id);
      found.name = 'modified';
      const original = store.getById(created.id);
      assert.strictEqual(original.name, 'original');
    });
  });

  describe('update', () => {
    it('should update flag name', () => {
      const created = store.create({ name: 'old-name' });
      const updated = store.update(created.id, { name: 'new-name' });
      assert.strictEqual(updated.name, 'new-name');
    });

    it('should update flag description', () => {
      const created = store.create({ name: 'test' });
      const updated = store.update(created.id, { description: 'new desc' });
      assert.strictEqual(updated.description, 'new desc');
    });

    it('should update flag enabled state', () => {
      const created = store.create({ name: 'test', enabled: false });
      const updated = store.update(created.id, { enabled: true });
      assert.strictEqual(updated.enabled, true);
    });

    it('should update updated_at timestamp', () => {
      const created = store.create({ name: 'test' });
      const originalUpdatedAt = created.updated_at;
      // Small delay to ensure different timestamp
      const updated = store.update(created.id, { name: 'changed' });
      assert.ok(updated.updated_at >= originalUpdatedAt);
    });

    it('should return null for non-existent ID', () => {
      const result = store.update('nonexistent', { name: 'test' });
      assert.strictEqual(result, null);
    });

    it('should throw on empty name update', () => {
      const created = store.create({ name: 'test' });
      assert.throws(() => store.update(created.id, { name: '' }), /name must be a non-empty string/);
    });

    it('should preserve unchanged fields', () => {
      const created = store.create({ name: 'test', description: 'original' });
      const updated = store.update(created.id, { name: 'new-name' });
      assert.strictEqual(updated.description, 'original');
    });
  });

  describe('delete', () => {
    it('should delete existing flag', () => {
      const created = store.create({ name: 'delete-me' });
      const result = store.delete(created.id);
      assert.strictEqual(result, true);
      assert.strictEqual(store.getById(created.id), null);
    });

    it('should return false for non-existent flag', () => {
      const result = store.delete('nonexistent');
      assert.strictEqual(result, false);
    });

    it('should not affect other flags', () => {
      const flag1 = store.create({ name: 'keep' });
      const flag2 = store.create({ name: 'delete-me' });
      store.delete(flag2.id);
      assert.ok(store.getById(flag1.id));
      assert.strictEqual(store.getAll().length, 1);
    });
  });

  describe('analytics', () => {
    it('should initialize analytics on flag creation', () => {
      const flag = store.create({ name: 'test' });
      const analytics = store.getAnalytics(flag.id);
      assert.strictEqual(analytics.total_evaluations, 0);
      assert.strictEqual(analytics.true_count, 0);
      assert.strictEqual(analytics.false_count, 0);
    });

    it('should record true evaluations', () => {
      const flag = store.create({ name: 'test' });
      store.recordEvaluation(flag.id, true);
      store.recordEvaluation(flag.id, true);
      const analytics = store.getAnalytics(flag.id);
      assert.strictEqual(analytics.total_evaluations, 2);
      assert.strictEqual(analytics.true_count, 2);
      assert.strictEqual(analytics.false_count, 0);
    });

    it('should record false evaluations', () => {
      const flag = store.create({ name: 'test' });
      store.recordEvaluation(flag.id, false);
      const analytics = store.getAnalytics(flag.id);
      assert.strictEqual(analytics.total_evaluations, 1);
      assert.strictEqual(analytics.true_count, 0);
      assert.strictEqual(analytics.false_count, 1);
    });

    it('should calculate ratios', () => {
      const flag = store.create({ name: 'test' });
      store.recordEvaluation(flag.id, true);
      store.recordEvaluation(flag.id, true);
      store.recordEvaluation(flag.id, false);
      const analytics = store.getAnalytics(flag.id);
      assert.ok(Math.abs(analytics.true_ratio - 2/3) < 0.001);
      assert.ok(Math.abs(analytics.false_ratio - 1/3) < 0.001);
    });

    it('should return null for non-existent flag', () => {
      const analytics = store.getAnalytics('nonexistent');
      assert.strictEqual(analytics, null);
    });

    it('should delete analytics when flag is deleted', () => {
      const flag = store.create({ name: 'test' });
      store.recordEvaluation(flag.id, true);
      store.delete(flag.id);
      const analytics = store.getAnalytics(flag.id);
      assert.strictEqual(analytics, null);
    });
  });

  describe('clear', () => {
    it('should remove all flags and analytics', () => {
      store.create({ name: 'flag-1' });
      store.create({ name: 'flag-2' });
      store.clear();
      assert.strictEqual(store.getAll().length, 0);
    });
  });
});
