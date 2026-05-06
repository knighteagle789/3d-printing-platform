# PrintHub / NOCO Make Lab — Code Review
**Date:** 2026-05-06  
**Reviewer:** Claude (Cowork mode)  
**Scope:** Full codebase review — API, infrastructure, frontend, tests, dev infrastructure

---

## Executive Summary

This is a well-structured project. The architecture is clean, the separation of concerns is solid, and there are meaningful tests in place. The core order flow, material intake pipeline, and quote system are all in good shape. The items below are prioritised by risk — fix the security issues first, then the bugs, then the quality improvements.

---

## 1. Best Practices — What's Working Well

These are things done right that are worth preserving as the codebase grows.

- **Clean Architecture** — Core / Infrastructure / API layers are properly separated. Domain models don't bleed into infrastructure concerns.
- **Repository + Unit of Work** — Repositories are interface-backed, the UoW pattern is consistently applied.
- **FluentValidation** — Auto-registered from assembly, validators exist for all major request types (register, login, create order, quotes, materials, content).
- **Global Exception Middleware** — Maps all domain exceptions to correct HTTP status codes. Includes trace IDs and sanitised log messages. Development mode returns stack traces; production does not.
- **Log Sanitization** — `LogSanitizer` and `SanitizeForLog()` extension used throughout. Prevents log injection.
- **Database Resilience** — `EnableRetryOnFailure(5, 30s)` on the Npgsql connection. This will save you from transient Azure database blips.
- **Auto-Timestamps** — `DbContext.UpdateTimestamps()` intercepts `SaveChanges` — no risk of forgetting to set `CreatedAt`/`UpdatedAt`.
- **Order Status Machine** — `IsValidStatusTransition()` enforces a strict state graph. No one can jump from Draft directly to Printing.
- **Email Enumeration Prevention** — `ForgotPasswordAsync` always returns 200 regardless of whether the email exists.
- **BCrypt Password Hashing** — Using `BCrypt.Net-Next` with work factor defaults.
- **API Versioning** — URL-segment versioning (`/api/v1/`) is in place and correctly configured.
- **Enum-as-String JSON** — All enums serialise as strings throughout the API (e.g. `"InReview"` not `2`). Correct frontend deserialization is guaranteed.
- **Feature Flag for Intake** — `Intake:FeatureEnabled` / `Intake:Enabled` config flag with graceful 503 response.
- **Block-Upload for Large Files** — `StageBlockAsync` + `CommitBlocksAsync` properly handles large STL/OBJ uploads rather than loading the entire file into memory.
- **Test Coverage** — Unit tests for OrderService (including status transition matrix), AuthService, MaterialService, QuoteService, and IntakeExtractionProcessor. Integration tests for MaterialIntakeController covering auth, feature-flag, and happy-path scenarios.

---

## 2. Security Issues (Fix Before Production)

### 2.1 CORS is Completely Wide Open 🔴
**File:** `src/api/PrintHub.API/Program.cs` line 161

```csharp
policy.SetIsOriginAllowed(_ => true)  // ← temporary diagnostic
```

This allows any origin to make credentialed requests to your API. The correct configuration is commented out just above it. Uncomment and use the origin allowlist instead:

```csharp
policy.SetIsOriginAllowed(origin =>
    origin == "https://your-static-webapp.azurestaticapps.net" ||
    origin.StartsWith("http://localhost:"))
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials();
```

### 2.2 JWT Secret in appsettings.json 🔴
**File:** `src/api/PrintHub.API/appsettings.json`

The placeholder key `"YourSuperSecretKeyThatIsAtLeast32CharactersLong!"` is committed to source control. Even as a placeholder, this is a risk if someone deploys without overriding it. Move it to:
- **Development:** `dotnet user-secrets set "Jwt:Key" "your-dev-key"`
- **Production:** Azure Key Vault or App Service app settings (never in code/git)

