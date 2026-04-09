# code-tara Branding

This document outlines the visual identity and branding guidelines for code-tara.

## Overview

code-tara uses a professional, cohesive visual identity across all platforms. Our branding assets are organized in the [`branding/`](../branding/) folder at the repository root.

## Logo & Symbol

### Symbol Logos

- **symbol-gold.svg** — Primary symbol (gold variant) used in UI
- **symbol-dark.svg** — Dark variant for light backgrounds
- **symbol-white.svg** — White variant for dark backgrounds

### Lockup Logos

- **lockup-light-bg.svg** — Full logo with text for light backgrounds (used in README & headers)
- **lockup-dark-bg.svg** — Full logo with text for dark backgrounds

### Usage

- **Headers**: Use lockup logos (light or dark depending on background)
- **UI Components**: Use symbol logos (gold as primary, adapt variants for theme)
- **Small Spaces**: Use symbol logos (they're compact and recognizable)

## Favicon

- **favicon.svg** — SVG favicon for browser tabs and bookmarks

## Badges & Indicators

- **badge-reviewed.svg** — Badge used to indicate "tara reviewed" status

## Social Media & Sharing

- **social-preview.png** — PNG preview for social sharing (og:image, twitter:card)
- **social-preview.svg** — SVG version for flexibility

## Brand Guide

See [`branding/brand-guide.html`](../branding/brand-guide.html) for detailed color palette, typography, and design guidelines.

## Design Tool Blueprint

See [`branding/brand-tool-blueprint.md`](../branding/brand-tool-blueprint.md) for design system specifications and component guidelines.

## Integration

### Frontend Assets

All branding assets used in the frontend are copied to `frontend/public/` for serving:
- `symbol-gold.svg` — Primary UI logo
- `favicon.svg` — Browser favicon
- `lockup-light-bg.svg` — Header logo
- `badge-reviewed.svg` — Status badge icon

### README

The main README uses the `lockup-light-bg.svg` for the hero section.

### GitHub

GitHub templates use consistent language and reference code-tara branding in headers:
- Pull request template: `.github/pull_request_template.md`
- Bug report template: `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature request template: `.github/ISSUE_TEMPLATE/feature_request.md`

## Color Palette

Primary colors (from brand guide):
- **Gold**: Used as primary accent color in UI and logos
- **Dark Gray**: For text and primary UI elements
- **Light Gray**: For backgrounds and secondary elements

## Contributing

When adding new features or components, please:
1. Use the appropriate branding assets from `branding/` or `frontend/public/`
2. Follow the color palette and typography guidelines from the brand guide
3. Reference this documentation for any questions about visual identity

---

For more details, see the full [brand guide](../branding/brand-guide.html).
