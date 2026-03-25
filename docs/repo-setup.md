# Repository Setup Guide

One-time steps to complete in the GitHub UI after applying the files in this PR.

---

## 1. Branch protection (Settings → Branches → Add rule)

**Branch name pattern:** `main`

Enable these options:
- [x] Require a pull request before merging
  - [x] Require approvals: **0** (solo dev — just enforces the PR flow)
  - [ ] Dismiss stale pull request approvals when new commits are pushed (optional)
- [x] Require status checks to pass before merging
  - Search for and add these required checks:
    - `Build & Test` (from `api.yml`)
    - `Lint & Build` (from `web.yml`)
    - `Validate & What-If` (from `infra.yml` — only when infra changes)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches → add yourself
- [x] Allow force pushes: **off**
- [x] Allow deletions: **off**

---

## 2. Environments (Settings → Environments)

Create two environments:

### `staging`
- No protection rules — deploys here automatically on every merge to main
- Add environment secrets (copy from repo-level secrets where applicable):
  - `AZURE_API_PUBLISH_PROFILE`
  - `AZURE_STATIC_WEB_APPS_API_TOKEN`
  - `NEXT_PUBLIC_API_URL`
  - `AZURE_CREDENTIALS`
  - `DB_ADMIN_PASSWORD`
  - `JWT_KEY`
  - `RESEND_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

### `production`
- [x] Required reviewers → add yourself
  - This creates a manual approval gate: the workflow pauses and emails you before deploying to prod
- [x] Prevent self-review: **off** (you're the only reviewer — self-approval is fine)
- Add environment secrets (prod-specific values):
  - `AZURE_API_APP_NAME_PROD`
  - `AZURE_API_PUBLISH_PROFILE_PROD`
  - `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`
  - `NEXT_PUBLIC_API_URL_PROD`
  - `AZURE_CREDENTIALS_PROD`
  - `RESOURCE_GROUP_PROD`
  - `STACK_NAME_PROD`
  - `DB_ADMIN_PASSWORD_PROD`
  - `JWT_KEY_PROD`
  - `RESEND_API_KEY_PROD`
  - `STRIPE_SECRET_KEY_PROD`
  - `STRIPE_WEBHOOK_SECRET_PROD`

---

## 3. Labels (Settings → Labels)

The `create-issues.sh` script creates the labels it needs, but confirm these exist:

| Label | Colour | Use |
|-------|--------|-----|
| `enhancement` | `#0075ca` | New features |
| `bug` | `#d73a4a` | Bugs |
| `frontend` | `#7057ff` | Next.js / UI work |
| `backend` | `#e4e669` | .NET API work |
| `dx` | `#cfd3d7` | Developer experience |
| `ux` | `#bfd4f2` | User experience |
| `seo` | `#f9d0c4` | SEO work |
| `testing` | `#0e8a16` | Test coverage |
| `dependencies` | `#0075ca` | Dependabot PRs |
| `ci` | `#cfd3d7` | Pipeline changes |

---

## 4. Dependabot (automatic after committing `.github/dependabot.yml`)

No UI steps needed — Dependabot activates as soon as the config file is on `main`.

To verify: **Insights → Dependency graph → Dependabot** should show the three ecosystems (npm, NuGet, GitHub Actions) within a few minutes.

---

## 5. Quick verification checklist

After completing the above:

- [ ] Create a test branch, push a commit, open a PR → CI checks appear and must pass
- [ ] Merge the PR → staging deploy runs automatically, production deploy pauses for approval
- [ ] Approve the production deploy → it completes
- [ ] Attempt a direct push to `main` → GitHub rejects it