# Roadmap

## SEO & Discoverability

- [ ] **Google Search Console** — Submit sitemap, monitor indexing, and track keyword performance (see setup steps below)
- [ ] **Blog / content pages** — Add server-rendered pages (e.g. "How to create a free map poster") to drive organic traffic; an SPA alone is limited since Google mostly sees a single URL
- [ ] **Submit to directories** — List Erratic Maps on Product Hunt, AlternativeTo, Futurepedia, and similar design-tool directories
- [ ] **OpenStreetMap community** — Showcase Erratic Maps in OSM forums, wiki tool pages, and community channels
- [ ] **Backlink outreach** — Reach out to map/design blogs for reviews or mentions
- [ ] **Social media presence** — Regular posts showcasing poster examples on Instagram, Reddit (r/MapPorn, r/Design), and X/Twitter to build domain authority

## Code Quality

- [ ] **TypeScript strict mode** — Migrate to `strict: true` and remove `allowJs`; currently gradual (`strict: false`, `allowJs: true`)
- [ ] **Fix pre-existing type errors** — `pngExporter.ts`, `StartupLocationModal.tsx`, `typography.ts` have unresolved TS errors

## Features

- [ ] **Expand export formats** — Additional export options or quality settings beyond current PNG, PDF, SVG
- [ ] **Markers improvements** — Enhance the `markers` feature (custom icons, bulk import, etc.)
- [ ] **Theme gallery** — Browsable theme previews to make discovery easier
- [ ] **Accessibility audit** — Ensure full keyboard navigation and screen reader support across all features. Partly done on 2026-08-20: a global `prefers-reduced-motion` block now covers every animation, the startup dialog and the release notes no longer stack two `aria-modal` dialogs at once, and hover styles are gated so a tap on a phone does not leave a hover state stuck. Still open: a screen reader pass, and 7 focus rules in `desktop.css` that sit inside a `hover: hover` media query and therefore do not apply on a large touch device with no mouse.

## Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Click **Add Property** and choose **URL prefix** method
3. Enter `https://maps.erraticl.uk`
4. Verify ownership using one of these methods:
   - **HTML meta tag** (easiest): Add the verification `<meta>` tag Google gives you to `index.html` `<head>`
   - **DNS TXT record**: Add a TXT record to your domain's DNS settings
   - **HTML file**: Upload a verification HTML file to `public/`
5. Once verified:
   - Go to **Sitemaps** in the left sidebar
   - Submit `https://maps.erraticl.uk/sitemap.xml`
   - Go to **URL Inspection** and request indexing for `https://maps.erraticl.uk`
6. Monitor the **Performance** tab for keyword impressions, clicks, and average position
