# Erratic Maps

A fork of Terraink (AGPL-3.0), rebranded and extended, deployed at
https://maps.erraticl.uk. Owner: Marcel (GitHub: ErraticL).

## Read first

- The full decision record, pre-fork survey, and seven execution
  phases: `C:\Users\marce\Desktop\brainstorm\PROJECT.md` — section
  "DECIDED 2026-08-20 (grilled): fork Terraink as Erratic Maps".
- Reference clones and per-repo license rules:
  `C:\Users\marce\Desktop\brainstorm\reference\README.md`. The
  Terraink clone (full history + `mit-era` branch) is at
  `C:\Users\marce\Desktop\brainstorm\reference\terraink`.
- The retired hand-built app (source of the themes and the building
  triad): `C:\Users\marce\Desktop\brainstorm\proto\`.

## Hard constraints

- AGPL-3.0: the fork's source must be published (public GitHub repo
  `erratic-maps`); keep license and copyright notices.
- Trademark (their TRADEMARK.md): do not use the Terraink name or
  logo; the footer credit "Based on Terraink source code" is allowed
  and required by our own honesty.
- Deployment: build `dist/` and deploy into the EXISTING Cloudflare
  Pages project `erraticl-maps` (wrangler; the custom domain stays
  attached). Command shape:
  `npx wrangler pages deploy dist --project-name=erraticl-maps --branch=main`
- Upstream strategy: deliberate merges. Remote `upstream` points at
  https://github.com/yousifamanuel/terraink.git. Keep divergence from
  upstream small so merges stay easy.

## Working rules (paid for in blood in the previous sessions)

- Read the reference code before designing; for compositions, read the
  RENDERER, not just the constants.
- After any visual change, export or screenshot the result and look at
  it with your own eyes before claiming it works.
- Verify each phase in the browser pane before starting the next.
- Browsers cache aggressively; hard-refresh or cache-bust after edits.

## Open items (ask Marcel when relevant)

- Logo/wordmark design (the current boulder mark is an interim design;
  regenerate icons with `node scripts/make-icons.mjs` after replacing
  `public/assets/logo.svg`).
- Impressum / privacy documents (legal modal reads them from env URLs;
  launched with them empty).

---

# Upstream developer guide (Terraink architecture, still accurate)

## Commands

```bash
npm install          # install dependencies (upstream uses bun; both work)
npx vite             # start dev server (http://localhost:5173)
npx vite build       # production build
npx tsc --noEmit     # type-check without emitting
```

## Architecture: Feature-based + Hexagonal/Clean

Source is split into vertical feature slices under `src/features/`:

```text
src/
  features/
    export/       location/     map/          markers/
    install/      layout/       poster/       theme/       updates/
  core/
    cache/        fonts/        http/
    config.ts     services.ts
  shared/
    geo/          hooks/        ui/           utils/
  data/           styles/       types/
```

Each feature has up to four layers:

| Layer | Purpose | React allowed |
| --- | --- | --- |
| `domain/` | Pure types, port interfaces, pure logic | No |
| `application/` | Hooks that orchestrate use cases | Yes |
| `infrastructure/` | Concrete adapters (HTTP, cache, parsers) | No |
| `ui/` | Components that read context and dispatch | Yes |

### Layer import rules

| Layer | May import | Must not import |
| --- | --- | --- |
| `domain/` | nothing | infrastructure, application, ui, React |
| `application/` | domain, shared, core/config, core/services | infrastructure directly |
| `infrastructure/` | domain, shared, core | application, ui, React |
| `ui/` | domain, application, shared/ui, shared/utils | infrastructure directly |
| `core/services.ts` | infrastructure adapters | any feature |

## State Management

- Single source of truth: `PosterContext` — React Context + `useReducer`
- `posterReducer.ts` owns `PosterState`, `PosterForm`, and `PosterAction`
- Components call `usePosterContext()` directly — no prop drilling
- Side-effect logic lives in application hooks: `useFormHandlers`, `useMapSync`, `useGeolocation`, `useLocationAutocomplete`, `useCurrentLocation`, `useExport`

## Key Services (`src/core/services.ts`)

```ts
searchLocations            // location autocomplete
geocodeLocation            // name → coordinates
reverseGeocodeCoordinates  // coordinates → name
ensureGoogleFont           // font loading
compositeExport            // poster compositing
captureMapAsCanvas         // map → canvas
createPngBlob / createPdfBlobFromCanvas / createLayeredSvgBlobFromMap
createPosterFilename       // generate export filename
triggerDownloadBlob        // file download
```

Never call `fetch()`, `localStorage`, or external APIs directly — always go through services.

## TypeScript

- All new files: `.ts` / `.tsx`. No `.js` in `src/`.
- `strict: false`, `allowJs: true` — gradual migration is fine
- Use `@/` alias for all cross-feature imports — never `../../` across feature boundaries
- Port interfaces go in `domain/ports.ts` or `core/*/ports.ts` with an `I` prefix (`ICache`, `IHttp`)

## Environment Variables

All `VITE_*` vars are accessed **only** through `src/core/config.ts`. Never read `import.meta.env.*` anywhere else. Env vars are optional for local development — never assume they are present for core functionality. See `.env.example` for the full list.

## Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities / pure functions: `camelCase.ts`
- Port interfaces: `I` prefix — `ICache`, `IHttp`, `IGeocodePort`
- CSS classes: `kebab-case` with a matching rule in `src/styles/`

## Commit Style

Format: `<emoji> <type>(<scope>): <subject>`

```
🐛 fix(location): fix reverse geocode on startup
♻️ refactor(core): simplify validation flow
✨ feat(map): add zoom-to-fit button
```

One logical change per commit. Subject: lowercase, imperative, no trailing period, max 50 chars, full line max 72 chars.

## Branch Strategy

This fork commits directly to `main`. The upstream
`feature/fix → dev → beta → main` flow applies only to PRs against
upstream. **Do not create a new branch unless the user demands it.**

## Do Not

- Add logic to `App.tsx` — it must stay a thin shell
- Import from `@/lib/`, `@/utils/`, `@/hooks/`, or `@/components/` — those paths do not exist; use `@/shared/`
- Duplicate utilities — check `shared/utils/` and `shared/geo/` before creating new ones
- Call `fetch()`, `localStorage`, or `new URL()` inside components or hooks — use `core/services.ts`
- Add a CSS class without a matching rule in `src/styles/`
- Prop-drill state more than one level — use `usePosterContext()`
- Read any file's exports from memory — always verify the actual source first
