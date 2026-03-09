/**
 * In-memory storage for feature flags.
 * Provides CRUD operations and data access.
 */

class FlagStore {
  constructor() {
    this.flags = new Map();
    this.counter = 0;
    this.analytics = new Map(); // flagId -> { total: 0, true: 0, false: 0 }
  }

  /** Generate a unique ID */
  _nextId() {
    this.counter += 1;
    return `flag_${this.counter}`;
  }

  /** Create a new flag */
  create({ name, description = '', enabled = false, environments = null, targeting = null }) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Flag name is required and must be a non-empty string');
    }

    const id = this._nextId();
    const flag = {
      id,
      name: name.trim(),
      description: description || '',
      enabled: Boolean(enabled),
      environments: environments || {
        dev: Boolean(enabled),
        staging: false,
        production: false
      },
      targeting: targeting || {
        percentage: 100,
        allowlist: [],
        blocklist: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.flags.set(id, flag);
    this.analytics.set(id, { total: 0, true: 0, false: 0 });
    return { ...flag };
  }

  /** Get all flags */
  getAll() {
    return Array.from(this.flags.values()).map(f => ({ ...f }));
  }

  /** Get a single flag by ID */
  getById(id) {
    const flag = this.flags.get(id);
    if (!flag) return null;
    return { ...flag };
  }

  /** Update a flag */
  update(id, updates) {
    const flag = this.flags.get(id);
    if (!flag) return null;

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim() === '') {
        throw new Error('Flag name must be a non-empty string');
      }
      flag.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      flag.description = updates.description;
    }
    if (updates.enabled !== undefined) {
      flag.enabled = Boolean(updates.enabled);
    }
    if (updates.environments !== undefined) {
      flag.environments = { ...flag.environments, ...updates.environments };
    }
    if (updates.targeting !== undefined) {
      flag.targeting = { ...flag.targeting, ...updates.targeting };
    }

    flag.updated_at = new Date().toISOString();
    this.flags.set(id, flag);
    return { ...flag };
  }

  /** Delete a flag */
  delete(id) {
    const existed = this.flags.has(id);
    this.flags.delete(id);
    this.analytics.delete(id);
    return existed;
  }

  /** Record an evaluation result */
  recordEvaluation(flagId, result) {
    let record = this.analytics.get(flagId);
    if (!record) {
      record = { total: 0, true: 0, false: 0 };
      this.analytics.set(flagId, record);
    }
    record.total += 1;
    if (result) {
      record.true += 1;
    } else {
      record.false += 1;
    }
  }

  /** Get analytics for a flag */
  getAnalytics(flagId) {
    const record = this.analytics.get(flagId);
    if (!record) return null;
    return {
      total_evaluations: record.total,
      true_count: record.true,
      false_count: record.false,
      true_ratio: record.total > 0 ? record.true / record.total : 0,
      false_ratio: record.total > 0 ? record.false / record.total : 0
    };
  }

  /** Clear all data (for testing) */
  clear() {
    this.flags.clear();
    this.analytics.clear();
    this.counter = 0;
  }
}

// Singleton instance
const store = new FlagStore();

module.exports = { FlagStore, store };
