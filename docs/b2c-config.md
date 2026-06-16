# Entra External ID Configuration

Non-secret configuration values for the PrintHub Entra External ID tenant.
Captured as part of issue #102. See `docs/b2c-setup-guide.md` for how these were obtained.

> **Note:** Azure AD B2C was deprecated for new tenants on May 1, 2025.
> This project uses **Microsoft Entra External ID** (CIAM) as the direct replacement.
> The code integration is identical — same MSAL packages and `Microsoft.Identity.Web` —
> with `ciamlogin.com` authority URLs instead of `b2clogin.com`.

> **Secrets** (Tenant ID, client secrets, Google client secret) are stored in Azure Key Vault
> (`kv-authlogin`) and GitHub Actions secrets — not in this file.

---

## Tenant

| Key | Value |
|-----|-------|
| Tenant name | `Noco Make Lab` |
| Primary domain | `nocomakelab.onmicrosoft.com` |
| Tenant ID | `f66965b9-4848-4af1-ab25-6e6402f51f34` |
| CIAM login domain | `nocomakelab.ciamlogin.com` |

---

## App Registrations

| App | Client ID |
|-----|-----------|
| `noco-api` | `1a9319c1-f130-4363-82a7-e1e2057b0aac` |
| `noco-web` | `8ad5bf72-42a1-4f68-9e22-7c26eba98e8c` |

---

## API Scope

> **Note:** The App ID URI used the default `api://` format rather than the custom domain format.
> Use this exact value everywhere a scope is referenced in code.

| Key | Value |
|-----|-------|
| App ID URI | `api://1a9319c1-f130-4363-82a7-e1e2057b0aac` |
| Full scope URI | `api://1a9319c1-f130-4363-82a7-e1e2057b0aac/access_as_user` |

---

## User Flow

| Key | Value |
|-----|-------|
| User flow name | `SignUpSignIn` |
| Identity providers | Email with password, Google |
| MFA | Via Conditional Access policy (see setup guide Step 5) |

---

## Endpoints & URIs

| Key | Value |
|-----|-------|
| Authority | `https://nocomakelab.ciamlogin.com/nocomakelab.onmicrosoft.com` |
| Known authorities | `https://nocomakelab.ciamlogin.com` |
| OpenID metadata | `https://nocomakelab.ciamlogin.com/nocomakelab.onmicrosoft.com/v2.0/.well-known/openid-configuration` |

---

## Redirect URIs (`noco-web`)

| Environment | URI |
|-------------|-----|
| Local dev | `http://localhost:3000` |
| Staging | `https://<static-web-app-staging-url>` |
| Production | `https://<static-web-app-prod-url>` |

---

## Token Claims Returned

| Claim | Description |
|-------|-------------|
| `sub` / `oid` | User's Object ID (stable unique identifier) |
| `email` | Primary email address |
| `given_name` | First name |
| `family_name` | Last name |
| `name` | Display name |

> Unlike B2C, Entra External ID does not return a `newUser` claim. JIT provisioning in #105
> should check whether the user's `oid` already exists in the database on first API call.

---

## Usage in Code

### API (`appsettings.json`)
```json
{
  "AzureAd": {
    "Instance": "https://nocomakelab.ciamlogin.com/",
    "Domain": "nocomakelab.onmicrosoft.com",
    "TenantId": "f66965b9-4848-4af1-ab25-6e6402f51f34",
    "ClientId": "1a9319c1-f130-4363-82a7-e1e2057b0aac",
    "Scopes": "access_as_user"
  }
}
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_ENTRA_CLIENT_ID=8ad5bf72-42a1-4f68-9e22-7c26eba98e8c
NEXT_PUBLIC_ENTRA_AUTHORITY=https://nocomakelab.ciamlogin.com/nocomakelab.onmicrosoft.com
NEXT_PUBLIC_ENTRA_KNOWN_AUTHORITY=https://nocomakelab.ciamlogin.com
NEXT_PUBLIC_ENTRA_SCOPE=api://1a9319c1-f130-4363-82a7-e1e2057b0aac/access_as_user
NEXT_PUBLIC_ENTRA_REDIRECT_URI=http://localhost:3000
```

---

## Acceptance Criteria Checklist (issue #102)

- [x] External tenant exists at `nocomakelab.onmicrosoft.com` and is linked to the Azure subscription
- [x] `noco-api` app registration exists with the `access_as_user` scope exposed
- [x] `noco-web` app registration exists with SPA redirect URIs configured and admin consent granted
- [x] Google identity provider configured in External Identities
- [x] Microsoft identity provider configured in External Identities
- [x] Email one-time passcode identity provider configured
- [x] `SignUpSignIn` user flow created with Email + Google
- [ ] Google redirect URIs fixed in Google Cloud Console (see setup guide Step 1 — 7 URIs required)
- [ ] `noco-web` app linked to the `SignUpSignIn` user flow (User flows → Applications → Add)
- [ ] Email OTP enabled as authentication method under Entra ID → Authentication methods (setup guide Step 3)
- [ ] Google added to user flow Identity providers (setup guide Step 4)
- [ ] MFA Conditional Access policy created (see setup guide Step 5)
- [ ] Manual test sign-up completes successfully via **Run user flow**
- [ ] This file committed to repo (closes #102)
