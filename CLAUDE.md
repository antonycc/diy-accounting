# Claude Code Memory - DIY Accounting Gateway

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

This repository manages the **gateway AWS account** (283165661847) for www.spreadsheets.diyaccounting.co.uk:

- **S3 + CloudFront static site** for `www.spreadsheets.diyaccounting.co.uk` and `spreadsheets.diyaccounting.co.uk`
- **GatewayStack**: S3 bucket, CloudFront distribution with OAC, CloudFront Function for URL redirects
- **CloudWatch Logs**: Access logging for CloudFront distribution
- **Redirect engine**: CloudFront Function generated from `web/www.spreadsheets.diyaccounting.co.uk/redirects.toml`

**What this repo does NOT have**: Lambda, DynamoDB, Cognito, API Gateway, Docker, ngrok, HMRC, Stripe, Route53, or any application code. DNS records are managed by the root repo.

## Account Structure

```
AWS Organization Root (887764105431) ── Management
├── gateway ─────────── 283165661847 ── Workloads OU  ← THIS ACCOUNT
├── spreadsheets ────── 064390746177 ── Workloads OU
├── submit-ci ──────── 367191799875 ── Workloads OU
├── submit-prod ────── 972912397388 ── Workloads OU
└── submit-backup ──── 914216784828 ── Backup OU
```

## AWS Accounts and Repositories

| Account           | ID           | Repository                            | Purpose                               |
| ----------------- | ------------ | ------------------------------------- | ------------------------------------- |
| Management (root) | 887764105431 | `antonycc/root.spreadsheets.diyaccounting.co.uk`   | Route53, holding page                 |
| gateway           | 283165661847 | `antonycc/www.spreadsheets.diyaccounting.co.uk`    | **This repo** — Gateway static site   |
| spreadsheets      | 064390746177 | `antonycc/diy-accounting` (future)    | Spreadsheets static site              |
| submit-ci         | 367191799875 | `antonycc/feature-a.spreadsheets.diyaccounting.co.uk` | Submit CI deployments                 |
| submit-prod       | 972912397388 | `antonycc/feature-a.spreadsheets.diyaccounting.co.uk` | Submit prod deployments               |
| submit-backup     | 914216784828 | —                                     | Cross-account backup vault            |

## Git Workflow

**You may**: create branches, commit changes, push branches, open pull requests

**You may NOT**: merge PRs, push to main, delete branches, rewrite history

**Branch naming**: `claude/<short-description>`

## Build Commands

```bash
npm install                    # Install CDK CLI and dev dependencies
node scripts/build-gateway-redirects.cjs  # Generate redirect-function.js from redirects.toml
./mvnw clean verify            # Build CDK JARs (includes Spotless formatting check)
npm run cdk:synth              # Synthesize CloudFormation templates
npm run cdk:diff               # Show pending changes against deployed stack
```

## Development Tools

```bash
npm run formatting             # Check formatting (Prettier + Spotless)
npm run formatting-fix         # Auto-fix formatting
npm run lint:workflows         # Validate GitHub Actions workflow syntax (uses actionlint)
npm run update-to-minor        # Update npm dependencies (minor versions)
npm run update-to-latest       # Update npm dependencies (latest non-alpha)
npm run update:java            # Update Maven dependencies to latest versions
npm run update:node            # Update npm dependencies to latest non-alpha versions
npm run diagram:gateway        # Generate draw.io architecture diagram from CDK synth output
npm run resources:gateway      # Generate AWS_RESOURCES.md from live AWS data (requires SSO auth)
```

## Testing

```bash
npm test                       # Unit tests (vitest) — SEO validation + smoke tests
npm run test:browser           # Browser tests (Playwright) — HTML content validation
npm run test:gatewayBehaviour-local  # Behaviour tests against local server (localhost:3000)
npm run test:gatewayBehaviour-ci     # Behaviour tests against CI environment
npm run test:gatewayBehaviour-prod   # Behaviour tests against production
```

