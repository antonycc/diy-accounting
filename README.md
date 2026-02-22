# www.spreadsheets.diyaccounting.co.uk

Gateway static site for [DIY Accounting](https://www.spreadsheets.diyaccounting.co.uk) — the main marketing and information site.

## Architecture

- **AWS CDK** (Java) deploys an S3 + CloudFront static site with OAC
- **CloudFront Function** handles URL redirects (generated from `redirects.toml`)
- **DNS** is managed separately by the [root.spreadsheets.diyaccounting.co.uk](https://github.com/antonycc/root.spreadsheets.diyaccounting.co.uk) repository
- **Account**: gateway (`283165661847`) in the DIY Accounting AWS Organization

## Quick Start

```bash
npm install
node scripts/build-gateway-redirects.cjs
./mvnw clean verify
npm run cdk:synth
```

## Project Structure

```
.github/workflows/     GitHub Actions (test + deploy)
cdk-gateway/           CDK app configuration
infra/main/java/       CDK Java stacks (GatewayStack)
scripts/               Build and maintenance scripts
web/www.spreadsheets.diyaccounting.co.uk/
  public/              Static site content (S3 document root)
  redirects.toml       URL redirect configuration
```

## Testing

| Command | Purpose |
|---------|---------|
| `npm test` | Unit tests — SEO validation + smoke tests |
| `npm run test:browser` | Browser tests — HTML content validation (Playwright) |
| `npm run test:gatewayBehaviour-local` | Behaviour tests against local server |
| `npm run compliance:ci-report-md` | Full compliance report (accessibility + security) |

Start the local dev server with `npm start` (serves on port 3000).

## Deployment

Deployments run via GitHub Actions:

- **test.yml** — Lint, format check, Maven build, CDK synth, unit/browser/behaviour tests
- **deploy.yml** — CDK deploy to ci or prod (push to main, manual dispatch)

OIDC authentication with `gateway-github-actions-role` and `gateway-deployment-role`.

## Development Tools

| Command | Purpose |
|---------|---------|
| `npm run formatting` | Check Prettier + Spotless formatting |
| `npm run lint:workflows` | Validate GitHub Actions workflows |
| `npm run diagram:gateway` | Generate architecture diagram |
| `npm run resources:gateway` | Generate AWS resource catalogue |
| `npm run update:java` | Update Maven dependencies |
| `npm run update:node` | Update npm dependencies |

## Template Repository

This repo can be used as a GitHub template for new CDK static sites. See [TEMPLATE.md](TEMPLATE.md) for full instructions.

## Related Repositories

| Repository | Purpose |
|-----------|---------|
| [root.spreadsheets.diyaccounting.co.uk](https://github.com/antonycc/root.spreadsheets.diyaccounting.co.uk) | Route53 DNS records |
| [feature-a.spreadsheets.diyaccounting.co.uk](https://github.com/antonycc/feature-a.spreadsheets.diyaccounting.co.uk) | Submit application |

## License

AGPL-3.0-only. Copyright (C) 2025-2026 DIY Accounting Ltd.
