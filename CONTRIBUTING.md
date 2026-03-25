# Contributing to NoCo Make Lab

> Internal guide for working on this codebase.

---

## Branch naming

All work happens on a branch. Never commit directly to `main`.

| Prefix | Use for |
|--------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Refactors, dependency updates, tooling |
| `docs/` | Documentation only |

**Format:** `type/issue-number-short-description`

```
feature/18-live-price-estimate
fix/23-stl-viewer-error-boundary
chore/24-consolidate-font-imports
```

Tie to the issue number whenever one exists — GitHub auto-links branches and PRs to issues.

---

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>: <short description in present tense>
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to users |
| `fix` | Bug fix |
| `chore` | Refactor, deps, tooling — no behaviour change |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `ci` | GitHub Actions / pipeline changes |

**Examples:**

```
feat: add live price estimate to new order form
fix: wrap STL viewer in error boundary
chore: consolidate Bebas Neue font import into root layout
test: add MaterialService unit tests
ci: add staging environment gate to deploy jobs
```

**Rules:**
- Lowercase, present tense, no period at end
- Keep the subject line under 72 characters
- Reference the issue in the body if helpful: `Closes #18`

---

## Pull request workflow

1. Create a branch from `main` using the naming convention above
2. Make your changes — commit early and often, squash before PR if noisy
3. Push and open a PR against `main`
4. Fill in the PR template — especially the `Closes #N` line
5. CI must pass before merging (build, lint, tests)
6. Squash merge preferred to keep `main` history linear

---

## Environments

| Environment | Trigger | Purpose |
|-------------|---------|---------|
| `staging` | Merge to `main` (auto) | Dev Azure resources — safe to break |
| `production` | Merge to `main` (manual approval) | Live site at nocomakelab.com |

Production deploys require a manual approval step in GitHub Actions. Don't bypass it.

---

## Secrets

Never commit secrets, connection strings, or API keys. All secrets live in:

- **GitHub Actions:** `Settings → Secrets and variables → Actions`
- **Local dev:** `appsettings.Development.json` (git-ignored) or `.env.local` (git-ignored)

If you add a new secret, document the key name (not the value) in `appsettings.json` as an empty placeholder and note it in your PR description.

---

## Project structure quick reference

```
src/api/          .NET 10 Clean Architecture API
  PrintHub.API/       Controllers, middleware, DI wiring
  PrintHub.Core/      Entities, DTOs, interfaces (no dependencies)
  PrintHub.Infrastructure/  EF Core, repositories, external services
  PrintHub.Tests/     xUnit tests

src/web/          Next.js 14 frontend (App Router)
  app/                Pages (grouped by route segment)
  components/         Shared UI components
  lib/                API clients, hooks, utilities, stores

infrastructure/   Azure Bicep IaC (modular)
.github/          Workflows, templates, Dependabot config
```

**Key rule:** Business logic and authorisation checks belong in the service layer (`PrintHub.API/Services/`). Controllers stay thin — validate input, call service, return response.