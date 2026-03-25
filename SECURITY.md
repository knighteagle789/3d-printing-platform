# Security Policy

## Supported versions

NoCo Make Lab is currently in active development. Security fixes are applied to
the latest version only.

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ |
| Older commits | ❌ |

---

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue — including exposed credentials, authentication
bypasses, injection vulnerabilities, or data exposure — please report it
privately so it can be addressed before public disclosure.

### How to report

**Option 1 — GitHub private vulnerability reporting (preferred)**
Use GitHub's built-in private reporting:
[Report a vulnerability](../../security/advisories/new)

This creates a private thread between you and the maintainer, tracked through
to resolution.

**Option 2 — Email**
Send details to: **security@noco3dworks.com**

Please include:
- A description of the vulnerability
- Steps to reproduce (if applicable)
- The potential impact
- Any suggested remediation (optional but appreciated)

---

## What to expect

| Timeframe | Action |
|-----------|--------|
| Within 48 hours | Acknowledgement of your report |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Resolution or documented mitigation plan |

You'll be kept informed throughout. If a CVE is warranted, you'll be credited
in the advisory unless you prefer to remain anonymous.

---

## Scope

The following are **in scope**:

- `nocomakelab.com` and any subdomains
- The PrintHub API (`src/api/`)
- The Next.js frontend (`src/web/`)
- Azure infrastructure configuration (`infrastructure/`)
- Authentication and authorisation logic
- File upload handling
- Payment processing integration

The following are **out of scope**:

- Vulnerabilities in third-party dependencies (report these upstream)
- Denial of service attacks
- Issues requiring physical access to infrastructure
- Social engineering

---

## Disclosure policy

This project follows responsible disclosure. We ask that you:

1. Give us reasonable time to address the issue before any public disclosure
2. Avoid accessing or modifying data that isn't yours
3. Avoid actions that could impact service availability for other users

We will not pursue legal action against researchers who follow these guidelines
in good faith.