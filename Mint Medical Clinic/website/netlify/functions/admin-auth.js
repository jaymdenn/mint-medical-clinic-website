/**
 * Mint Medical Clinic - Admin Authentication Handler
 *
 * Handles login, logout, session validation, and user management
 */

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Hash password with salt
function hashPassword(password, salt = null) {
    salt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

// Verify password
function verifyPassword(password, hash, salt) {
    const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verify;
}

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Get blob stores
function getStores() {
    const users = getStore('admin-users');
    const sessions = getStore('admin-sessions');
    return { users, sessions };
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { users, sessions } = getStores();
        const payload = JSON.parse(event.body);
        const { action } = payload;

        switch (action) {
            case 'login': {
                const { username, password } = payload;

                if (!username || !password) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username and password required' })
                    };
                }

                const user = await users.get(username.toLowerCase(), { type: 'json' });

                if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Invalid credentials' })
                    };
                }

                // Create session
                const sessionToken = generateSessionToken();
                const session = {
                    username: user.username,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                };

                await sessions.setJSON(sessionToken, session);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        token: sessionToken,
                        user: { username: user.username, name: user.name }
                    })
                };
            }

            case 'logout': {
                const { token } = payload;
                if (token) {
                    await sessions.delete(token);
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            }

            case 'validate': {
                const { token } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'No token provided' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });

                if (!session) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Invalid session' })
                    };
                }

                if (new Date(session.expiresAt) < new Date()) {
                    await sessions.delete(token);
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session expired' })
                    };
                }

                const user = await users.get(session.username, { type: 'json' });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        valid: true,
                        user: { username: user.username, name: user.name }
                    })
                };
            }

            case 'create-user': {
                const { token, username, password, name } = payload;

                // Validate admin session
                if (token) {
                    const session = await sessions.get(token, { type: 'json' });
                    if (!session || new Date(session.expiresAt) < new Date()) {
                        // Check if any users exist - if not, allow first user creation
                        const { blobs } = await users.list();
                        if (blobs.length > 0) {
                            return {
                                statusCode: 401,
                                headers,
                                body: JSON.stringify({ error: 'Unauthorized' })
                            };
                        }
                    }
                } else {
                    // Check if any users exist
                    const { blobs } = await users.list();
                    if (blobs.length > 0) {
                        return {
                            statusCode: 401,
                            headers,
                            body: JSON.stringify({ error: 'Unauthorized - login required' })
                        };
                    }
                }

                if (!username || !password) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username and password required' })
                    };
                }

                // Check if user exists
                const existingUser = await users.get(username.toLowerCase(), { type: 'json' });
                if (existingUser) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Username already exists' })
                    };
                }

                // Create user
                const { hash, salt } = hashPassword(password);
                const newUser = {
                    username: username.toLowerCase(),
                    name: name || username,
                    passwordHash: hash,
                    salt: salt,
                    createdAt: new Date().toISOString()
                };

                await users.setJSON(username.toLowerCase(), newUser);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { username: newUser.username, name: newUser.name }
                    })
                };
            }

            case 'change-password': {
                const { token, currentPassword, newPassword } = payload;

                if (!token) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Not authenticated' })
                    };
                }

                const session = await sessions.get(token, { type: 'json' });
                if (!session || new Date(session.expiresAt) < new Date()) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Session invalid or expired' })
                    };
                }

                const user = await users.get(session.username, { type: 'json' });

                if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ error: 'Current password incorrect' })
                    };
                }

                const { hash, salt } = hashPassword(newPassword);
                user.passwordHash = hash;
                user.salt = salt;
                user.updatedAt = new Date().toISOString();

                await users.setJSON(session.username, user);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true })
                };
            }

            case 'check-setup': {
                // Check if any users exist
                const { blobs } = await users.list();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        needsSetup: blobs.length === 0,
                        userCount: blobs.length
                    })
                };
            }

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
