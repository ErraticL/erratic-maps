# Erratic Maps — Agent Architecture Guide

> **For any AI coding agent working on this codebase.**
> Read this file fully before writing, editing, or deleting any code.

This repository is Erratic Maps, a fork of Terraink. The architecture
below comes from upstream and still holds; the sections that differ in
the fork say so.

## Zero Hallucination Rule

- **Do not invent** file paths, exported names, types, or API shapes. Read the actual file first.
- **Do not assume** a function exists because it sounds reasonable. Verify with a file or symbol search.
- **If you are unsure**, say so and ask, or read the relevant source file before proceeding.
- **If a requested feature violates the architecture in this file, warn the user before writing any code.**

## Architecture: Feature-based + Hexagonal/Clean

The codebase is split into vertical feature slices under `src/features/`, each with four layers:

- **`domain/`** — pure types, interfaces (ports), and pure logic. No React, no I/O.
- **`application/`** — React hooks that orchestrate use cases using domain + `core/services`.
- **`infrastructure/`** — concrete adapters (HTTP, cache, parsers). Implements domain ports.
- **`ui/`** — React components. Read state from context, dispatch actions, import application hooks.

### Feature inventory

```text
src/features/
  export/     install/    layout/     legal/      location/
  map/        markers/    poster/     presets/    routes/
  share/      theme/      updates/
```

`legal/`, `presets/`, `routes/` and `share/` are newer than upstream.
`presets/` holds the eleven curated starting points of release 0.9.0,
and `share/` holds the permalink codec.

Cross-cutting concerns live outside features:

- **`core/`** — `ICache`, `IHttp`, `IFontLoader` ports and their adapters. `config.ts` for all env vars. `services.ts` wires all adapters into named singletons consumed by application hooks.
- **`shared/geo/`** — geographic math and pure utilities.
- **`shared/hooks/`** — reusable React hooks used across features (`useRepoStars`, `useSwipeDown`, `useAdhesionOffset`, `useConsentButtonSlot`).
- **`shared/ui/`** — UI atoms (icons, modals) used across features.
- **`shared/utils/`** — helper utilities (color, location, number, string).
- **`data/`** — static JSON data files (themes, layouts, presets).
- **`styles/`** — global CSS only (13 files). Desktop breakpoint `>980px`, mobile `≤760px`.

### Layer import rules

| Layer | May import | Must not import |
| --- | --- | --- |
| `domain/` | nothing | infrastructure, application, ui, React |
| `application/` | domain, shared, core/config, core/services | infrastructure directly |
| `infrastructure/` | domain, shared, core | application, ui, React |
| `ui/` | domain, application, shared/ui, shared/utils | infrastructure directly |
| `core/services.ts` | infrastructure adapters | any feature (no circular deps) |

## State Management

- **Single source of truth**: `PosterContext` — React Context + `useReducer`.
- `posterReducer.ts` owns `PosterState`, `PosterForm`, and the `PosterAction` discriminated union.
- **No prop drilling** — components call `usePosterContext()` directly.
- Side-effect logic lives in application hooks: `useFormHandlers`, `useMapSync`, `useLocationAutocomplete`, `useCurrentLocation`, `useExport`, `useExportResolution`, `usePermalinkSync`, `usePresets`.

## Key Application Hooks

| Hook | Feature | Purpose |
| --- | --- | --- |
| `useFormHandlers` | poster | form input and location handlers |
| `useMapSync` | map | bidirectional map ↔ form sync |
| `useLocationAutocomplete` | location | debounced search with stale-result guard |
| `useCurrentLocation` | location | GPS + reverse-geocode shared handler |
| `useRecentLocations` | location | the recent places of this device |
| `useExport` | export | poster export orchestration |
| `useExportResolution` | export | export resolution tiers, the readout and the stored choice |
| `useSessionAnalytics` | export | session events |
| `usePermalinkSync` | share | the URL hash, in both directions |
| `usePresets` | presets | the preset list, the active preset and the apply action |
| `useGpxUpload` | routes | a GPX file becomes a route |
| `useLegalDoc` | legal | the privacy text, fetched and cached |
| `useInstallPrompt` | install | PWA install prompt |
| `useRepoStars` | shared/hooks | GitHub star count with cache |
| `useSwipeDown` | shared/hooks | mobile swipe gesture |

