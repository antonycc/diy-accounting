# Plan: Donation and Download Testing

## User Assertions

- Stripe on CI should go to Stripe sandbox
- Donations from Stripe and PayPal should be testable
- Zipped Excel packages need to be downloadable on a test server
- Behaviour tests should ideally test donations and downloads

## Current State

The spreadsheets site is static but includes donation flows via Stripe Payment Links (buy.stripe.com) and a PayPal donate form. Currently:

- **Stripe links** are hardcoded live URLs in `donate.html` (£10, £20, £45, custom amount) — redirect back to `download.html?stripe=success`
- **PayPal form** posts to `https://www.paypal.com/donate` with button ID `XTEQ73HM52QQW`
- **Zip packages** downloaded from `/zips/{filename}` on S3
- **Behaviour tests** verify links/forms exist but don't test actual payment flow
- **`ecommerce-events.js`** and **`download-page.js`** fire GA4 events for downloads and donations

## Phase 1: Stripe Sandbox Switching

**Problem**: `donate.html` hardcodes live `buy.stripe.com` Payment Links. CI deployments should use Stripe test mode.

**Approach options**:

### Option A: Environment-specific donate.html generation
- Build script generates `donate.html` with environment-appropriate Stripe links
- CI uses test mode Payment Links, prod uses live ones
- Requires: template HTML + build step in deploy workflow

### Option B: JavaScript-based switching
- `donate.html` includes a small script that checks the hostname
- If hostname starts with `ci-`, replace Payment Link URLs with test mode equivalents
- Simpler but test links visible in source

### Option C: Stripe checkout session (server-side)
- Not applicable — the site is fully static, no server-side code

**Recommended**: Option A (build-time generation) for clean separation.

**Tasks**:
1. Create test mode Stripe products and Payment Links using `scripts/stripe-spreadsheets-setup.js` with test API key
2. Create `donate-template.html` with placeholder URLs
3. Create `scripts/build-donate-page.cjs` that injects correct URLs based on environment
4. Update deploy workflow to run the build step with environment context
5. Update behaviour tests to verify the correct Stripe domain (test vs live)

## Phase 2: PayPal Sandbox

**Problem**: PayPal donate form posts to live `paypal.com/donate`.

**Options**:
- PayPal Sandbox mode with test button ID — requires PayPal developer account setup
- Accept manual testing only — PayPal donation is secondary and low-traffic
- Mock the form action in CI behaviour tests (verify form structure, skip actual submit)

**Recommended**: Mock approach for CI (verify form exists with correct structure), manual testing for actual PayPal flow. PayPal sandbox setup is disproportionate effort for a secondary donation option.

**Tasks**:
1. Behaviour tests already verify PayPal form exists (`#paypal-donate-form`, action URL, button ID) — sufficient for CI
2. Document manual PayPal testing procedure in this plan

## Phase 3: Zip Download Verification

**Current state**: Behaviour tests already verify zip download works (PK magic bytes check in `spreadsheets.behaviour.test.js`).

**Requirements for CI**:
1. `build-packages.cjs` must run during deployment to generate `target/zips/*.zip`
2. `aws s3 sync target/zips/ s3://{BUCKET}/zips/ --delete` uploads zips after CDK deploy
3. Behaviour tests fetch a zip and verify PK magic bytes

**Status**: Already implemented in `deploy.yml`. The deploy workflow runs `build-packages.cjs` then syncs zips to S3. Behaviour test "Download a zip file and verify it is valid" confirms this works.

**Tasks**:
1. Verify `build-packages.cjs` runs correctly in diy-accounting repo (paths may differ)
2. Confirm zip download test passes against CI after first deployment

## Phase 4: End-to-End Donation Flow Tests

**Goal**: Extend behaviour tests to follow the donate→return→download flow.

**Stripe flow**:
1. Navigate to `donate.html?product=X&filename=Y.zip`
2. Click a Stripe Payment Link (opens buy.stripe.com)
3. Complete payment (test card `4242424242424242`)
4. Stripe redirects to `download.html?stripe=success&product=X`
5. Verify success message and download link

**Challenge**: Stripe hosted checkout is on a different domain. Playwright can follow cross-domain redirects but filling Stripe's checkout form requires knowledge of their UI (see submit repo's payment test patterns).

**PayPal flow**:
1. Navigate to `donate.html`
2. Verify PayPal form has correct action and hidden fields
3. (Manual only) Submit form, complete on PayPal, return to `donate.html?st=Completed`

**Tasks**:
1. Add Stripe checkout flow test (test mode only, requires test Payment Links from Phase 1)
2. Add `?stripe=success` return page verification test
3. Add `?st=Completed` return page verification test (PayPal success return)
4. Document Stripe test card numbers and expected flows

## Phase 5: Local Development

**Goal**: Ensure `npm start` serves a fully functional site for local testing.

**Current state**:
- `npm start` runs `http-server web/spreadsheets.diyaccounting.co.uk/public -p 3000`
- Static HTML/CSS/JS loads fine
- Zip downloads require running `build-packages.cjs` first (generates to `target/zips/`)
- Local server doesn't serve from `target/zips/` — zips are at `/zips/` in S3 but not locally

**Tasks**:
1. Option A: `build-packages.cjs` outputs to `web/spreadsheets.diyaccounting.co.uk/public/zips/` for local dev
2. Option B: Symlink `web/spreadsheets.diyaccounting.co.uk/public/zips/` → `target/zips/`
3. Option C: Copy zips to public dir in a `prestart` npm script
4. Update `npm start` or add `npm run dev` that builds packages then starts server

## Phase 6: GA4 E-commerce Events

**Goal**: Verify analytics events fire correctly in test vs production.

**Current state**:
- `ecommerce-events.js` fires GA4 `purchase` and `begin_checkout` events
- `download-page.js` fires `file_download` events
- GA4 property 523400333, measurement ID on all pages

**Tasks**:
1. Verify GA4 events are blocked in behaviour tests (the `playwrightTestWithout.js` helper already blocks RUM/GA/GTM)
2. Consider adding a test that verifies GA4 script tags are present in HTML but blocked during tests
3. No changes needed for test vs production — GA4 filtering is done in GA4 admin (exclude CI traffic by hostname)

## Verification Criteria

- [ ] Stripe test mode Payment Links work on CI deployment
- [ ] Behaviour test downloads a zip and verifies PK magic bytes (already passing)
- [ ] Behaviour test verifies Stripe links point to correct domain (test vs live)
- [ ] Behaviour test verifies PayPal form structure
- [ ] Local `npm start` can serve zip downloads after `build-packages.cjs`
- [ ] `?stripe=success` return page shows success message
- [ ] `?st=Completed` return page shows success message

## Priority Order

1. Phase 3 (verify zips work) — likely already passing, just confirm
2. Phase 1 (Stripe sandbox) — needed before CI donation testing
3. Phase 4 (E2E donation tests) — depends on Phase 1
4. Phase 5 (local dev) — convenience improvement
5. Phase 2 (PayPal sandbox) — low priority, manual testing acceptable
6. Phase 6 (GA4) — verification only, no code changes expected
