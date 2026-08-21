# Contributing to Erratic Maps

Thanks for your interest in contributing. This guide explains the required workflow and the engineering standards used in this repository.

These requirements exist to keep the codebase coherent, extensible, and maintainable as the project grows. The goal is not extra process, but contributions that are easy to review, safe to build on, and consistent with the long-term architecture.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/ErraticL/erratic-maps.git
cd erratic-maps
bun install
```

### 2. Optional: configure environment variables

```bash
cp .env.example .env
```

Environment variables are optional for local development. Check [`.env.example`](./.env.example) for the available entries.

### 3. Start the development server

```bash
bun install
bun run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

Environment variables are documented in [`.env.example`](./.env.example).

- They are optional for most local work.
- For testing, they must not be set unless a specific test case explicitly requires them.
- Do not assume environment values are present for core functionality.
- Access environment values only through `src/core/config.ts`.

## Where a change belongs

Erratic Maps is a fork of [Terraink](https://github.com/yousifamanuel/terraink)
and it tracks upstream through deliberate merges. Send a change to the
repository that owns it:

| Your change | Where it goes |
| --- | --- |
| A feature or a fix that is not specific to this fork | Upstream Terraink. Read their `CONTRIBUTING.md` and follow their `dev -> beta -> main` model. |
| A feature or a fix of an Erratic-only part (presets, plate, relief, sheet, permalinks, the themes of this fork, the interface skin) | This repository. |

## Branch Strategy

This repository has ONE branch, `main`, and a push to it deploys the
site. There is no `dev` and no `beta` here; those two branches exist
upstream.

Branch from `main`, name the branch after the change
(`fix/geocoding-error`, `feat/svg-export`), and open the pull request
against `main`. Keep the diff small: a large divergence from upstream
makes every later merge harder, and that cost falls on the whole
project.

## Contribution Flow

1. Pick an existing issue, or open a new issue first to discuss the bug or feature.
2. Create a branch from `main` with a short descriptive name such as `fix/geocoding-error` or `feat/svg-export`.
3. Implement the change in a focused, minimal diff.
4. Run `bun install`.
5. Run `bun run build` and verify the build passes before opening a PR.
6. Open a pull request against `main` and fill out the pull request template completely.
7. Add screenshots for visible UI changes.
8. Wait for maintainer review. Do not merge your own PR.

## Pull Request Requirements

Before requesting review, make sure your PR satisfies all of the following:

- The PR targets `main`, which is the only branch of this repository.
- The PR description clearly explains what changed, why it changed, and any known limitations.
- UI contributions include screenshots or a short demo of the final behavior.

Maintainers may close PRs that do not follow the agreed feature scope, or do not meet the engineering standards below.

## Commit Messages

Follow the emoji-style Conventional Commits format used in this repo. See [`.vscode/commit-instructions.md`](./.vscode/commit-instructions.md) for the full reference.

```text
<emoji> <type>(<scope>): <subject>
```

Common types:

| Emoji | Type       | When to use                              |
| ----- | ---------- | ---------------------------------------- |
| `✨`  | `feat`     | New feature                              |
| `🐛`  | `fix`      | Bug fix                                  |
| `♻️`  | `refactor` | Code restructure without behavior change |
| `🖌️`  | `ui`       | UI-only changes with no logic changes    |
| `📚`  | `docs`     | Documentation only                       |
| `🔧`  | `chore`    | Maintenance, tooling, or dependencies    |
| `🎨`  | `style`    | Formatting-only changes                  |
| `⚡`  | `perf`     | Performance improvements                 |
| `🗑️`  | `del`      | Remove files or code                     |

Rules:

- Subject must be lowercase, imperative, and must not end with a period.
- Subject max length is 50 characters; full line max length is 72 characters.
- One logical change per commit.

Examples:

```text
✨ feat(theme): add dark mode preset
🐛 fix(geocoding): handle null response from nominatim
♻️ refactor(poster): extract layer drawing into helper
📚 docs(readme): update setup instructions
```

## Code Quality

- Keep code clean, readable, and reusable.
- The implementation must match the requested behavior and UX, not only a partial interpretation.
- The diff should be intentionally engineered, not just reorganized to satisfy feedback superficially.
- Build features as standalone modules or components whenever practical, then import them into the consuming screens.
- If something is reused, extract it into a shared component, hook, constant, or utility.
- Reuse existing components and hooks when they already cover the use case.
- Prefer short, focused functions over long, complex ones.
- Compose behavior through clear abstractions and interfaces.
- Separate rendering, state or configuration, and data handling where possible.
- Avoid hard-coded values. Use named constants, configuration objects, or shared tokens instead.
- Prefer scalable and maintainable UI assets and controls over placeholders or one-off shortcuts.
- Follow the naming conventions in [`agent.md`](./agent.md).
- Add concise comments where intent is not immediately obvious.
- Do not bypass the port/adapter architecture. Read [`agent.md`](./agent.md) before adding new infrastructure code.

## AI-Assisted Contributions

AI-assisted coding is allowed. Vibe-coded submissions are not.

- Review, refine, and fully understand any generated code before opening a PR.
- Make sure generated code follows the project architecture, naming, and modularity standards.
- Do not submit generated output that still contains hard-coded assumptions, weak abstractions, or incomplete UX requirements.
- If a maintainer asks for a specific engineering direction, implement that direction intentionally instead of pasting agent output with minimal changes.

## The license of your contribution

**This repository has no Contributor License Agreement.** Nothing to
sign, and nobody collects rights beyond the license below.

Erratic Maps is licensed under the **GNU Affero General Public License
v3.0 (AGPL-3.0)**, which the upstream license requires. See
[`LICENSE`](./LICENSE) for the full text. When you open a pull request
here, you offer your contribution under that same license. You keep the
copyright of your work.

Upstream Terraink runs its own Contributor License Agreement, and it
allows the upstream maintainer to relicense a contribution. This
repository cannot accept that agreement for them, and it does not ask
you for one. If you want your change upstream as well, open it there
and follow their rules.

The `LICENSE` file carries an upstream additional term about dual
licensing. That term is a reservation of the upstream copyright holder,
and it covers the upstream code. It gives this fork no right over your
contribution, and this fork asks for none.
