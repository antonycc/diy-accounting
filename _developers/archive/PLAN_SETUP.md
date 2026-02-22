# PLAN: Gateway Repository Setup

## User Assertions (non-negotiable)

- This is `antonycc/www.spreadsheets.diyaccounting.co.uk` — the gateway static site repo
- Gateway AWS account: 283165661847
- S3 + CloudFront static site for `www.spreadsheets.diyaccounting.co.uk` and `spreadsheets.diyaccounting.co.uk`
- test.yml should run behaviour tests against a local running version of the site started with `npm start`
- Behaviour tests only differ in config between local/CI/prod (env var `GATEWAY_BASE_URL`)
- All compliance reporting combined into `REPORT_ACCESSIBILITY_PENETRATION.md` like submit
- Copy LICENSE (AGPL-3.0) from root repo and apply SPDX copyright/licence headers matching submit
- Corporate landing page linking to subsites (submit, spreadsheets) — secure via static, low cost
- Repository is a bastion of good practice, minimal dependencies, template-ready
- De-duped, documented, and scripted enough to replicate: add account info + domain → live site in 5-25 minutes
- Working branch: `pristine`

## Context (from submit PLAN_ACCOUNT_SEPARATION.md)

### Account Structure

| Account        | ID           | Repository                          | Purpose                |
|----------------|--------------|-------------------------------------|------------------------|
| Management     | 887764105431 | `antonycc/root.spreadsheets.diyaccounting.co.uk` | Route53, holding page  |
| **gateway**    | 283165661847 | `antonycc/www.spreadsheets.diyaccounting.co.uk`  | **This repo**          |
| spreadsheets   | 064390746177 | `antonycc/diy-accounting` (future)  | Spreadsheets site      |
| submit-ci      | 367191799875 | `antonycc/feature-a.spreadsheets.diyaccounting.co.uk` | Submit CI            |
| submit-prod    | 972912397388 | `antonycc/feature-a.spreadsheets.diyaccounting.co.uk` | Submit prod          |
| submit-backup  | 914216784828 | —                                   | Cross-account backup   |

### Repository Separation Status

- 2.1 COMPLETE: Root → `antonycc/root.spreadsheets.diyaccounting.co.uk`
- **2.2 IN PROGRESS: Gateway → `antonycc/www.spreadsheets.diyaccounting.co.uk`** ← this plan
- 2.3 Pending: Spreadsheets → `antonycc/diy-accounting`
- 2.4: Submit repo cleanup

### Quality Baseline (from submit)

- Java: Spotless + Palantir (100-column width)
- JS/YAML/JSON/TOML: Prettier
- Dependency management: npm-check-updates (`.ncurc.cjs` filters pre-release) + Maven
- Architecture diagrams: cfn-diagram
- Workflow validation: actionlint
- Node >=24.0.0
- AGPL-3.0 licence with SPDX headers on all source files

---

## Work Done (branch `gatewayascdk`, merged to `main` via PR #1)

### Cleanup — removed submit-specific leftovers

- [x] Deleted `scripts/build-sitemaps.cjs` — spreadsheets-specific, referenced non-existent paths
- [x] Deleted `.github/actions/get-names/action.yml` — submit-specific with DIY_SUBMIT_* variables
- [x] Fixed `scripts/update-java.sh` — wrong CDK output dir (`cdk-submit-root.out` → `cdk-submit-gateway.out`)
- [x] Fixed `GatewayStack.java` tags — referenced `feature-a.spreadsheets.diyaccounting.co.uk` → `www.spreadsheets.diyaccounting.co.uk`
- [x] Rewrote `.prettierignore` — removed submit-specific entries
- [x] Added `"type": "module"` to `package.json` for ES module support

### Brought over from root repo

- [x] `.ncurc.cjs` — filters alpha/beta/rc/dev/canary/experimental/pre from npm-check-updates
- [x] `.editorconfig` — UTF-8, LF, trim trailing whitespace, Java 140-col width

### Brought over from submit repo

- [x] Behaviour tests: `behaviour-tests/gateway.behaviour.test.js`
- [x] Behaviour test helpers: `behaviour-tests/helpers/playwrightTestWithout.js`, `behaviour-helpers.js`
- [x] Browser tests: `web/browser-tests/gateway-content.browser.test.js`
- [x] Unit tests: `web/unit-tests/seo-validation.test.js`
- [x] `playwright.config.js`, `vitest.config.js`

### Compliance testing infrastructure

- [x] `.pa11yci.ci.json` and `.pa11yci.prod.json`
- [x] `eslint.security.config.js`, `.retireignore.json`
- [x] `scripts/text-spacing-test.js`, `scripts/generate-compliance-report.js`

### Deployment workflow

- [x] `.github/workflows/deploy.yml` — params + deploy-gateway + test-gateway jobs
- [x] `.github/workflows/test.yml` — build + unit-test + browser-test + behaviour-test jobs

### Licence and copyright

- [x] `LICENSE` (AGPL-3.0) copied from root repo
- [x] SPDX headers on all source files

### Local development and testing

- [x] `npm start` — serves static site locally
- [x] `test:gatewayBehaviour-local` script
- [x] Redirect test auto-skips when running locally

---

## Remaining Work (branch `pristine`)

### Phase 1: Fix copy-paste inconsistencies from submit repo

Nine files still reference `cdk-submit-gateway.out` — a leftover from when this code lived in the submit repo. Should be `cdk-gateway.out`.