Behaviour tests use the `GATEWAY_BASE_URL` environment variable to target different environments. When running locally, redirect tests auto-skip (CloudFront Functions not available).

## Compliance

```bash
npm run compliance:ci-report-md    # Run all compliance checks and generate report (CI)
npm run compliance:prod-report-md  # Run all compliance checks and generate report (prod)
```

The compliance report (`REPORT_ACCESSIBILITY_PENETRATION.md`) combines accessibility checks (pa11y, axe-core, Lighthouse, WCAG text spacing) with security checks (ESLint security, npm audit, retire.js). Generated files are gitignored.

## CDK Architecture

**Single CDK application** (`cdk-gateway/`):

- Entry point: `GatewayEnvironment.java` -> `gateway.jar`
- Stack: `{env}-gateway-GatewayStack` (S3 + CloudFront + OAC + redirects)

**Java packages** (`co.uk.diyaccounting.gateway`):

- `gateway` — `GatewayEnvironment.java` (CDK app entry point)
- `gateway.stacks` — `GatewayStack.java` (S3 + CloudFront + OAC + CloudFront Function)
- `gateway.utils` — `Kind.java` (logging), `KindCdk.java` (CDK utilities)

## Web Content

Static site files live in `web/www.spreadsheets.diyaccounting.co.uk/public/`. This is the document root deployed to S3.

Redirects are configured in `web/www.spreadsheets.diyaccounting.co.uk/redirects.toml` and compiled to a CloudFront Function by `scripts/build-gateway-redirects.cjs`. The generated `redirect-function.js` is gitignored.

## Formatting

- Spotless with Palantir Java Format (100-column width)
- Prettier for JS/YAML/JSON/TOML
- Runs during Maven `install` phase (Spotless) and CI (both)
- Fix: `./mvnw spotless:apply` and `npx prettier --write .` (only when asked)

## Deployment

Deployments are triggered via GitHub Actions workflows:

| Workflow     | Purpose                                     | Trigger                    |
| ------------ | ------------------------------------------- | -------------------------- |
| `test.yml`   | Lint, format check, Maven verify, CDK synth | Push, PRs, daily schedule  |
| `deploy.yml` | Deploy GatewayStack (S3 + CloudFront)       | Push to main, manual dispatch |

Both workflows use OIDC authentication with these GitHub repository variables:

| Variable                   | Purpose                            |
| -------------------------- | ---------------------------------- |
| `GATEWAY_ACTIONS_ROLE_ARN` | OIDC auth for gateway account      |
| `GATEWAY_DEPLOY_ROLE_ARN`  | CDK deploy in gateway account      |
| `GATEWAY_CERTIFICATE_ARN`  | ACM certificate for CloudFront     |

**GitHub Environments**: `ci` and `prod` must exist in Settings > Environments, each with the above variables scoped to the correct account.

**After deploying**: Copy the `CloudFrontDomainName` output and use it as input to `root.spreadsheets.diyaccounting.co.uk` deploy workflow to update DNS alias records.

## AWS CLI Access

Use SSO profiles:

```bash
aws sso login --sso-session diyaccounting
aws --profile gateway cloudformation describe-stacks --region us-east-1
aws --profile gateway cloudfront list-distributions
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

## Template Repository

This repo is designed as the **simplest CDK static site template**. See `TEMPLATE.md` for full instructions. Key scripts:

- `scripts/template-clean.sh` — strips DIY-specific content, replaces with placeholders
- `scripts/template-init.sh` — interactive, applies your domain/company/account values

**NEVER run `template-clean.sh` without asking the user first.** It destructively replaces site-specific content.

## Security Checklist

- Never commit secrets — use AWS Secrets Manager ARNs
- Check IAM for least privilege (avoid `Resource: "*"`)
- OIDC trust policies scoped to specific repository
