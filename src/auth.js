/**
 * API key authentication.
 * Generates and validates API keys for the evaluation endpoint.
 */

const crypto = require('crypto');

let apiKey = null;

/**
 * Generate a new API key (called on server start).
 */
function generateApiKey() {
  apiKey = crypto.randomBytes(32).toString('hex');
  return apiKey;
}

/**
 * Get the current API key.
 */
function getApiKey() {
  return apiKey;
}

/**
 * Set the API key (for testing).
 */
function setApiKey(key) {
  apiKey = key;
}

/**
 * Validate an API key.
 */
function validateApiKey(key) {
  if (!apiKey) return false;
  return key === apiKey;
}

/**
 * Express middleware that requires a valid API key.
 * Checks the X-API-Key header.
 */
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: 'API key required. Provide X-API-Key header.' });
  }
  if (!validateApiKey(key)) {
    return res.status(403).json({ error: 'Invalid API key.' });
  }
  next();
}

module.exports = { generateApiKey, getApiKey, setApiKey, validateApiKey, requireApiKey };