## Services (`src/core/services.ts`)

Pre-instantiated singletons — the only place application hooks should import I/O capabilities from:

```ts
searchLocations            // location autocomplete (Nominatim)
geocodeLocation            // name → coordinates
reverseGeocodeCoordinates  // coordinates → name
listRecentLocations        // the recent places of this device
addRecentLocation
removeRecentLocation
clearRecentLocations
ensureFont                 // font loading; the fonts are self-hosted
compositeExport            // poster compositing
captureMapAsCanvas         // map → canvas snapshot
createPngBlob              // canvas → PNG
createLayeredSvgBlobFromMap
createPdfBlobFromCanvas
createPosterFilename
triggerDownloadBlob
trackEvent                 // analytics
setUserProperty
fetchMarkdownDoc           // the legal documents
gpxParser                  // a GPX file becomes a route
drawRoutesOnCanvas
```

The font service is `ensureFont`, not `ensureGoogleFont`. The adapter
is `localFontsAdapter`, and the nine typefaces ship with the app.

## TypeScript Rules

- All new files must be `.ts` / `.tsx`. No `.js` in `src/`.
- `strict: false`, `allowJs: true` — gradual migration is acceptable.
- Use the `@/` alias (`src/` root) for all cross-feature imports. Never use `../../` across feature boundaries.
- Port interfaces go in `domain/ports.ts` or `core/*/ports.ts`. Adapters implement ports — never leak concrete types into domain or application code.
- `tsconfig.json` paths: `"@/*": ["./*"]` with `"baseUrl": "src"`.

## Naming Conventions

- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities / pure functions: `camelCase.ts`
- Port interfaces: `I` prefix — `ICache`, `IHttp`, `IGeocodePort`
- CSS classes: `kebab-case`

## Environment Variables

All `VITE_*` env vars are accessed **only** through `src/core/config.ts`. Never read `import.meta.env.*` anywhere else. Env vars are optional for local development — never assume they are present for core functionality. See `.env.example` for the full list.

## Branch Strategy

**This fork has one branch, `main`, and work commits straight to it.**
`origin` carries `main` alone. Do not create a branch unless the user
asks for one.

The promotion model below belongs to UPSTREAM Terraink, and it applies
only to a pull request opened against that repository:

```text
feature/fix branch → dev → beta → main
```

- `dev` — active development; all upstream PRs target this branch
- `beta` — staging and pre-release testing
- `main` — production

`upstream/dev` and `upstream/beta` exist; this fork has neither.

## Contribution and Documentation Rules

- AI-assisted coding is allowed only when the result is reviewed, refined, and aligned with the project architecture.
- Prefer standalone modules, components, hooks, constants, and utilities over hard-coded or tightly coupled implementations.
- In Markdown files, do not place a horizontal rule (`---`) immediately before a heading line such as `#`, `##`, or `###`.
- Fenced code blocks must always declare a language.

## What NOT to Do

- ❌ Do not add logic to `App.tsx` — it must stay a thin shell.
- ❌ Do not import from `@/lib/`, `@/utils/`, `@/hooks/`, or `@/components/` — those directories do not exist; use `@/shared/`.
- ❌ Do not duplicate utility functions — check `shared/utils/` and `shared/geo/` first.
- ❌ Do not call `fetch()`, `localStorage`, or `new URL()` inside React components or hooks — use the port/adapter pattern via `core/services.ts`.
- ❌ Do not add CSS class names without a matching rule in `src/styles/`.
- ❌ Do not bypass `PosterContext` by prop-drilling state more than one level deep.
- ❌ Do not edit `bun.lock` or `package-lock.json` manually — run `bun install`.
- ❌ Do not reference any exported name, type, or file path from memory — always read the source first.