| File | Line(s) | Current | Fix to |
|------|---------|---------|--------|
| `cdk-gateway/cdk.json` | 3 | `../cdk-submit-gateway.out` | `../cdk-gateway.out` |
| `package.json` | 63 | `cdk-submit-gateway.out` | `cdk-gateway.out` |
| `.github/workflows/deploy.yml` | 136, 146 | `cdk-submit-gateway.out` | `cdk-gateway.out` |
| `scripts/update-java.sh` | 13 | `cdk-submit-gateway.out` | `cdk-gateway.out` |
| `.gitignore` | 3 | `/cdk-submit-gateway.out/` | `/cdk-gateway.out/` |
| `.prettierignore` | 6 | `cdk-submit-gateway.out/` | `cdk-gateway.out/` |
| `.retireignore.json` | 11 | `cdk-submit-gateway.out/` | `cdk-gateway.out/` |
| `eslint.security.config.js` | 47 | `cdk-submit-gateway.out/` | `cdk-gateway.out/` |

Plus one stale comment:

| `pom.xml` | 277 | `<!-- Source directory matches submit repo layout -->` | Remove or update |

- [x] Fix all 9 `cdk-submit-gateway.out` → `cdk-gateway.out` references
- [x] Fix stale submit comment in `pom.xml`
- [x] Verify `npm run cdk:synth` still works after rename
- [ ] Verify `npm run diagram:gateway` still works after rename (deferred — requires cfn-diagram)

### Phase 2: Smoke test for local dev server

Add a lightweight unit test that starts the local server and verifies pages render. This provides a quick "does it work?" check without the full Playwright suite.

- [x] Create `web/unit-tests/smoke.test.js` — vitest test (node http server on random port, fetches index/about/404/robots/css)
- [x] Runs as part of `npm run test:unit` (19 tests total: 13 SEO + 6 smoke)

### Phase 3: AWS_RESOURCES.md generation script

Generate `AWS_RESOURCES.md` from live AWS data, like we do for compliance reports and architecture diagrams. Add to `package.json` alongside `diagram:gateway`.

- [x] Create `scripts/generate-aws-resources.js` (queries CloudFormation, CloudFront, S3, IAM, ACM, Lambda, CloudWatch via AWS CLI)
- [x] Add `resources:gateway` to `package.json`
- [x] Add `AWS_RESOURCES.md` to `.gitignore`
- [x] Remove static `AWS_RESOURCES.md` from tracking (`git rm --cached`)

### Phase 4: Template tooling

#### 4a. `scripts/template-clean.sh`

Runs first when using this repo as a template. Replaces DIY Accounting-specific content with RFC 2606 placeholders (`spreadsheets.diyaccounting.co.uk`).

- [x] Create `scripts/template-clean.sh` (replaces domains, company name, directors, addresses, GA4 ID, company number, redirects, SPDX copyright with placeholders)

#### 4b. `scripts/template-init.sh`

Runs after `template-clean.sh`. Interactive script that takes real values and applies them.

- [x] Create `scripts/template-init.sh` (interactive prompts for domain, company, GitHub antonycc, AWS account, Java package, CDK prefix; renames dirs/files, updates all references)

#### 4c. `TEMPLATE.md`

- [x] Create `TEMPLATE.md` — full quick start guide, prerequisites, step-by-step, appendix for AWS bootstrapping

### Phase 5: CLAUDE.md and documentation updates

- [x] Update CLAUDE.md — added Testing, Compliance sections, `resources:gateway`, template-clean.sh warning
- [x] Update README.md — added Testing section, Development Tools (`resources:gateway`), Template Repository link

### Phase 6: GitHub repository setup verification

- [x] Verify repository variables are configured: `GATEWAY_ACTIONS_ROLE_ARN`, `GATEWAY_DEPLOY_ROLE_ARN`, `GATEWAY_CERTIFICATE_ARN`
- [x] Fixed `GATEWAY_ACTIONS_ROLE_ARN` (was pointing to management account role, now points to gateway account role)
- [x] Updated `gateway-github-actions-role` OIDC trust policy to include `www.spreadsheets.diyaccounting.co.uk`
- [ ] Verify `ci` and `prod` environments exist with scoped variables
- [ ] Verify branch protection on `main`
- [ ] Enable "Template repository" in GitHub Settings
- [ ] Verify compliance report end-to-end: `npm run compliance:ci-report-md` (requires deployed CI environment)

---

## Verification Criteria

1. `npm run cdk:synth` — CDK synthesis succeeds (output in `cdk-gateway.out/`, not `cdk-submit-gateway.out/`)
2. `npm test` — all unit tests pass (including new smoke test)
3. `npm run test:browser` — all browser tests pass
4. `npm start` — serves static site locally on port 3000
5. `GATEWAY_BASE_URL=http://localhost:3000 npm run test:gatewayBehaviour-local` — behaviour tests pass
6. `npm run formatting` — no formatting issues
7. `npm run diagram:gateway` — generates architecture diagram
8. `npm run resources:gateway` — generates AWS_RESOURCES.md (when authenticated)
9. `npm run compliance:ci-report-md` — generates compliance report
10. All source files have SPDX copyright headers
11. `scripts/template-clean.sh` runs without errors and produces valid placeholder site
12. `scripts/template-init.sh` runs without errors and produces valid customised site
13. GitHub Actions workflows pass (test.yml, deploy.yml)
14. No remaining references to `cdk-submit-gateway` anywhere in the repo
15. TEMPLATE.md documents the full template workflow
