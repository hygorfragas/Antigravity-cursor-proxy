const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const AUTH_KEYS = [
    'antigravityAuthStatus',
    'antigravityUnifiedStateSync.oauthToken',
    'antigravityUnifiedStateSync.userStatus'
];

const TOKEN_FIELDS = [
    'apiKey',
    'access_token',
    'accessToken',
    'token',
    'oauthToken',
    'idToken'
];

const EMAIL_FIELDS = ['email', 'userEmail', 'account', 'user'];

function resolveAuthDbPath() {
    if (process.env.AUTH_DB_PATH) {
        return process.env.AUTH_DB_PATH;
    }

    const home = os.homedir();
    const candidates = [
        path.join(home, 'Library/Application Support/Antigravity IDE/User/globalStorage/state.vscdb'),
        path.join(home, 'Library/Application Support/Antigravity/User/globalStorage/state.vscdb'),
        path.join(home, '.config/Antigravity/User/globalStorage/state.vscdb'),
        path.join(home, '.config/Cursor/User/globalStorage/state.vscdb'),
        '/data/auth/state.vscdb'
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
}

const DB_PATH = resolveAuthDbPath();

function readDbValue(key) {
    const escapedKey = key.replace(/'/g, "''");
    const cmd = `sqlite3 "${DB_PATH}" "SELECT value FROM ItemTable WHERE key = '${escapedKey}';"`;
    return execSync(cmd).toString().trim();
}

function parseJsonValue(raw) {
    if (!raw) return null;

    let current = raw;
    for (let i = 0; i < 3; i += 1) {
        if (typeof current !== 'string') break;
        try {
            current = JSON.parse(current);
        } catch {
            break;
        }
    }

    return typeof current === 'object' && current !== null ? current : null;
}

function findEmail(data, depth = 0) {
    if (!data || depth > 6) return null;

    if (typeof data === 'object') {
        for (const field of EMAIL_FIELDS) {
            if (typeof data[field] === 'string' && data[field].includes('@')) {
                return data[field];
            }
        }

        for (const value of Object.values(data)) {
            const found = findEmail(value, depth + 1);
            if (found) return found;
        }
    }

    return null;
}

function findToken(data, depth = 0) {
    if (!data || depth > 6) return null;

    if (typeof data === 'object') {
        for (const field of TOKEN_FIELDS) {
            const value = data[field];
            if (typeof value === 'string' && value.length >= 20) {
                return value;
            }
        }

        for (const value of Object.values(data)) {
            const found = findToken(value, depth + 1);
            if (found) return found;
        }
    }

    return null;
}

function normalizeAuthData(raw) {
    const data = parseJsonValue(raw);
    if (!data) return null;

    const apiKey = findToken(data);
    if (!apiKey) return null;

    return {
        email: findEmail(data) || 'unknown',
        apiKey
    };
}

function getAuthStatus() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            throw new Error(`Database not found: ${DB_PATH}`);
        }

        for (const key of AUTH_KEYS) {
            const output = readDbValue(key);
            const authData = normalizeAuthData(output);
            if (authData?.apiKey) {
                return authData;
            }
        }

        throw new Error('No auth token found in database');
    } catch (error) {
        console.error('Error reading Antigravity database:', error.message);
        console.error('Database path:', DB_PATH);
        return null;
    }
}

module.exports = { getAuthStatus };

if (require.main === module) {
    const status = getAuthStatus();
    if (status) {
        console.log('Token extracted successfully for:', status.email);
        console.log('Token (prefix):', status.apiKey ? status.apiKey.substring(0, 10) + '...' : 'NONE');
    }
}
