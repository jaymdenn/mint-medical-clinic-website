/**
 * Mint Medical Clinic - Blog Webhook Handler
 *
 * This Netlify function receives blog articles via webhook and updates
 * the static articles.json file.
 *
 * Webhook Payload Format:
 * {
 *   "action": "create" | "update" | "delete",
 *   "secret": "your-webhook-secret",
 *   "article": {
 *     "slug": "article-url-slug",
 *     "title": "Article Title",
 *     "excerpt": "Short description for previews",
 *     "content": "<p>Full HTML content...</p>",
 *     "category": "ed-treatment" | "hormone-therapy" | "weight-loss" | "womens-health" | "wellness",
 *     "tags": ["tag1", "tag2"],
 *     "author": "Author Name",
 *     "featuredImage": "https://example.com/image.jpg",
 *     "publishedAt": "2025-02-28T12:00:00Z",
 *     "updatedAt": "2025-02-28T12:00:00Z"
 *   }
 * }
 */

const { Octokit } = require('@octokit/rest');

// Environment variables (set in Netlify dashboard)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-github-username';
const GITHUB_REPO = process.env.GITHUB_REPO || 'mint-medical-clinic';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const ARTICLES_PATH = 'website/data/articles.json';

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the webhook payload
        const payload = JSON.parse(event.body);

        // Validate webhook secret
        if (WEBHOOK_SECRET && payload.secret !== WEBHOOK_SECRET) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        const { action, article } = payload;

        // Validate required fields
        if (!action || !article) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: action, article' })
            };
        }

        if (!article.slug || !article.title) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Article must have slug and title' })
            };
        }

        // Initialize GitHub client
        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // Get current articles.json
        let articlesData;
        let fileSha;

        try {
            const { data } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: ARTICLES_PATH
            });

            fileSha = data.sha;
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            articlesData = JSON.parse(content);
        } catch (error) {
            if (error.status === 404) {
                // File doesn't exist, create new
                articlesData = { articles: [], lastUpdated: new Date().toISOString() };
            } else {
                throw error;
            }
        }

        // Process the action
        let message;
        const articles = articlesData.articles || [];
        const existingIndex = articles.findIndex(a => a.slug === article.slug);

        switch (action) {
            case 'create':
                if (existingIndex >= 0) {
                    // Update existing article if slug already exists
                    articles[existingIndex] = {
                        ...articles[existingIndex],
                        ...article,
                        updatedAt: new Date().toISOString()
                    };
                    message = `Updated article: ${article.title}`;
                } else {
                    // Add new article
                    articles.push({
                        ...article,
                        publishedAt: article.publishedAt || new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    });
                    message = `Added article: ${article.title}`;
                }
                break;

            case 'update':
                if (existingIndex >= 0) {
                    articles[existingIndex] = {
                        ...articles[existingIndex],
                        ...article,
                        updatedAt: new Date().toISOString()
                    };
                    message = `Updated article: ${article.title}`;
                } else {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({ error: 'Article not found' })
                    };
                }
                break;

            case 'delete':
                if (existingIndex >= 0) {
                    articles.splice(existingIndex, 1);
                    message = `Deleted article: ${article.slug}`;
                } else {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({ error: 'Article not found' })
                    };
                }
                break;

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid action. Use: create, update, or delete' })
                };
        }

        // Update the articles data
        articlesData.articles = articles;
        articlesData.lastUpdated = new Date().toISOString();

        // Commit the updated file to GitHub
        const content = Buffer.from(JSON.stringify(articlesData, null, 2)).toString('base64');

        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: ARTICLES_PATH,
            message: message,
            content: content,
            sha: fileSha,
            branch: 'main'
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: message,
                articleCount: articles.length
            })
        };

    } catch (error) {
        console.error('Webhook error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