Similarly, `AllowedHosts: "*"` should be tightened in production.

### 2.3 No HTTP Security Headers 🟠
**File:** `src/api/PrintHub.API/Program.cs`

There is no middleware for security headers. Add these before shipping:

```csharp
app.UseHsts();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options", "DENY");
    ctx.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});
```

For Next.js, add security headers in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
```

### 2.4 JWT Stored in localStorage 🟠
**File:** `src/web/lib/stores/auth-store.ts`

`localStorage` is readable by any JavaScript running on the page. If you ever have an XSS vulnerability (even from a third-party script), the token is exposed. For production, consider storing tokens in `HttpOnly` cookies via a Next.js API route acting as a BFF (Backend-for-Frontend). This also eliminates the token-in-URL risk for the refresh flow.

> **Note:** If you proceed with B2C (issues #108-109), MSAL.js handles this correctly using sessionStorage with additional mitigations. That migration would resolve this issue.

### 2.5 Weak Refresh Token Mechanism 🟠
**File:** `src/api/PrintHub.API/Services/AuthService.cs` — `RefreshTokenAsync`

The current refresh approach accepts any expired access token and issues a new one indefinitely. There is no:
- Dedicated refresh token (separate, longer-lived secret)
- Token rotation (each refresh invalidates the previous)
- Revocation mechanism (logout doesn't invalidate server-side)

At minimum, track a `RefreshTokenExpiry` on the user — reject refreshes after, say, 30 days of inactivity.

### 2.6 Rate Limiting Not Implemented 🟠
**File:** `src/api/PrintHub.API/Program.cs`

The project plan calls for rate limiting but it's absent from `Program.cs`. The auth endpoints (login, register, forgot-password) are particularly exposed to credential stuffing and brute force without it. Add at minimum:

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opts =>
    {
        opts.PermitLimit = 10;
        opts.Window = TimeSpan.FromMinutes(1);
    });
});
// Then apply [EnableRateLimiting("auth")] to auth endpoints
```

### 2.7 Production Seeder Has Hardcoded Credentials 🟠
**File:** `src/api/PrintHub.Infrastructure/Data/Databaseseeder.cs` line 99

```csharp
Email = "jwoods@nocowoods.com", // ← change this
PasswordHash = BCrypt.Net.BCrypt.HashPassword("ChangeMe123!"),
```

These are in source control. Drive them from environment variables instead:
```csharp
Email = configuration["Admin:Email"] ?? throw new InvalidOperationException("Admin:Email not configured"),
PasswordHash = BCrypt.Net.BCrypt.HashPassword(configuration["Admin:InitialPassword"] ?? throw new ...),
```

### 2.8 No File Type Validation on the API Side 🟠
The frontend `FileDropzone` validates extensions — but the API should apply defense-in-depth. The current file upload endpoint accepts anything. Add MIME type checking and optionally magic-byte validation server-side.

---

## 3. Redis — You Don't Need It Yet ✅

**Short answer: Remove the Redis container from docker-compose for now.**

The Redis container is running (docker-compose.yml line 47, comment: *"Optional, for later use"*) but there is **zero Redis integration in the codebase** — no `StackExchange.Redis`, no `IDistributedCache`, no caching service, nothing. It's burning memory and adding startup complexity for no benefit.

The natural candidates for caching when you're ready:
- **Materials list** — fairly static, queried on every upload page load. A 5-minute memory cache would cut many DB round trips.
- **Pricing config** — read on every order creation, never changes in real-time.
- **Public portfolio/blog content** — read by anonymous visitors, high read volume if you ever get traffic.

`IMemoryCache` (in-process, no extra infrastructure) handles all three cases fine until you need multi-instance scale-out. Add Redis then. Recommended approach:

```csharp
// No Redis needed yet — just:
builder.Services.AddMemoryCache();
// Inject IMemoryCache in service, cache with 5min sliding expiry
```

---

## 4. B2C Migration — Issues #102–111 Context

