# Auto-Select Best Opportunity Prompt

Analyze the current repository and all available prompts in the `./prompts` directory to automatically select the prompt type where there is the greatest opportunity to add value.

## Selection Process

1. **Review All Available Prompts**: Examine each prompt file in the `./prompts` directory to understand their focus areas:
   - `todo-inator.md` - Complete a cluster of related TODOs end-to-end with iterative implementation and verification
   - `security-compliance-hardening.md` - Strengthen security posture and compliance readiness for production
   - `create-new-prompt.md` - Identify gaps and design a new strategic prompt for the repository
   - `sumarise-repository.md` - Produce an information-dense, hierarchical repository summary for agent context
   - `what-next-for-mtd-vat-submission.md` - Plan the path to HMRC approval and real customer VAT submissions
   - `hmrc-api-expert.md` - Deep expertise in HMRC MTD VAT API, fraud prevention headers, and OAuth flows
   - `aws-cdk-java-specialist.md` - Guide infrastructure development using AWS CDK v2 in Java
   - `behavior-test-master.md` - Master end-to-end behavioral testing with Playwright
   - `clean-code-guardian.md` - Enforce high standards for code quality, tracing, and refactoring
   - `entitlement-subscription-specialist.md` - Manage complex bundle, entitlement, and subscription logic

2. **Repository Analysis**: Evaluate the current state of the repository across all areas:
   - Code quality and consistency patterns
   - Documentation completeness and accuracy
   - Library usage and custom implementations
   - Feature completeness and expansion opportunities
   - Code complexity and maintainability issues

3. **Opportunity Assessment**: For each prompt area, assess:
   - **Impact Potential**: How much improvement can be achieved
   - **Implementation Feasibility**: How achievable the changes are
   - **Current Gap Size**: How far the repository is from best practices in this area
   - **Value-to-Effort Ratio**: Which area provides maximum benefit for development time
   - **Strategic Alignment**: Which improvements best support the project's goals

## Selection Criteria

Prioritize the prompt area with the highest combined score based on:

### High Priority Indicators
- **Critical gaps** in current implementation that affect functionality or reliability
- **High-impact improvements** that significantly enhance developer productivity
- **Low-hanging fruit** with substantial benefits and minimal implementation risk
- **Foundational issues** that block or impede other improvements

### Evaluation Areas
- **Code Quality**: Inconsistencies, code smells, technical debt
- **Documentation**: Missing, outdated, or inadequate documentation
- **Architecture**: Over-engineered solutions, library opportunities
- **Features**: Missing capabilities that provide clear user value
- **Maintainability**: Complex, hard-to-understand, or redundant code

## Implementation Instructions

Once you've selected the prompt with the greatest opportunity:

1. **Justify Your Selection**: Provide clear reasoning for why this prompt area offers the greatest value-add opportunity
2. **Apply the Selected Prompt**: Execute the full scope of the selected prompt's instructions
3. **Focus on High-Impact Changes**: Prioritize improvements that provide the most significant benefits
4. **Maintain Project Standards**: Ensure all changes align with existing architecture and patterns

## Output Format

Begin your response with:

```
## Auto-Selection Analysis

**Selected Prompt**: [prompt-name]
**Selection Rationale**: [2-3 sentence explanation of why this area has the greatest opportunity]

### Current State Assessment
- [Key findings about current state in selected area]

### Opportunity Impact
- [Expected benefits and improvements]

---

## [Selected Prompt Title]
[Continue with full execution of the selected prompt]
```

## Constraints

- Select only ONE prompt to execute
- Provide concrete, actionable recommendations
- Focus on changes that can be implemented incrementally
- Maintain compatibility with existing functionality
- Consider the project's AWS serverless architecture, Cognito (with Google IdP) usage, and HMRC OAuth 2.0 integration context
- Before running tests, trace the relevant code paths (local Express and Lambda adaptor) and fix obvious defects found by inspection
- Behaviour tests can be very verbose — pipe output to a file when running (e.g. `npm run test:submitVatBehaviour-proxy > target/behaviour-test-results/behaviour.log 2>&1`)

> Avoid reformatting files you are not otherwise changing; prefer to match the existing local style where strict formatting updates would be jarring.
