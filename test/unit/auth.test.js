const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { generateApiKey, getApiKey, setApiKey, validateApiKey } = require('../../src/auth');

describe('Auth', () => {
  beforeEach(() => {
    setApiKey(null);
  });

  describe('generateApiKey', () => {
    it('should generate a key', () => {
      const key = generateApiKey();
      assert.ok(key);
      assert.strictEqual(typeof key, 'string');
      assert.ok(key.length > 0);
    });

    it('should generate a 64-char hex string', () => {
      const key = generateApiKey();
      assert.strictEqual(key.length, 64);
      assert.ok(/^[0-9a-f]+$/.test(key));
    });

    it('should be retrievable via getApiKey', () => {
      const key = generateApiKey();
      assert.strictEqual(getApiKey(), key);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct key', () => {
      const key = generateApiKey();
      assert.strictEqual(validateApiKey(key), true);
    });

    it('should reject incorrect key', () => {
      generateApiKey();
      assert.strictEqual(validateApiKey('wrong-key'), false);
    });

    it('should reject when no key is set', () => {
      assert.strictEqual(validateApiKey('any-key'), false);
    });
  });

  describe('setApiKey', () => {
    it('should set a custom key', () => {
      setApiKey('custom-key-123');
      assert.strictEqual(getApiKey(), 'custom-key-123');
      assert.strictEqual(validateApiKey('custom-key-123'), true);
    });
  });
});
