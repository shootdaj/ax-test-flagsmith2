/**
 * Express application setup.
 * Configures routes for flag CRUD, evaluation, analytics, and static dashboard.
 */

const express = require('express');
const path = require('path');
const { store } = require('./store');
const { evaluateFlag, evaluateAllFlags, isValidEnvironment, VALID_ENVIRONMENTS } = require('./evaluator');
const { requireApiKey } = require('./auth');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Health Check ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Flag CRUD (no auth required) ---

// List all flags
app.get('/api/flags', (req, res) => {
  const flags = store.getAll();
  res.json(flags);
});

// Get single flag
app.get('/api/flags/:id', (req, res) => {
  const flag = store.getById(req.params.id);
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  res.json(flag);
});

// Create flag
app.post('/api/flags', (req, res) => {
  try {
    const flag = store.create(req.body);
    res.status(201).json(flag);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update flag
app.put('/api/flags/:id', (req, res) => {
  try {
    const flag = store.update(req.params.id, req.body);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(flag);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete flag
app.delete('/api/flags/:id', (req, res) => {
  const deleted = store.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  res.status(204).send();
});

// --- Flag Analytics ---

app.get('/api/flags/:id/analytics', (req, res) => {
  const flag = store.getById(req.params.id);
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  const analytics = store.getAnalytics(req.params.id);
  res.json({
    flag_id: req.params.id,
    flag_name: flag.name,
    ...analytics
  });
});

// --- Flag Evaluation (requires API key) ---

app.post('/api/evaluate', requireApiKey, (req, res) => {
  const { userId, environment = 'dev', attributes = {} } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!isValidEnvironment(environment)) {
    return res.status(400).json({
      error: `Invalid environment: "${environment}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
    });
  }

  const flags = store.getAll();
  const results = {};

  for (const flag of flags) {
    const isEnabled = evaluateFlag(flag, userId, environment);
    results[flag.name] = isEnabled;

    // Record analytics
    store.recordEvaluation(flag.id, isEnabled);
  }

  res.json({
    userId,
    environment,
    flags: results,
    evaluated_at: new Date().toISOString()
  });
});

// --- API Key Info (for dashboard) ---

app.get('/api/key', (req, res) => {
  const { getApiKey } = require('./auth');
  res.json({ api_key: getApiKey() });
});

// --- Serve dashboard for all non-API routes ---

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    next();
  }
});

module.exports = app;