I can see all 10 issues on GitHub. Here's the plan they map out and what it means for the current codebase:

| Issue | Title | What it touches |
|-------|-------|-----------------|
| #102  | Provision B2C Tenant and User Flows | Azure portal / Bicep infrastructure |
| #103  | DB Migration — Externally Drop Password Fields | Drops `PasswordHash`, `PasswordResetToken`, `PasswordResetTokenExpiry` from Users table |
| #104  | API Swap JWT Bearer with Microsoft Identity Web | Replace custom `AddJwtBearer` with `AddMicrosoftIdentityWebApi` |
| #105  | API JIT User Provisioning | On first B2C login, create local User record if not exists |
| #106  | API Role Claims Enrichment | Map B2C custom attributes → app roles in the token |
| #107  | API Remove Legacy Auth Endpoint BCrypt | Delete `AuthController` + `AuthService` + BCrypt dependency |
| #108  | Frontend MSAL Setup Auth Store | Replace Zustand JWT store with `@azure/msal-browser` |
| #109  | Frontend Replace Auth Pages B2C Redirect | Remove `/login`, `/register`, `/forgot-password` pages; redirect to B2C flows |
| #110  | Bicep B2C Configuration Parameters | IaC for B2C settings |
| #111  | E2E Smoke Test B2C Auth Flow | End-to-end tests after migration |

**Good news for when you're ready:** The codebase is already well-structured for this migration. Auth is isolated behind `IAuthService` / `AuthController`. The swap will be surgical — mainly replacing the `DependencyInjection` registrations and the JWT bearer config. The complexity is in JIT provisioning (#105) and role claims enrichment (#106).

**Recommended sequencing:** 102 → 103 → 104 → 105 → 106 → 107 → 108 → 109 → 110 → 111 in that order. Don't start #107 (removing old auth) until #104-106 are complete and tested.

**Things to resolve before starting the migration:**
- The CORS wide-open issue (2.1 above) — needs to be locked down regardless
- The rate limiting gap — B2C reduces brute force risk on our side but not on all endpoints
- The existing unit tests for `AuthService` will need to be replaced with B2C-focused integration tests

---

## 5. Additional Improvements

### 5.1 Bug — Portfolio Seed Data Wrong MaterialId 🐛
**File:** `src/api/PrintHub.Infrastructure/Data/Databaseseeder.cs` line 649

The "Medical Training Model" (heart model printed in flexible TPU for realistic feel) references:
```csharp
MaterialId = new Guid("dddddddd-dddd-dddd-dddd-dddddddddddd"), // TPU
```
But that GUID is the **discontinued economy PLA** (the comment is wrong). The TPU material is:
```csharp
MaterialId = new Guid("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbe"), // TPU - Black
```

### 5.2 Bug — File Type Mismatch Between Frontend and API 🐛
**File:** `src/web/app/(dashboard)/upload/file-dropzone.tsx` line 8

```ts
const ALLOWED_EXTENSIONS = ['.stl', '.obj', '.3mf', '.step', '.iges', '.gcode'];
```

But `appsettings.json` `FileAnalysis.SupportedFormats` only lists `["stl", "obj", "3mf"]`. Users can upload `.step`, `.iges`, and `.gcode` files that will never be analysed for weight/print time, breaking the pricing calculation. Align these two lists.

### 5.3 Missing Register Page 🐛
The login page at `src/web/app/(auth)/login/page.tsx` links to `/register`, but no `(auth)/register/page.tsx` file exists in the source tree. If this page doesn't exist, new users can't register from the UI.

### 5.4 Missing Customer Orders List Page 🐛
There is a `(dashboard)/orders/[id]/edit/page.tsx` but no `(dashboard)/orders/page.tsx`. Customers have no order list page to navigate to after logging in.

### 5.5 Double Query in UpdateOrderStatusAsync 🟡
**File:** `src/api/PrintHub.API/Services/OrderService.cs` lines 322 and 338

