# TODO‑inator: Thematic TODO Completion Engine

Purpose: Scan the repository for TODO/FIXME items, cluster them by related area or theme, and complete a coherent batch end‑to‑end so the code is fully working, tested, and documented. Use iterative cycles like a strong LLM (e.g., multiple iterations of GPT‑5 class capability) to plan, implement, verify, and refine until done.

## Scope and Inputs

- Target source: the entire repository.
- TODO patterns: `TODO`, `FIXME`, `// TODO`, `// FIXME`, `/* TODO`, `/* FIXME`, and inline comments containing these terms.
- Related areas or themes to consider when clustering:
  - HMRC VAT submission readiness (Gov‑Client/Gov‑Vendor headers, OAuth/OIDC integration, token flow)
  - AWS CDK/Infra consistency and name derivation (e.g., Cognito domain names, predictable ARNs)
  - Test reliability and environment configuration (e.g., .env usage, removing unstable overrides)
  - App functions and helpers (e.g., product catalog, auth URL and token exchange flows)

## Output Requirements

Produce a high‑quality Pull Request that:
- Completely resolves a selected cluster of TODOs/FIXMEs that share a clear theme.
- Includes code changes, tests (unit/integration/behaviour where applicable), and documentation updates.
- Keeps builds green and formatting consistent.
- Contains a clear summary describing which TODOs were addressed (paths + line ranges), why the theme was selected, and what changed.

## Process

1. Discover and Cluster
   - Inventory all TODOs/FIXMEs via repo‑wide search.
   - Group them into clusters by theme, component, or subsystem.
   - Score clusters by value: risk reduction, user impact, test stability, effort required, dependencies.
   - Select ONE cluster that yields strong value and is realistically completable in this PR.

2. Deep Analysis of Selected Cluster
   - Read surrounding context of each TODO in the cluster.
   - Identify required code paths, data contracts, and external integrations.
   - Trace both local execution (Express server) and production execution paths (Lambda adaptor) to ensure parity before running tests.
   - Define acceptance criteria for “done” across all items in the cluster.

3. Plan → Implement → Iterate (LLM multi‑iteration loop)
   - Draft a minimal viable plan to address the cluster end‑to‑end.
   - Implement incrementally with small, verifiable steps.
   - After each step: run linters/formatters and tests locally; refine based on failures or quality concerns.
   - Repeat until all items in the cluster are resolved and acceptance criteria are met.

4. Testing & Verification
   - Run focused tests first, then broader suites.
   - For JS/TS:
     - Unit tests: `npm run test:unit` (or `npm run test`)
     - System: `npm run test:system`
     - Behaviour/Browser (if relevant): `npm run test:allBehaviour` / `npm run test:browser`
       - For proxy environment, prefer `npm run test:submitVatBehaviour-proxy`
       - Behaviour tests are very verbose — pipe output to a file, e.g.:
         - `npm run test:submitVatBehaviour-proxy > target/behaviour-test-results/behaviour.log 2>&1`
   - For Java/CDK:
     - Build/validate: `npm run build` (Maven + Spotless checks)
   - Add/extend tests to cover new behaviours; stabilize flaky tests encountered during execution.

5. Formatting & Quality Gates
   - JS/MD formatting: `npm run formatting:js-fix` or `npm run formatting-fix` (repo‑wide, includes Java Spotless).
   - ESLint: `npm run linting` (or `npm run linting-fix`).
   - Ensure commit diff is minimal and focused on the cluster; avoid drive‑by changes.

6. Documentation & PR Summary
   - Update README or internal docs if behaviour/usage changes.
   - In the PR body, include:
     - “Selected Cluster” name and rationale.
     - Checklist of resolved TODOs/FIXMEs with file paths and brief resolution notes.
     - Test plan results and any trade‑offs made.

## Selection Heuristics (Examples From This Repo)

When clustering, the following existing TODOs may naturally group together. Pick one coherent theme:
- Cognito/CDK naming and ARNs: e.g., compute ARNs internally, remove manual wiring where predictable.
- HMRC headers and auth flow: enrich Gov‑Client headers and validate; reduce placeholders in tests.
- Test env consistency: remove temporary overrides, stabilize `.env.*` handling, and fix brittle test preconditions.

Use these as inspiration; do not attempt to fix everything at once. Choose ONE cluster with the highest value‑to‑effort ratio.

## Constraints

- Maintain backward compatibility unless explicitly improving a clearly internal, unused path.
- Preserve security properties (least privilege IAM, secrets handling, logging) and privacy of any HMRC/Gov headers.
- Be incremental and reversible; keep commits logical and small.
- Keep infrastructure and application concerns separated appropriately; respect existing architecture boundaries.
 - Avoid unnecessary formatting changes; rely on repo scripts `npm run formatting` / `npm run formatting-fix` when needed.

## Success Criteria

- All TODO/FIXME items in the selected cluster are removed or converted to tracked issues with implemented solutions.
- All tests pass locally and in CI; no regressions.
- Code style and formatting pass via repository scripts.
- The PR description clearly documents rationale, scope, and verification steps.

> Prefer not to reformat code you are not otherwise changing; match local style where heavy reformatting would be jarring.
