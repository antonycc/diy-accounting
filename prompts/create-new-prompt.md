# Create New Prompt

Analyze the current repository and the existing prompts in the `prompts/` directory to identify gaps or opportunities that are not currently covered by the existing prompt types.

## Current Prompts Analysis

Review the existing prompts and their focus areas:
- `todo-inator.md` - Execute a themed batch of TODOs to completion with tests and verification
- `security-compliance-hardening.md` - Security posture and compliance readiness improvements
- `create-new-prompt.md` - Identify gaps and define a new strategic prompt
- `sumarise-repository.md` - Generate an information-dense hierarchical summary of the repository
- `what-next-for-mtd-vat-submission.md` - Roadmap to HMRC readiness and VAT submission capability

## Task: Create a New Strategic Prompt

Based on your analysis of the repository structure, codebase, architecture, and existing prompts, create a new prompt that addresses an important gap or opportunity that would provide significant value.

**CRITICAL**: Before creating any new prompt, you must conduct rigorous multi-perspective analysis following these implementation guidelines for this repository:
- Adhere to AWS Well-Architected principles
- Apply security best practices (IAM least privilege, encryption, logging)
- Use infrastructure-as-code best practices for CDK code
- Follow modern ES2022+ patterns for Node.js code
- Ensure comprehensive error handling and logging

### Required Multi-Scenario Evaluation
Evaluate AT LEAST 3 different approaches for the new prompt:
- **Scenario A**: Conservative/minimal change approach
- **Scenario B**: Optimized/refactored approach
- **Scenario C**: Alternative architectural approach

For each scenario, analyze:
- Implementation complexity
- Performance implications
- Security considerations (IAM least privilege, encryption, logging)
- Maintainability impact
- Deployment requirements
- Testing strategy

### Mandatory Internal Review Process
Before executing the prompt creation, conduct this internal review:

#### Technical Review
- Does this follow AWS Well-Architected principles?
- Are security best practices followed (IAM least privilege, encryption, logging)?
- Is the CDK code following infrastructure-as-code best practices?
- Does the Node.js code follow modern ES2022+ patterns?
- Are error cases properly handled with comprehensive logging?

#### Quality Review
- Are tests comprehensive (unit, system, e2e)?
- Is logging verbose enough for debugging auth flows?
- Does the change maintain backward compatibility?
- Is documentation updated appropriately?

#### Operational Review
- How does this impact cold start performance?
- Are CloudWatch costs optimized (7-day retention)?
- Does this scale to expected load?
- How does this affect deployment time?
- Are rollback scenarios considered?

Your new prompt should:

### 1. Identify the Gap
- Analyze what aspects of repository improvement are not covered by existing prompts
- Consider the repository's specific domain (MTD VAT submission app, AWS serverless architecture, AWS CDK in Java)
- Look for opportunities specifically relevant to this repo, such as:
  - HMRC OAuth 2.0 flow robustness (auth URL, token exchange, sandbox vs prod clients)
  - HMRC VAT API integrations (obligations, returns, receipts) including error handling and retries
  - Local Express ↔ AWS Lambda adaptor correctness and parity
  - DynamoDB data access patterns (bundles, receipts, HMRC API request logging)
  - CloudFront/S3 static site deployment constraints and cache behaviors
  - CI workflows and test execution strategy (Vitest, Playwright)
  - Environment configuration via `.env.*` and secrets handling

### 2. Create the Prompt File
- Create a new markdown file in the `prompts/` directory with a descriptive filename
- Follow the established format and style of existing prompts
- Include clear focus areas and specific actionable guidance
- Make it comprehensive but focused on a coherent theme

### 3. Update the Workflow Configuration
- Add the new prompt to the workflow choices in `.github/workflows/copilot-agent.yml`
- Ensure it integrates properly with the existing prompt selection system
- Place it in an appropriate position within the options list

### 4. Update Documentation
- Add documentation for the new prompt in `docs/copilot-agent-workflow.md`
- Explain what the new prompt does and when to use it
- Maintain consistency with existing documentation patterns

## Deliverables

1. **New prompt markdown file** - A well-crafted prompt targeting an identified gap
2. **Updated workflow file** - Modified `.github/workflows/copilot-agent.yml` with the new option
3. **Updated documentation** - Enhanced `docs/copilot-agent-workflow.md` with details about the new prompt
4. **Justification** - Clear explanation of why this particular prompt addresses an important need

## Success Criteria

The new prompt must meet these mandatory requirements:
- Address a genuine gap not covered by existing prompts
- Be strategically valuable for the repository's MTD VAT submission goals
- Follow AWS Well-Architected principles (security, reliability, performance, cost optimization, operational excellence)
- Include security best practices assessment (IAM least privilege, encryption, logging)
- Complete the internal review process as described in the "Mandatory Internal Review Process" section above.
- Integrate seamlessly with the existing prompt system
- Provide clear, actionable guidance specific to this repository (MTD VAT submission, HMRC APIs, AWS serverless, Cognito)
- Include rollback and deployment risk assessment

Focus on creating something that would be genuinely useful and that represents the most impactful improvement opportunity currently missing from the prompt collection.

> Avoid reformatting files you are not otherwise changing; prefer to match the existing local style where strict formatting updates would be jarring.

