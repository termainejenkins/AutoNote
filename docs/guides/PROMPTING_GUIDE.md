# AutoNote AI Prompting Guide

## General Prompting Guidelines

### Best Practices
1. Be specific and detailed in your requests
2. Provide context about the current state
3. Reference existing documentation when relevant
4. Break down complex tasks into smaller steps
5. Ask for explanations of suggested solutions

### Context Setting Prompts
```
"Please help me with [specific task]. I'm working on the AutoNote project, which is [brief description]. The relevant documentation is in [file path]."
```

## Project-Specific Prompts

### Architecture & Design
```
"Review the current architecture in docs/architecture/ARCHITECTURE.md and suggest improvements for [specific aspect]."
"Help me design a new microservice for [specific functionality] following our existing patterns."
"Analyze our current data models and suggest optimizations for [specific use case]."
```

### Development
```
"Help me implement [feature] in [service] following our microservices architecture."
"Review this code for [service] and suggest improvements based on our architecture."
"Help me set up [new service] with the same patterns as our existing services."
```

### Testing
```
"Help me write unit tests for [component] following our testing strategy."
"Review these test cases for [feature] and suggest additional scenarios."
"Help me set up integration tests for [service] interactions."
```

### Documentation
```
"Help me update the architecture document to include [new component]."
"Review and improve the documentation for [feature]."
"Help me create API documentation for [new endpoint]."
```

### Bug Fixing
```
"Help me debug [issue] in [component] using our bug tracking format."
"Analyze this error log and suggest fixes based on our architecture."
"Help me implement a fix for [bug] while maintaining our security standards."
```

### Feature Implementation
```
"Help me implement [user story] from our requirements document."
"Review this implementation of [feature] against our acceptance criteria."
"Help me design the database schema for [new feature]."
```

### Code Review
```
"Review this code for [component] against our architecture guidelines."
"Check this implementation for security vulnerabilities."
"Review this code for performance optimization opportunities."
```

### Deployment & DevOps
```
"Help me set up CI/CD for [new service]."
"Review our deployment configuration for [environment]."
"Help me implement monitoring for [new feature]."
```

## Context-Specific Prompts

### When Starting a New Feature
```
"I'm starting work on [feature]. Please help me:
1. Review the requirements in docs/requirements/REQUIREMENTS.md
2. Identify the affected services
3. Create an implementation plan
4. Set up the initial structure"
```

### When Debugging
```
"I'm debugging [issue] in [component]. Please help me:
1. Review the bug report in docs/bugs/BUG_LOG.md
2. Analyze the error logs
3. Suggest potential fixes
4. Help implement the solution"
```

### When Updating Documentation
```
"I need to update the documentation for [component]. Please help me:
1. Review the current documentation
2. Identify missing information
3. Suggest improvements
4. Help write the updates"
```

### When Implementing Security Features
```
"I'm implementing security for [feature]. Please help me:
1. Review our security architecture
2. Identify potential vulnerabilities
3. Suggest security improvements
4. Help implement the security measures"
```

## Follow-up Prompts

### For Clarification
```
"Can you explain more about [specific part] of your suggestion?"
"Could you provide an example of how to implement [specific aspect]?"
"What are the trade-offs of this approach?"
```

### For Validation
```
"Does this implementation follow our architecture guidelines?"
"Have we considered all the requirements for this feature?"
"Are there any security concerns with this approach?"
```

### For Optimization
```
"How can we improve the performance of this implementation?"
"What are some ways to make this code more maintainable?"
"How can we make this feature more scalable?"
```

## Emergency/Urgent Prompts

### For Critical Bugs
```
"URGENT: We have a critical bug in [component]. Please help me:
1. Analyze the error logs
2. Identify the root cause
3. Suggest immediate fixes
4. Help implement the solution"
```

### For Security Issues
```
"URGENT: We've identified a security vulnerability in [component]. Please help me:
1. Assess the severity
2. Identify affected areas
3. Suggest immediate fixes
4. Help implement the security patch"
```

### For Performance Issues
```
"URGENT: We're experiencing performance issues with [component]. Please help me:
1. Analyze the performance metrics
2. Identify bottlenecks
3. Suggest optimizations
4. Help implement the improvements"
```

Remember to:
- Always provide relevant context
- Reference specific files or documentation
- Break down complex requests
- Ask for explanations when needed
- Validate suggestions against project standards 