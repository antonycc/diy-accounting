# Abstract and Delegate to Libraries Prompt

Analyze the current repository and identify opportunities to abstract common patterns and delegate functionality to well-established libraries.

Focus on:
- Custom implementations that could be replaced with proven libraries
- Common patterns that could be extracted into reusable modules
- Repetitive code that could be abstracted into shared utilities
- Complex logic that could benefit from specialized libraries
- Infrastructure patterns that could use CDK constructs or higher-level abstractions
- Testing utilities that could leverage established frameworks

Areas to examine for abstraction:
- HTTP request handling and error management
- Environment configuration and validation
- AWS service interactions (S3, Secrets Manager, Lambda)
- Authentication and authorization flows
- Data validation and transformation
- Logging and monitoring patterns
- Test setup and teardown procedures
- File handling and processing
- Date and time manipulation
- Cryptographic operations

Consider delegating to libraries for:
- HTTP client operations (axios, node-fetch)
- Input validation (joi, yup, zod)
- Date handling (date-fns, dayjs)
- Environment variable management (dotenv, env-var)
- AWS SDK abstractions
- Testing utilities (factory patterns, test data builders)
- Configuration management
- Error handling and reporting

Provide recommendations that:
- Reduce custom code maintenance
- Improve reliability through battle-tested libraries
- Enhance developer productivity
- Maintain current functionality
- Follow established patterns in the Node.js/AWS ecosystem
- Consider bundle size and performance implications

> Do not apply styles changes to code that you are not otherwise changes and prefer to match the existing local style when applying the style guides would be jarring.
