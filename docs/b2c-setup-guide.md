# Entra External ID Setup Guide

Step-by-step instructions to complete issue #102. All steps are in the **Microsoft Entra admin center** (`entra.microsoft.com`) unless noted otherwise.

> **Note:** Azure AD B2C is no longer available for new tenants (deprecated May 1, 2025).
> We are using **Microsoft Entra External ID** instead — the direct successor. Same MSAL libraries,
> same `Microsoft.Identity.Web` on the API, same overall architecture. Authority URLs use
> `ciamlogin.com` instead of `b2clogin.com`.

---

## ✅ Completed Steps

The following have already been done:

- **Tenant created:** `nocomakelab.onmicrosoft.com` (Tenant ID: `f66965b9-4848-4af1-ab25-6e6402f51f34`)
- **`noco-api` registered** with scope `api://1a9319c1-f130-4363-82a7-e1e2057b0aac/access_as_user`
- **`noco-web` registered** as SPA with `access_as_user` permission granted
- **Identity providers configured:** Microsoft Entra ID, Email one-time passcode, Microsoft, Google
- **`SignUpSignIn` user flow created** with Email with password + Google
- **Secrets stored** in `kv-authlogin` Key Vault and GitHub Actions secrets

---

## 🔧 Remaining Steps

### Step 1 — Fix Google Redirect URIs in Google Cloud Console

This is what caused the `Error 400: redirect_uri_mismatch`. The guide originally listed only one redirect URI, but Entra External ID requires **all seven** of the following URIs to be registered in Google Cloud Console.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services** → **Credentials**
2. Click on the OAuth 2.0 Client ID you created for Entra External ID
3. Under **Authorized redirect URIs**, remove any existing entry and add **all seven** of these:

```
https://login.microsoftonline.com
https://login.microsoftonline.com/te/f66965b9-4848-4af1-ab25-6e6402f51f34/oauth2/authresp
https://login.microsoftonline.com/te/nocomakelab.onmicrosoft.com/oauth2/authresp
https://f66965b9-4848-4af1-ab25-6e6402f51f34.ciamlogin.com/f66965b9-4848-4af1-ab25-6e6402f51f34/federation/oidc/accounts.google.com
https://f66965b9-4848-4af1-ab25-6e6402f51f34.ciamlogin.com/nocomakelab.onmicrosoft.com/federation/oidc/accounts.google.com
https://nocomakelab.ciamlogin.com/f66965b9-4848-4af1-ab25-6e6402f51f34/federation/oauth2
https://nocomakelab.ciamlogin.com/nocomakelab.onmicrosoft.com/federation/oauth2
```

4. Also ensure **Authorized JavaScript origins** includes:
   - `https://login.microsoftonline.com`

5. Click **Save** and wait a few minutes for changes to propagate

> Also make sure the OAuth consent screen has `ciamlogin.com` and `microsoftonline.com` listed under **Authorized domains**.

---

### Step 2 — Link `noco-web` to the User Flow

1. In the Entra admin center (external tenant), go to **Entra ID** → **External Identities** → **User flows**
2. Click **SignUpSignIn**
3. In the left menu, click **Applications** → **Add application**
4. Select `noco-web` → **Select**

> Without this step, the "Run user flow" test won't work correctly.

---

### Step 3 — Enable Email OTP as an Authentication Method

> The identity provider page shows Email one-time passcode as "Configured" (meaning it's available for primary sign-in), but you also need to enable it as an **authentication method** so it can be used as the MFA second factor.

1. In the external tenant, go to **Entra ID** → **Authentication methods**
2. In the Method list, select **Email OTP**
3. Under **Enable and Target**, turn the **Enable** toggle **On**
4. Under **Include** → **Target**, select **All users**
5. Click **Save**

---

### Step 4 — Add Google to the User Flow Identity Providers

> Google is configured as a tenant-level identity provider, but still needs to be added to the specific user flow.

1. Go to **Entra ID** → **External Identities** → **User flows** → **SignUpSignIn**
2. In the left menu, click **Identity providers**
3. Under **Other Identity Providers**, check **Google**
4. Click **Save**

---

### Step 5 — Create an MFA Conditional Access Policy

> Unlike B2C where MFA was a direct user flow setting, Entra External ID enforces MFA through **Conditional Access policies**.

1. In the external tenant, go to **Entra ID** → **Conditional Access** → **Policies** → **New policy**
2. **Name:** `Require MFA for all customers`
3. Under **Assignments** → **Users**:
   - Include tab: **All users**
   - Exclude tab: add your admin/break-glass account so you don't lock yourself out
4. Under **Target resources**:
   - Include tab: **Select resources** → select `noco-web` → **Select**
5. Under **Access controls** → **Grant**:
   - Select **Grant access**
   - Check **Require multifactor authentication**
   - Click **Select**
6. Set **Enable policy** to **On**
7. Click **Create**

---

### Step 6 — Test the User Flow

1. Go to **Entra ID** → **External Identities** → **User flows** → **SignUpSignIn**
2. Click **Run user flow**
3. Set **Application** to `noco-web`, **Reply URL** to `http://localhost:3000`
4. Click **Run user flow**
5. Test sign-up with Google — should now work without the redirect error
6. Test sign-up with Email + Password — should prompt for MFA (email OTP) after first factor
7. On success, you'll see a JWT — the flow works ✅

---

### Step 7 — Merge the PR and Close the Issue

Once the test in Step 6 passes, merge the PR that contains `docs/b2c-config.md` and `docs/b2c-setup-guide.md`. The commit message includes `closes #102` which will auto-close the issue on merge.

After merging, issues #104 (API auth code) and #108 (frontend auth code) can begin in parallel.

---

## Reference Links

- [Create an external tenant — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal)
- [Add Google as an identity provider — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-google-federation-customers)
- [Create a user flow — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers)
- [Add MFA to a customer app — Microsoft Learn](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-multifactor-authentication-customers)
- [React SPA + Entra External ID sample — Microsoft Learn](https://learn.microsoft.com/en-us/samples/azure-samples/ms-identity-ciam-javascript-tutorial/ms-identity-ciam-javascript-tutorial-1-call-api-react/)
