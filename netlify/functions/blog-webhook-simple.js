/**
 * Mint Medical Clinic - Blog Webhook Handler
 *
 * Open webhook endpoint for receiving blog articles.
 * Stores articles in Netlify Blobs for persistence.
 *
 * Webhook URL: https://mintmedicalclinic.com/api/blog-webhook
 */

const { getStore } = require('@netlify/blobs');

// Validate article structure
function validateArticle(article) {
    const required = ['slug', 'title', 'content'];
    const missing = required.filter(field => !article[field]);

    if (missing.length > 0) {
        return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
    }

    // Category validation is now dynamic - just check format if provided
    if (article.category && !/^[a-z0-9-]+$/.test(article.category)) {
        return { valid: false, error: 'Category must be lowercase alphanumeric with hyphens only' };
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(article.slug)) {
        return { valid: false, error: 'Slug must be lowercase alphanumeric with hyphens only' };
    }

    return { valid: true };
}

// Sanitize HTML content (basic)
function sanitizeContent(content) {
    // Remove script tags
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// Get the blob store - works automatically in Netlify's environment
function getBlobStore() {
    // Try automatic context first (works during Netlify builds/functions)
    try {
        return getStore('articles');
    } catch (e) {
        // Fallback with explicit config if env vars are set
        if (process.env.NETLIFY_AUTH_TOKEN) {
            return getStore({
                name: 'articles',
                siteID: process.env.SITE_ID || '38e7c65c-9693-4bec-9e83-e2312bd923db',
                token: process.env.NETLIFY_AUTH_TOKEN
            });
        }
        throw e;
    }
}

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    let store;
    try {
        store = getBlobStore();
    } catch (error) {
        console.error('Failed to initialize blob store:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Storage not configured',
                message: 'Please set NETLIFY_AUTH_TOKEN environment variable'
            })
        };
    }

    // GET request - return all articles
    if (event.httpMethod === 'GET') {
        try {
            const { blobs } = await store.list();
            const articles = [];

            for (const blob of blobs) {
                const article = await store.get(blob.key, { type: 'json' });
                if (article) {
                    articles.push(article);
                }
            }

            // Sort by publishedAt (newest first)
            articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ articles, lastUpdated: new Date().toISOString() })
            };
        } catch (error) {
            console.error('Error fetching articles:', error);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ articles: [], lastUpdated: new Date().toISOString() })
            };
        }
    }

    // Only allow POST for modifications
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const payload = JSON.parse(event.body);
        const { action, article } = payload;

        // Validate action
        if (!['create', 'update', 'delete'].includes(action)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action. Use: create, update, or delete' })
            };
        }

        // Validate article
        if (!article) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing article data' })
            };
        }

        const validation = validateArticle(article);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: validation.error })
            };
        }

        // Handle delete action
        if (action === 'delete') {
            await store.delete(article.slug);
            console.log(`Article deleted: ${article.slug}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Article deleted successfully',
                    slug: article.slug
                })
            };
        }

        // Sanitize content and set defaults for create/update
        const sanitizedArticle = {
            ...article,
            content: sanitizeContent(article.content),
            category: article.category || 'wellness',
            publishedAt: article.publishedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Store the article in Netlify Blobs
        await store.setJSON(article.slug, sanitizedArticle);
        console.log(`Article ${action}d: ${article.slug}`);

        // Return success with the processed article
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Article ${action}d successfully`,
                article: {
                    slug: sanitizedArticle.slug,
                    title: sanitizedArticle.title,
                    category: sanitizedArticle.category,
                    publishedAt: sanitizedArticle.publishedAt
                }
            })
        };

    } catch (error) {
        console.error('Webhook error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
