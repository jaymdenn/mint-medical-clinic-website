# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mint Medical Clinic is a static HTML website for a Utah-based intimacy health and wellness clinic. The site uses Netlify for hosting with serverless functions for blog management and admin authentication.

**Live URL:** https://mintmedicalclinic.com
**Locations:** Sandy and Layton, Utah

## Architecture

### Directory Structure

All website files are in `/website/`:
- Static HTML pages at root level (index.html, services.html, etc.)
- `/services/` - Individual service pages
- `/Products/` - Product detail pages
- `/blog/` - Blog article template (article.html)
- `/admin/` - Admin dashboard (secret access via 7 logo clicks)
- `/netlify/functions/` - Serverless API functions
- `/js/` - Client-side JavaScript
- `/css/` - Stylesheets
- `/data/` - Static JSON fallback data

### Netlify Functions (API)

Two serverless functions handle all backend operations:

**`/api/blog-webhook`** → `blog-webhook-simple.js`
- GET: Returns all published articles (public)
- POST: Create/update/delete articles (requires auth token)
- Articles stored in Netlify Blobs (`articles` store)
- Sanitizes HTML content (removes scripts, iframes, event handlers)
- Validates slugs, titles, featured images

**`/api/admin-auth`** → `admin-auth.js`
- Actions: `login`, `logout`, `validate`, `create-user`, `change-password`, `check-setup`
- Category management: `list-categories`, `create-category`, `update-category`, `delete-category`
- User management: `list-users`
- Uses Netlify Blobs for storage (`admin-users`, `admin-sessions`, `blog-categories`)
- Passwords hashed with PBKDF2 (10000 iterations, SHA-512)
- Sessions expire after 24 hours

### Storage

Uses `@netlify/blobs` for persistent storage:
- `articles` - Blog articles
- `admin-users` - User credentials
- `admin-sessions` - Active sessions
- `blog-categories` - Dynamic blog categories

### Client-Side JavaScript

**`script.js`** - Main site functionality:
- Secret admin access (7 logo clicks)
- Mobile menu toggle
- Scroll effects and animations
- Form validation
- KSL offer popup persistence

**`header.js`** - Injects consistent header across all pages with navigation

**`blog.js`** - Blog listing and article pages:
- Fetches articles from API
- Category filtering
- Pagination (9 articles per page)
- Related articles
- Dynamic meta tags and Schema.org markup
- Auto-inserts CTA boxes into article content

## Development

No build process required - this is a static site with vanilla JavaScript.

```bash
# Install function dependencies
cd website/netlify/functions && npm install

# Local development with Netlify CLI
netlify dev

# Deploy (auto-deploys from git)
git push
```

### Environment Variables (Netlify)

- `BLOG_WEBHOOK_SECRET` - Static webhook secret for external services
- `NETLIFY_AUTH_TOKEN` - For Netlify Blobs access in dev
- `SITE_ID` - Netlify site ID (38e7c65c-9693-4bec-9e83-e2312bd923db)

## Key Patterns

### Authentication Flow

1. First-time setup: No users exist → allow first user creation without auth
2. Login: POST to `/api/admin-auth` with `action: 'login'`
3. Returns session token (store in localStorage)
4. All write operations require valid token
5. External services can use static `BLOG_WEBHOOK_SECRET`

### Article Structure

```javascript
{
  slug: "url-friendly-slug",      // Required, lowercase alphanumeric + hyphens
  title: "Article Title",          // Required
  content: "<p>HTML content</p>",  // Required, sanitized on save
  excerpt: "Short description",
  category: "wellness",            // e.g., ed-treatment, hormone-therapy, weight-loss
  author: "Author Name",
  featuredImage: "https://...",    // Must be https:// or / relative
  tags: ["tag1", "tag2"],
  publishedAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

### Blog Categories (defaults)

- `ed-treatment` - ED Treatment
- `hormone-therapy` - Hormone Therapy
- `weight-loss` - Weight Loss
- `womens-health` - Women's Health
- `wellness` - Wellness
- `news` - News

## URL Redirects

Configured in `netlify.toml`:
- `/api/blog-webhook` → Netlify function
- `/api/admin-auth` → Netlify function
- `/blog/:slug` → `/blog/article.html?slug=:slug` (pretty URLs)

## Service Information

Reference `llms.txt` for clinic details, services, products, and PHUN Protocol explanation when generating content.
