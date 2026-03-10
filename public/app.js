// Feature Flag Dashboard

let currentEnvironment = 'dev';
let currentApiKey = '';
let flags = [];

// --- API Helpers ---

async function api(method, path, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(path, options);
    if (res.status === 204) return null;
    return res.json();
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadFlags();
    loadApiKey();

    document.getElementById('env-select').addEventListener('change', (e) => {
        currentEnvironment = e.target.value;
        renderFlags();
    });

    document.getElementById('flag-percentage').addEventListener('input', (e) => {
        document.getElementById('percentage-value').textContent = e.target.value + '%';
    });
});

// --- API Key ---

async function loadApiKey() {
    try {
        const data = await api('GET', '/api/key');
        currentApiKey = data.api_key;
        document.getElementById('api-key-display').textContent = currentApiKey;
    } catch (err) {
        document.getElementById('api-key-display').textContent = 'Error loading key';
    }
}

function copyApiKey() {
    navigator.clipboard.writeText(currentApiKey).then(() => {
        showToast('API key copied to clipboard');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentApiKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('API key copied to clipboard');
    });
}

// --- Flag CRUD ---

async function loadFlags() {
    try {
        flags = await api('GET', '/api/flags');
        renderFlags();
    } catch (err) {
        document.getElementById('flag-list').innerHTML = '<div class="loading">Error loading flags</div>';
    }
}

