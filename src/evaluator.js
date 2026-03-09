/**
 * Flag evaluation engine.
 * Evaluates flags based on user context, environment, and targeting rules.
 */

const crypto = require('crypto');

const VALID_ENVIRONMENTS = ['dev', 'staging', 'production'];

/**
 * Deterministic hash for percentage rollout.
 * Given the same flagId + userId, always returns the same value 0-99.
 */
function hashPercentage(flagId, userId) {
  const hash = crypto
    .createHash('sha256')
    .update(`${flagId}:${userId}`)
    .digest('hex');
  // Use first 8 hex chars (32 bits) to get a number, mod 100
  const num = parseInt(hash.substring(0, 8), 16);
  return num % 100;
}

/**
 * Evaluate a single flag for a user context.
 *
 * Priority order:
 * 1. If flag is disabled for environment -> false
 * 2. Blocklist -> false (highest targeting priority)
 * 3. Allowlist -> true
 * 4. Percentage rollout -> deterministic true/false
 */
function evaluateFlag(flag, userId, environment) {
  // Check environment-level enabled
  if (flag.environments && flag.environments[environment] === false) {
    return false;
  }

  // If no targeting rules, just use the environment enabled state
  if (!flag.targeting) {
    return flag.environments ? (flag.environments[environment] !== false) : flag.enabled;
  }

  const { blocklist = [], allowlist = [], percentage = 100 } = flag.targeting;

  // Blocklist takes highest priority
  if (blocklist.includes(userId)) {
    return false;
  }

  // Allowlist next
  if (allowlist.includes(userId)) {
    return true;
  }

  // Percentage rollout (deterministic)
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;

  const userPercent = hashPercentage(flag.id, userId);
  return userPercent < percentage;
}

/**
 * Evaluate all flags for a user context.
 * Returns { flagName: true/false, ... }
 */
function evaluateAllFlags(flags, userId, environment) {
  const results = {};
  for (const flag of flags) {
    results[flag.name] = evaluateFlag(flag, userId, environment);
  }
  return results;
}

/**
 * Validate environment name.
 */
function isValidEnvironment(env) {
  return VALID_ENVIRONMENTS.includes(env);
}

module.exports = {
  evaluateFlag,
  evaluateAllFlags,
  hashPercentage,
  isValidEnvironment,
  VALID_ENVIRONMENTS
};
