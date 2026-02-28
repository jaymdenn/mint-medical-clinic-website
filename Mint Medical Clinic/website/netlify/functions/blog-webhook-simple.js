/**
 * Mint Medical Clinic - Simple Blog Webhook Handler
 *
 * This is a simpler webhook that stores articles in Netlify's
 * blob storage or returns them for manual processing.
 *
 * For a fully static approach, this webhook can:
 * 1. Validate the incoming article
 * 2. Trigger a Netlify build with the new article data
 * 3. Or integrate with a headless CMS
 *
 * Webhook URL: https://your-site.netlify.app/.netlify/functions/blog-webhook-simple
 *
 * Payload Format:
 * {
 *   "action": "create" | "update" | "delete",
 *   "secret": "your-webhook-secret",
 *   "article": {
 *     "slug": "how-acoustic-wave-therapy-works",
 *     "title": "How Acoustic Wave Therapy Works for ED Treatment",
 *     "excerpt": "Learn how acoustic wave therapy restores natural blood flow...",
 *     "content": "<h2>What is Acoustic Wave Therapy?</h2><p>...</p>",
 *     "category": "ed-treatment",
 *     "tags": ["acoustic wave therapy", "ed treatment", "mens health"],
 *     "author": "Dr. Smith",
 *     "featuredImage": "https://mintmedicalclinic.com/images/AWT.webp",
 *     "publishedAt": "2025-02-28T12:00:00Z"
 *   }
 * }
 */

// Environment variable for webhook authentication
const WEBHOOK_SECRET = process.env.BLOG_WEBHOOK_SECRET;

// Validate article structure
function validateArticle(article) {
    const required = ['slug', 'title', 'content', 'category'];
    const missing = required.filter(field => !article[field]);

    if (missing.length > 0) {
        return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
    }

    // Validate category
    const validCategories = ['ed-treatment', 'hormone-therapy', 'weight-loss', 'womens-health', 'wellness', 'news'];
    if (!validCategories.includes(article.category)) {
        return { valid: false, error: `Invalid category. Use: ${validCategories.join(', ')}` };
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

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const payload = JSON.parse(event.body);

        // Authenticate
        if (WEBHOOK_SECRET && payload.secret !== WEBHOOK_SECRET) {
            console.log('Webhook authentication failed');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - Invalid secret' })
            };
        }

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

        // Sanitize content
        const sanitizedArticle = {
            ...article,
            content: sanitizeContent(article.content),
            publishedAt: article.publishedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Log the received article (for debugging)
        console.log(`Blog webhook received: ${action} - ${article.slug}`);

        // Option 1: Trigger a Netlify build hook to rebuild the site
        // You would set up a build hook in Netlify and call it here
        const BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK;
        if (BUILD_HOOK_URL) {
            try {
                const fetch = require('node-fetch');
                await fetch(BUILD_HOOK_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action,
                        article: sanitizedArticle
                    })
                });
                console.log('Build hook triggered');
            } catch (err) {
                console.error('Failed to trigger build hook:', err);
            }
        }

        // Option 2: Store in Netlify Blobs (if using Netlify Blobs)
        // This requires @netlify/blobs package

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
