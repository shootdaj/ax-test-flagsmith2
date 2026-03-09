/**
 * Vercel serverless entry point.
 * Exports the Express app for Vercel's serverless functions.
 */

const app = require('../src/app');
const { generateApiKey, getApiKey } = require('../src/auth');

// Generate API key if not already set
if (!getApiKey()) {
  generateApiKey();
}

module.exports = app;
