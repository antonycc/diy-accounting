# Security Review: OWASP Top 10 & Repository-Specific Analysis

Purpose: Perform a comprehensive security review of the codebase, focusing on OWASP Top 10 vulnerabilities and patterns specific to this AWS Lambda + DynamoDB + HMRC OAuth architecture.

## Scope

Review these security-sensitive file patterns:

### Backend Lambda Handlers
- `app/functions/**/*.js` - All Lambda endpoints (auth, HMRC, account, edge, support, infra)

### Authentication & Authorization
- `app/functions/auth/*.js` - Custom authorizer, Cognito token handlers
- `app/lib/jwtHelper.js` - JWT parsing and validation
- `web/public/lib/services/auth-service.js` - Frontend token management

### Input Validation
- `app/lib/hmrcValidation.js` - VRN, period key, date validation
- `app/lib/vatReturnTypes.js` - VAT return body validation
- `app/functions/hmrc/hmrcVatReturnPost.js` - Request validation entry point

### Secrets & PII Protection
- `app/services/subHasher.js` - User ID hashing with Secrets Manager
- `app/lib/dataMasking.js` - Sensitive field masking before storage
- `app/lib/logger.js` - PII redaction patterns (VRN, UTR, NINO, email, tokens)

### Database Access
- `app/data/**/*.js` - DynamoDB repositories (bundle, receipt, API request, async request)

### Infrastructure Security
- `infra/main/java/**/stacks/*.java` - IAM roles, encryption, Secrets Manager access

## OWASP Top 10 Focus Areas

### A01: Broken Access Control
- Verify users can only access their own bundles and receipts
- Check hashedSub enforcement in all DynamoDB queries
- Review custom authorizer IAM policy generation

### A02: Cryptographic Failures
- Audit JWT validation against Cognito public keys
- Verify HMAC-SHA256 salt retrieval from Secrets Manager
- Check for hardcoded secrets in any file

### A03: Injection
- Review all DynamoDB query construction for injection risks
- Check any string interpolation in API requests
- Validate HMRC Gov-Client header construction

### A04: Insecure Design
- Review OAuth state parameter validation (PKCE)
- Check token refresh race condition handling
- Verify async request timeout and cleanup

### A05: Security Misconfiguration
- Review Lambda execution role privileges (least privilege)
- Check CORS configuration in HTTP responses
- Verify environment variable validation via envSchema.js

### A06: Vulnerable Components
- Check package.json for known vulnerabilities
- Review dependency versions against npm audit

### A07: Authentication Failures
- Review token expiry checking (5-minute preemptive refresh)
- Check JWT claim extraction and validation
- Verify Cognito user pool configuration references

### A08: Data Integrity Failures
- Review HMRC API response handling
- Check receipt storage integrity
- Verify audit logging completeness

### A09: Logging & Monitoring Failures
- Review PII redaction patterns in logger.js
- Check that all security events are logged
- Verify no tokens appear in logs

### A10: Server-Side Request Forgery
- Review HMRC API URL construction
- Check OAuth redirect URI validation

## Repository-Specific Concerns

### HMRC Integration Security
- Validate Gov-Client fraud prevention headers
- Review sandbox vs production endpoint selection
- Check client_secret retrieval from Secrets Manager

### Frontend Token Storage
- Assess XSS risk from localStorage token storage
- Review token refresh mechanism
- Check X-Authorization header handling

### DynamoDB Security
- Verify encryption at rest configuration
- Check TTL-based record expiration
- Review Point-in-Time Recovery settings

## Output Requirements

1. **Findings Summary**: List each vulnerability found with severity (Critical/High/Medium/Low)
2. **Code References**: Include file paths and line numbers for each finding
3. **Remediation**: Provide specific fix recommendations with code examples
4. **PR Structure**: Group related fixes into logical commits

## Constraints

- Do not reformat files you are not changing
- Match existing code style in each file
- Focus on security fixes, not general improvements
- Verify fixes don't break existing tests

> Run `npm test` after making changes to verify no regressions.