When an order status notification is triggered, `GetOrderWithDetailsAsync` is called twice — once to get user info for the email (line 322) and again to build the response (line 338). Use the first result for both:

```csharp
var updated = await _orderRepo.GetOrderWithDetailsAsync(orderId);
if (updated?.User != null && notifyStatuses.Contains(status))
{
    await _emailService.SendOrderStatusUpdateAsync(...);
}
return OrderResponse.FromEntity(updated!);
```

### 5.6 Order Number Race Condition 🟡
**File:** `src/api/PrintHub.API/Services/OrderService.cs` — `GenerateOrderNumberAsync()`

```csharp
var count = await _orderRepo.CountAsync() + 1;
return $"ORD-{year}-{count:D5}";
```

Two simultaneous order creations can receive the same count value before either commits. Use a PostgreSQL sequence instead:

```sql
CREATE SEQUENCE order_number_seq START 1;
```

```csharp
var seq = await _context.Database
    .SqlQuery<long>($"SELECT nextval('order_number_seq')")
    .SingleAsync();
return $"ORD-{year}-{seq:D5}";
```

### 5.7 Fire-and-Forget Email Tasks 🟡
**File:** `src/api/PrintHub.API/Services/AuthService.cs` lines 63 and 251

```csharp
_ = Task.Run(async () => {
    await _emailService.SendWelcomeEmailAsync(user.Email, user.FirstName);
});
```

