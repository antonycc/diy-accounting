# spreadsheets.diyaccounting.co.uk

Spreadsheet download site for [DIY Accounting](https://spreadsheets.diyaccounting.co.uk) — free Excel bookkeeping spreadsheets for UK sole traders, self-employed, and small companies.

## Architecture

- **AWS CDK** (Java) deploys an S3 + CloudFront static site with OAC
- **CloudFront Function** handles URL redirects from the old www site (generated from `redirects.toml`)
- **DNS** is managed separately by the [root.diyaccounting.co.uk](https://github.com/antonycc/root.diyaccounting.co.uk) repository
- **Account**: spreadsheets (`064390746177`) in the DIY Accounting AWS Organization

## Quick Start

```bash
npm install
node scripts/build-spreadsheets-redirects.cjs
node scripts/build-sitemaps.cjs
./mvnw clean verify
node scripts/build-packages.cjs
npm run cdk:synth
```

Start the local dev server:

```bash
npm start
```

Serves on http://localhost:3000.

## Project Structure

```
.github/workflows/     GitHub Actions (test + deploy)
cdk-spreadsheets/      CDK app configuration
infra/main/java/       CDK Java stacks (SpreadsheetsStack)
packages/              Excel workbook source files (per product per tax year)
scripts/               Build and maintenance scripts
web/spreadsheets.diyaccounting.co.uk/
  public/              Static site content (S3 document root)
  redirects.toml       URL redirect configuration
behaviour-tests/       Playwright E2E behaviour tests
web/browser-tests/     Playwright browser content tests
web/unit-tests/        Vitest unit tests (SEO, smoke)
```

## Products

| Product | Description |
|---------|-------------|
| BasicSoleTrader | Basic bookkeeping for sole traders |
| SelfEmployed | Self-employed with VAT and CIS |
| Company | Limited company accounts (Any/March/June/Sept/Dec year-ends) |
| TaxiDriver | Specialist taxi driver accounts |
| Payslip05 / Payslip10 | Payroll for 5 or 10 employees |

Excel workbooks in `packages/` are zipped by `scripts/build-packages.cjs` and uploaded to S3 during deployment.

## Testing

| Command | Purpose |
|---------|---------|
| `npm test` | Unit tests — SEO validation + smoke tests |
| `npm run test:browser` | Browser tests — HTML content validation (Playwright) |
| `npm run test:spreadsheetsBehaviour-local` | Behaviour tests against local server |
| `npm run test:spreadsheetsBehaviour-ci` | Behaviour tests against CI |
| `npm run test:spreadsheetsBehaviour-prod` | Behaviour tests against production |
| `npm run compliance:ci-report-md` | Full compliance report (accessibility + security) |

## Deployment

Deployments run via GitHub Actions:

- **test.yml** — Lint, format check, Maven build, CDK synth, unit/browser/behaviour tests
- **deploy.yml** — CDK deploy to ci or prod, zip upload to S3, behaviour smoke test

OIDC authentication with `SPREADSHEETS_ACTIONS_ROLE_ARN` and `SPREADSHEETS_DEPLOY_ROLE_ARN`.

## Build Scripts

| Script | Purpose |
|--------|---------|
| `build-packages.cjs` | Zip Excel workbooks, generate `catalogue.toml` |
| `build-sitemaps.cjs` | Generate `sitemap.xml` from catalogue + knowledge base |
| `build-spreadsheets-redirects.cjs` | Generate CloudFront Function from `redirects.toml` |
| `generate-knowledge-base-toml.cjs` | Generate `knowledge-base.toml` from mdcms articles |
| `stripe-spreadsheets-setup.js` | Create Stripe donation products and Payment Links |

## Development Tools

| Command | Purpose |
|---------|---------|
| `npm run formatting` | Check Prettier + Spotless formatting |
| `npm run lint:workflows` | Validate GitHub Actions workflows |
| `npm run diagram:spreadsheets` | Generate architecture diagram |
| `npm run resources:spreadsheets` | Generate AWS resource catalogue |
| `npm run update:java` | Update Maven dependencies |
| `npm run update:node` | Update npm dependencies |

## Related Repositories

| Repository | Purpose |
|-----------|---------|
| [root.diyaccounting.co.uk](https://github.com/antonycc/root.diyaccounting.co.uk) | Route53 DNS records |
| [submit.diyaccounting.co.uk](https://github.com/antonycc/submit.diyaccounting.co.uk) | Submit VAT MTD application |

## License

AGPL-3.0-only. Copyright (C) 2025-2026 DIY Accounting Ltd.
