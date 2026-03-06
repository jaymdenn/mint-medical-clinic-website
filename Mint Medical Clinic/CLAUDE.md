# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mint Medical Clinic website - a static marketing site for a medical clinic in Utah specializing in intimacy health, ED treatment, hormone therapy, and weight loss services. The site includes a blog with admin dashboard and e-commerce via Snipcart.

## Project Structure

```
website/
├── index.html              # Main homepage
├── about.html, process.html, results.html, services.html, products.html, blog.html, financing.html
├── services/               # Individual service pages (ED, hormones, weight loss, etc.)
├── Products/               # Product detail pages with Snipcart buy buttons
├── blog/article.html       # Dynamic article page (loads content via JS)
├── admin/index.html        # Blog admin dashboard (self-contained SPA)
├── css/style.css           # All styles (~3000+ lines)
├── js/
│   ├── script.js           # Mobile menu, animations, scroll effects
│   └── blog.js             # Blog listing and article rendering
├── netlify/functions/      # Serverless backend
│   ├── admin-auth.js       # Auth, users, sessions, categories
│   └── blog-webhook-simple.js  # Article CRUD operations
└── images/                 # Site images and logos
```

## Development

Static site with no build process. To preview:
- Open `website/index.html` directly in a browser
- Use `npx serve website` or VS Code Live Server

Deployed via Netlify. Netlify Functions require deployment to work (they don't run locally without `netlify dev`).

## Key Systems

### Blog System

**Frontend:**
- `blog.html` - Listing page with category filtering and pagination
- `blog/article.html` - Dynamic article page that loads content from API
- `js/blog.js` - Fetches articles from `/api/blog-webhook`, handles rendering and SEO

**Backend (Netlify Functions):**
- `/api/blog-webhook` → `blog-webhook-simple.js`
  - GET: Returns all articles sorted by date
  - POST: Create/update/delete articles
  - Uses Netlify Blobs store: `articles`

**Article structure:**
```javascript
{ slug, title, excerpt, content, category, featuredImage, author, publishedAt, updatedAt }
```

### Admin Dashboard

Single-page app at `/admin/index.html` with:
- Session-based authentication (tokens stored in localStorage)
- Article CRUD with rich text editor
- Category management
- User management

**Auth API:** `/api/admin-auth` → `admin-auth.js`
- Actions: login, logout, validate, create-user, change-password, check-setup
- Category actions: list-categories, create-category, update-category, delete-category
- Uses Netlify Blobs stores: `admin-users`, `admin-sessions`, `blog-categories`

**Secret access:** Click logo 7 times to navigate to `/admin/`

### E-Commerce (Snipcart)

Products in `/Products/*.html` use Snipcart buy buttons:
```html
<button class="snipcart-add-item btn"
    data-item-id="product-slug"
    data-item-price="29.99"
    data-item-url="/Products/product.html"
    data-item-name="Product Name">
    Add to Cart
</button>
```

Snipcart loads on user interaction via script in `index.html`.

## CSS Architecture

- CSS custom properties in `:root` (brand colors, fonts, spacing)
- Key brand color: `--mint: #3EB489`, `--mint-dark: #2d8a69`
- Responsive breakpoints: 1024px (tablet), 768px (mobile), 480px (small mobile)
- Fixed header with `--header-height` variable

## JavaScript Patterns

- Mobile menu: `.mobile-open` class toggle
- Scroll animations: Intersection Observer with `.animate-target` / `.animate-in`
- Counter animations: `data-target` and `data-suffix` attributes on `.stat-number`
- KSL offer popup: minimize/expand with sessionStorage persistence

## External Integrations

- **Netlify:** Hosting, serverless functions, Blobs storage
- **Snipcart:** E-commerce cart/checkout
- **Google Fonts:** Inter font family
- **Zoho Bookings:** Appointment scheduling (CTAs link to `new-consultation.zohobookings.com`)

## Netlify Functions

Located in `website/netlify/functions/`. Install dependencies:
```bash
cd website/netlify/functions && npm install
```

Environment variables needed for Blobs (set in Netlify dashboard):
- `NETLIFY_AUTH_TOKEN` - For API access
- `SITE_ID` - Site identifier (fallback hardcoded: `38e7c65c-9693-4bec-9e83-e2312bd923db`)