`Task.Run` in an ASP.NET context is dangerous — the request scope (and its DI services) may be disposed before the task completes, causing `ObjectDisposedException`. The email services being `Scoped` makes this especially risky. Either:
- Await the email call directly (acceptable — Resend is fast and errors are caught internally), or
- Use a proper background job (Hangfire, .NET's `IBackgroundTaskQueue`, or an Azure Queue message)

### 5.8 `AddOptions()` Called Twice 🟡
**File:** `src/api/PrintHub.Infrastructure/DependencyInjection.cs` lines 41 and 45

```csharp
services.AddOptions();
services.AddHttpClient<IResend, ResendClient>();
services.Configure<ResendClientOptions>(...);
services.AddOptions();  // ← duplicate
```

Remove the second call.

### 5.9 `isInitialized` Not Set on setAuth 🟡
**File:** `src/web/lib/stores/auth-store.ts`

```ts
setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });  // isInitialized stays false
},
```

After a successful login, `isInitialized` remains `false`. Any component that gates rendering on `isInitialized` will continue to show a loading state. Add `isInitialized: true` to the `setAuth` `set()` call.

### 5.10 Empty next.config.ts 🟡
**File:** `src/web/next.config.ts`

The config is completely empty. At minimum add:
- `images.remotePatterns` for your Azurite/Azure blob storage domain (required for `<Image>` to load blob-hosted images)
- Security headers (see 2.3 above)
- `output: 'standalone'` for container deployments

### 5.11 No CI/CD Pipelines 🟡
No `.github/workflows/` directory exists. The project plan includes GitHub Actions pipelines for API and frontend deployment. These should be created before deploying — deploying manually is error-prone and bypasses tests.

### 5.12 Missing CancellationToken Propagation 🟡
Most `async` service methods don't accept a `CancellationToken`, so cancelled HTTP requests (user navigates away, browser timeout) continue running in the background and consuming resources. Add `CancellationToken cancellationToken = default` to service interfaces and pass through to EF queries.

### 5.13 `EnsureCreatedAsync()` in Seeder Conflicts with Migrations 🟡
**File:** `src/api/PrintHub.Infrastructure/Data/Databaseseeder.cs` line 27

```csharp
await _context.Database.EnsureCreatedAsync();
```

`EnsureCreatedAsync` bypasses migrations and creates the schema directly from the model. Since `MigrateAsync()` is already called at startup (Program.cs line 186), this is a no-op in normal operation — but in test environments using in-memory databases it can mask schema divergence. Remove it from `SeedAsync`.

### 5.14 Duplicate Item-Building Logic in OrderService 🟡
**File:** `src/api/PrintHub.API/Services/OrderService.cs`

The item-building loop in `CreateOrderAsync` (lines 65-103) and `UpdateOrderAsync` (lines 155-195) is nearly identical. Extract it into a private `BuildOrderItemAsync(CreateOrderItemRequest, ...)` helper to reduce the maintenance burden when pricing logic changes.

---

## 6. End-User Testing

### Environment Assessment

From a screenshot of the secondary monitor, Edge has the GitHub issues page open. The app wasn't running in the browser at the time of review. The Chrome extension was not connected during this session, and the sandbox environment cannot reach `localhost` — so interactive browser testing of the running app was not possible.

**To run a proper end-user test session:**
1. Ensure `docker-compose up -d` has all four services running (postgres, azurite, pgadmin, redis is optional)
2. Start the API: `cd src/api && dotnet run --project PrintHub.API`
3. Start the frontend: `cd src/web && npm run dev`
4. Reconnect the Claude in Chrome extension
5. Then ask for a follow-up end-user test

### What Code Analysis Reveals About the User Experience

Based on code review, these are the anticipated UI/UX issues a real user would encounter:

| Flow | Issue | Severity |
|------|-------|----------|
| Registration | `/register` page may not exist (no page file found) | 🔴 Blocker |
| Login → Dashboard | After login, `isInitialized` stays false — possible loading flash | 🟠 |
| Upload → Order | `.step`, `.iges`, `.gcode` files accepted but never analysed — pricing falls back to $10 flat | 🟠 |
| Order creation | Two concurrent orders could get duplicate order numbers | 🟡 |
| Customer portal | No orders list page (`/orders`) — nowhere to navigate after login | 🔴 Blocker |
| Password reset | Reset flow is correctly implemented and enumeration-safe | ✅ |
| Admin intake | Feature flag, auth, and state-machine correctly guard this flow | ✅ |
| 3D file preview | STL viewer with OrbitControls and analysis is well-implemented | ✅ |

---

## 7. Summary — Prioritised Action List

### 🔴 Fix Now (security / functionality blockers)
1. Lock down CORS (`Program.cs` — uncomment the allowlist)
2. Move JWT secret out of `appsettings.json` → User Secrets / Key Vault
3. Verify or create the `/register` page
4. Verify or create the `/orders` customer dashboard page
5. Add HTTP security headers to both API and Next.js

### 🟠 Fix Before First Real Users
6. Implement rate limiting on auth endpoints
7. Harden the refresh token mechanism (expiry + rotation)
8. Fix the `Task.Run` fire-and-forget email pattern
9. Fix file type mismatch (`.step`/`.iges`/`.gcode` vs supported formats)
10. Remove hardcoded admin credentials from seeder

### 🟡 Fix Soon (quality / correctness)
11. Fix portfolio seed data MaterialId for the medical heart model
12. Fix `isInitialized` not set on `setAuth`
13. Remove duplicate `AddOptions()` call
14. Extract duplicate order item building logic
15. Fix double query in `UpdateOrderStatusAsync`
16. Remove `EnsureCreatedAsync()` from seeder
17. Align `next.config.ts` (image domains, security headers)
18. Add CancellationToken propagation

### ⬜ Do When Ready
19. Replace Redis container with `IMemoryCache` for materials/pricing caching
20. Create GitHub Actions CI/CD pipelines (no `.github/workflows/` found)
21. Add `CancellationToken` to service interfaces
22. Fix order number race condition (PostgreSQL sequence)
23. Begin B2C migration in issue order: 102 → 103 → 104 → 105 → 106 → 107 → 108 → 109 → 110 → 111

---

*Review conducted by Claude — full codebase read including all controllers, services, entities, configurations, migrations, tests, and frontend components.*
