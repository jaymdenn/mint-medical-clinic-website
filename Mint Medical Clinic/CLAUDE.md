# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mint Medical Clinic website - a static marketing site for a medical clinic in Utah specializing in intimacy health, ED treatment, hormone therapy, and weight loss services. The site is deployed via Netlify.

## Project Structure

```
Mint Medical Clinic/
├── website/
│   ├── index.html          # Single-page website
│   ├── css/style.css       # All styles (1600+ lines with responsive breakpoints)
│   ├── js/script.js        # Mobile menu, scroll effects, animations
│   ├── images/             # Site images and assets
│   ├── Products/           # Product images
│   └── .netlify/state.json # Netlify deployment config
└── Images/                 # Additional image assets
```

## Development

This is a simple static site with no build process. To preview:
- Open `website/index.html` directly in a browser, or
- Use any local server (e.g., `npx serve website` or VS Code Live Server)

Deployed via Netlify (site ID in `.netlify/state.json`).

## CSS Architecture

- Uses CSS custom properties defined in `:root` (brand colors, fonts, spacing)
- Key brand color: `--mint: #3EB489`
- Responsive breakpoints: 1024px (tablet), 768px (mobile), 480px (small mobile)
- Component-based organization: header, hero, services, products, PHUN framework, about, process, testimonials, CTA, footer

## Key Technical Notes

- Fixed header height defined as `--header-height` CSS variable (changes per breakpoint)
- Service cards use background images with semi-transparent overlays (see `.service-*` classes)
- Mobile menu uses `.mobile-open` class toggle with slide-down animation
- Intersection Observer used for scroll animations (`.animate-target` / `.animate-in`)

## External Integrations

- Google Fonts: Inter font family
- Netlify: Deployment/hosting
- Zoho Bookings: Appointment scheduling (linked from CTAs)
