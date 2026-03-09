/**
 * Server entry point.
 * Starts the Express server and generates the API key.
 */

const app = require('./app');
const { generateApiKey, getApiKey } = require('./auth');

const PORT = process.env.PORT || 3000;

// Generate API key on start
generateApiKey();

const server = app.listen(PORT, () => {
  console.log(`Feature Flag Service running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
  console.log(`API Key: ${getApiKey()}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

module.exports = server;