function renderFlags() {
    const container = document.getElementById('flag-list');
    const env = currentEnvironment;

    if (flags.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No feature flags yet</h3>
                <p>Click "+ New Flag" to create your first feature flag.</p>
            </div>`;
        return;
    }

    container.innerHTML = flags.map(flag => {
        const isEnabled = flag.environments ? flag.environments[env] : flag.enabled;
        const targeting = flag.targeting || { percentage: 100, allowlist: [], blocklist: [] };

        return `
            <div class="flag-item" data-id="${flag.id}">
                <label class="toggle-switch">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''}
                           onchange="toggleFlag('${flag.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <div class="flag-info">
                    <div class="flag-name">${escapeHtml(flag.name)}</div>
                    ${flag.description ? `<div class="flag-desc">${escapeHtml(flag.description)}</div>` : ''}
                    <div class="flag-meta">
                        <span class="flag-tag ${isEnabled ? 'active' : ''}">${env}: ${isEnabled ? 'ON' : 'OFF'}</span>
                        <span class="flag-tag">${targeting.percentage}% rollout</span>
                        ${targeting.allowlist.length ? `<span class="flag-tag">${targeting.allowlist.length} allowlisted</span>` : ''}
                        ${targeting.blocklist.length ? `<span class="flag-tag">${targeting.blocklist.length} blocklisted</span>` : ''}
                    </div>
                </div>
                <div class="flag-actions">
                    <button onclick="showAnalytics('${flag.id}')">Analytics</button>
                    <button onclick="editFlag('${flag.id}')">Edit</button>
                    <button class="danger" onclick="deleteFlag('${flag.id}')">Delete</button>
                </div>
            </div>`;
    }).join('');
}

async function toggleFlag(id, enabled) {
    const env = currentEnvironment;
    const environments = {};
    environments[env] = enabled;

    try {
        await api('PUT', `/api/flags/${id}`, { environments });
        // Update local state
        const flag = flags.find(f => f.id === id);
        if (flag) {
            if (!flag.environments) flag.environments = {};
            flag.environments[env] = enabled;
        }
        showToast(`Flag ${enabled ? 'enabled' : 'disabled'} for ${env}`);
    } catch (err) {
        showToast('Error updating flag');
        loadFlags(); // Reload to sync state
    }
}

async function deleteFlag(id) {
    if (!confirm('Delete this flag? This cannot be undone.')) return;

    try {
        await api('DELETE', `/api/flags/${id}`);
        flags = flags.filter(f => f.id !== id);
        renderFlags();
        showToast('Flag deleted');
    } catch (err) {
        showToast('Error deleting flag');
    }
}

// --- Form ---

function showCreateForm() {
    document.getElementById('form-title').textContent = 'Create Flag';
    document.getElementById('flag-id').value = '';
    document.getElementById('flag-name').value = '';
    document.getElementById('flag-desc').value = '';
    document.getElementById('env-dev').checked = true;
    document.getElementById('env-staging').checked = false;
    document.getElementById('env-prod').checked = false;
    document.getElementById('flag-percentage').value = 100;
    document.getElementById('percentage-value').textContent = '100%';
    document.getElementById('flag-allowlist').value = '';
    document.getElementById('flag-blocklist').value = '';
    document.getElementById('flag-form').style.display = 'block';
    document.getElementById('flag-name').focus();
}

function editFlag(id) {
    const flag = flags.find(f => f.id === id);
    if (!flag) return;

    document.getElementById('form-title').textContent = 'Edit Flag';
    document.getElementById('flag-id').value = flag.id;
    document.getElementById('flag-name').value = flag.name;
    document.getElementById('flag-desc').value = flag.description || '';

    const envs = flag.environments || { dev: false, staging: false, production: false };
    document.getElementById('env-dev').checked = envs.dev || false;
    document.getElementById('env-staging').checked = envs.staging || false;
    document.getElementById('env-prod').checked = envs.production || false;

    const targeting = flag.targeting || { percentage: 100, allowlist: [], blocklist: [] };
    document.getElementById('flag-percentage').value = targeting.percentage;
    document.getElementById('percentage-value').textContent = targeting.percentage + '%';
    document.getElementById('flag-allowlist').value = (targeting.allowlist || []).join(', ');
    document.getElementById('flag-blocklist').value = (targeting.blocklist || []).join(', ');

    document.getElementById('flag-form').style.display = 'block';
    document.getElementById('flag-name').focus();
}

function hideForm() {
    document.getElementById('flag-form').style.display = 'none';
}

async function saveFlag(event) {
    event.preventDefault();

    const id = document.getElementById('flag-id').value;
    const name = document.getElementById('flag-name').value.trim();
    const description = document.getElementById('flag-desc').value.trim();
    const environments = {
        dev: document.getElementById('env-dev').checked,
        staging: document.getElementById('env-staging').checked,
        production: document.getElementById('env-prod').checked
    };
    const percentage = parseInt(document.getElementById('flag-percentage').value);
    const allowlist = parseList(document.getElementById('flag-allowlist').value);
    const blocklist = parseList(document.getElementById('flag-blocklist').value);

    const data = {
        name,
        description,
        enabled: environments[currentEnvironment],
        environments,
        targeting: { percentage, allowlist, blocklist }
    };

    try {
        if (id) {
            await api('PUT', `/api/flags/${id}`, data);
            showToast('Flag updated');
        } else {
            await api('POST', '/api/flags', data);
            showToast('Flag created');
        }
        hideForm();
        await loadFlags();
    } catch (err) {
        showToast('Error saving flag');
    }
}

// --- Analytics ---

async function showAnalytics(id) {
    const flag = flags.find(f => f.id === id);
    if (!flag) return;

    try {
        const data = await api('GET', `/api/flags/${id}/analytics`);

        document.getElementById('analytics-title').textContent = `Analytics: ${flag.name}`;

        const truePercent = data.total_evaluations > 0
            ? Math.round(data.true_ratio * 100)
            : 0;

        document.getElementById('analytics-content').innerHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.total_evaluations}</div>
                    <div class="stat-label">Total Evaluations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.true_count}</div>
                    <div class="stat-label">True (Enabled)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.false_count}</div>
                    <div class="stat-label">False (Disabled)</div>
                </div>
            </div>
            <div>
                <strong>True/False Ratio</strong>
                <div class="ratio-bar">
                    <div class="ratio-true" style="width: ${truePercent}%"></div>
                </div>
                <div class="ratio-labels">
                    <span>True: ${truePercent}%</span>
                    <span>False: ${100 - truePercent}%</span>
                </div>
            </div>`;

        document.getElementById('analytics-modal').style.display = 'flex';
    } catch (err) {
        showToast('Error loading analytics');
    }
}

function closeAnalytics() {
    document.getElementById('analytics-modal').style.display = 'none';
}

// --- Utilities ---

function parseList(str) {
    return str
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Close modal on background click
document.addEventListener('click', (e) => {
    if (e.target.id === 'analytics-modal') {
        closeAnalytics();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAnalytics();
        hideForm();
    }
});
