# Claude Code Memory - DIY Accounting Spreadsheets

## Context Survival (CRITICAL — read this first after every compaction)

**After compaction or at session start:**

1. Read all `PLAN_*.md` files in the project root — these are the active goals
2. Run `TaskList` to see tracked tasks with status
3. Do NOT start new work without checking these first

**During work:**

- When the user gives a new requirement, add it to the relevant `PLAN_*.md` or create a new one
- Track all user goals as Tasks with status (pending -> in_progress -> completed)
- Update `PLAN_*.md` with progress before context gets large

**PLAN file pattern:**

- Active plans live at project root: `PLAN_<DESCRIPTION>.md`
- Each plan has user assertions verbatim at the top (non-negotiable requirements)
- Plans track problems, fixes applied, and verification criteria
- If no plan file exists for the current work, create one before starting
- Never nest plans in subdirectories — always project root

## Quick Reference

This repository manages the **spreadsheets AWS account** (064390746177) for spreadsheets.diyaccounting.co.uk:

- **S3 + CloudFront static site** for `spreadsheets.diyaccounting.co.uk`
- **SpreadsheetsStack**: S3 bucket, CloudFront distribution with OAC, CloudFront Function for URL redirects
- **Redirect engine**: CloudFront Function generated from `web/spreadsheets.diyaccounting.co.uk/redirects.toml`
- **Package pipeline**: Excel workbooks in `packages/` -> zips in `target/zips/` -> S3 sync
- **Donations**: Stripe Payment Links (buy.stripe.com) and PayPal donate form

**What this repo does NOT have**: Lambda, DynamoDB, Cognito, API Gateway, Docker, ngrok, HMRC. DNS records are managed by the root repo.

## Account Structure

```
AWS Organization Root (887764105431) ── Management
├── gateway ─────────── 283165661847 ── Workloads OU
├── spreadsheets ────── 064390746177 ── Workloads OU  ← THIS ACCOUNT
├── submit-ci ──────── 367191799875 ── Workloads OU
├── submit-prod ────── 972912397388 ── Workloads OU
└── submit-backup ──── 914216784828 ── Backup OU
```

## Git Workflow

**You may**: create branches, commit changes, push branches, open pull requests

**You may NOT**: merge PRs, push to main, delete branches, rewrite history

**Branch naming**: `claude/<short-description>`

## Build Commands

```bash
npm install
node scripts/build-spreadsheets-redirects.cjs
node scripts/build-sitemaps.cjs
./mvnw clean verify
node scripts/build-packages.cjs
npm run cdk:synth
```

## Testing

```bash
npm test                                    # Unit tests (vitest) — SEO validation + smoke tests
npm run test:browser                        # Browser tests (Playwright) — HTML content validation
npm run test:spreadsheetsBehaviour-local    # Behaviour tests against local server (localhost:3000)
npm run test:spreadsheetsBehaviour-ci       # Behaviour tests against CI environment
npm run test:spreadsheetsBehaviour-prod     # Behaviour tests against production
```

Behaviour tests use the `SPREADSHEETS_BASE_URL` environment variable to target different environments. Output is automatically teed to `spreadsheetsBehaviour.log` in the project root.

## CDK Architecture

**Single CDK application** (`cdk-spreadsheets/`):

- Entry point: `SpreadsheetsEnvironment.java` -> `spreadsheets.jar`
- Stack: `{env}-spreadsheets-SpreadsheetsStack` (S3 + CloudFront + OAC + redirects)

**Java packages** (`co.uk.diyaccounting.spreadsheets`):

- `spreadsheets` — `SpreadsheetsEnvironment.java` (CDK app entry point)
- `spreadsheets.stacks` — `SpreadsheetsStack.java` (S3 + CloudFront + OAC + CloudFront Function)
- `spreadsheets.utils` — `Kind.java` (logging), `KindCdk.java` (CDK utilities)

## Web Content

Static site files live in `web/spreadsheets.diyaccounting.co.uk/public/`. This is the document root deployed to S3.

Key pages: `index.html` (product catalogue), `download.html` (zip downloads), `donate.html` (Stripe + PayPal), `knowledge-base.html`, `community.html`, `references.html`, `sources.html`.

Redirects are configured in `web/spreadsheets.diyaccounting.co.uk/redirects.toml` and compiled to a CloudFront Function by `scripts/build-spreadsheets-redirects.cjs`. The generated `redirect-function.js` is gitignored.

## Package Pipeline

Excel workbook source files live in `packages/` organised by product and tax year. The `scripts/build-packages.cjs` script:

1. Scans `packages/` directories for Excel workbooks
2. Creates zip archives in `target/zips/`
3. Generates `web/spreadsheets.diyaccounting.co.uk/public/catalogue.toml`

During deployment, zips are uploaded to S3 separately from the BucketDeployment (`prune(false)` prevents BucketDeployment from deleting them).

## Formatting

- Spotless with Palantir Java Format (100-column width)
- Prettier for JS/YAML/JSON/TOML
- Runs during Maven `install` phase (Spotless) and CI (both)
- Fix: `./mvnw spotless:apply` and `npx prettier --write .` (only when asked)

## Compliance

```bash
npm run compliance:ci-report-md    # Run all compliance checks and generate report (CI)
npm run compliance:prod-report-md  # Run all compliance checks and generate report (prod)
```

## Deployment

Deployments are triggered via GitHub Actions workflows:

| Workflow     | Purpose                                          | Trigger                       |
| ------------ | ------------------------------------------------ | ----------------------------- |
| `test.yml`   | Lint, format check, Maven verify, CDK synth      | Push, PRs, daily schedule     |
| `deploy.yml` | Deploy SpreadsheetsStack, upload zips, smoke test | Push to main, manual dispatch |

GitHub repository variables:

| Variable                       | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `SPREADSHEETS_ACTIONS_ROLE_ARN` | OIDC auth for spreadsheets account |
| `SPREADSHEETS_DEPLOY_ROLE_ARN`  | CDK deploy in spreadsheets account |
| `SPREADSHEETS_CERTIFICATE_ARN`  | ACM certificate for CloudFront     |

## AWS CLI Access

Use SSO profiles:

```bash
aws sso login --sso-session diyaccounting
aws --profile spreadsheets cloudformation describe-stacks --region us-east-1
aws --profile spreadsheets cloudfront list-distributions
```

**Read-only AWS operations are always permitted.** Ask before any write operations.

## AWS Write Operations (CRITICAL)

**ALWAYS ask before writing to AWS.** Any mutating operation (create, update, delete) requires explicit user approval.

## Confirm Means Stop and Wait (CRITICAL)

When the user says "confirm each command" or similar:

1. **Present the command** in a code block.
2. **STOP. Do not execute.** Wait for the user to explicitly approve.
3. Only after the user says "yes", "go ahead", "run it", or similar, execute that single command.
4. Then present the next command and **STOP again**.

## Code Quality Rules

- **No unnecessary formatting** — don't reformat lines you're not changing
- **No import reordering** — considered unnecessary formatting
- **No backwards-compatible aliases** — update all callers consistently
- Only run `./mvnw spotless:apply` when specifically asked

## Security Checklist

- Never commit secrets — use AWS Secrets Manager ARNs
- Check IAM for least privilege (avoid `Resource: "*"`)
- OIDC trust policies scoped to specific repository
