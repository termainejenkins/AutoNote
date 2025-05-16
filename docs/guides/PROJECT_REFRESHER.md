# AutoNote Project Refresher Guide

## Quick Start Steps

### 1. Review Project Overview
1. Read the README.md for a high-level overview
2. Check the architecture document (docs/architecture/ARCHITECTURE.md)
3. Review the requirements (docs/requirements/REQUIREMENTS.md)

### 2. Check Current Status
1. Review the progress log (docs/progress/PROGRESS_LOG.md)
2. Check active bugs (docs/bugs/BUG_LOG.md)
3. Review recent commits/changes

### 3. Environment Setup
1. Ensure all dependencies are installed
2. Verify Docker containers are running
3. Check service health status

## Frontend Features & Usage (2024 Update)

- **Authentication:** Register and log in to access the app. Protected routes ensure only authenticated users can access notes, content processing, and profile pages.
- **Notes Management:**
  - View, search, filter, and sort your notes on the Notes page.
  - Create new notes or edit existing ones with a rich text editor and tags.
- **Content Processing:**
  - Use the Content Processor page to extract content from web pages or PDFs by entering a URL. The extracted content is sent to the note editor for further editing and saving.
- **User Profile:**
  - View and update your username and email.
  - Change your password with validation.
  - See stats like total notes and average notes per day.
- **Navigation:**
  - Use the main navigation bar to access Home, Notes, Content Processor, and Profile.

## Daily Refresher Checklist

### Morning Routine
1. Pull latest changes
2. Review any new issues or PRs
3. Check service logs for errors
4. Review your assigned tasks

### Development Context
1. Review current sprint goals
2. Check your active tasks
3. Review related documentation
4. Verify test coverage

### End of Day
1. Commit your changes
2. Update progress log
3. Document any blockers
4. Plan next day's tasks

## AI Assistance Prompts

### Project Overview
```
"Please summarize the current state of the AutoNote project, including:
1. Main features implemented
2. Current development phase
3. Active issues or challenges
4. Next major milestones"
```

### Architecture Review
```
"Please help me understand the current architecture:
1. What are the main services?
2. How do they interact?
3. What are the key design patterns?
4. Where are we in the implementation?"
```

### Code Review
```
"Please help me review the current codebase:
1. What are the main components?
2. What are the key dependencies?
3. What are the testing strategies?
4. What are the security measures?"
```

### Feature Status
```
"Please help me understand the status of [specific feature]:
1. What is implemented?
2. What is in progress?
3. What are the known issues?
4. What are the next steps?"
```

### Development Environment
```
"Please help me verify my development environment:
1. What services should be running?
2. What are the key configuration settings?
3. What are the common setup issues?
4. How do I test the setup?"
```

## Common Scenarios

### After a Break
1. Review recent changes
2. Check current issues
3. Update local environment
4. Run test suite
5. Review documentation updates

### Switching Features
1. Review feature requirements
2. Check related documentation
3. Review existing code
4. Set up feature branch
5. Update progress log

### Debugging Issues
1. Review bug reports
2. Check error logs
3. Review related code
4. Test fixes
5. Update documentation

## Project Navigation

### Key Directories
- `/docs` - Project documentation
- `/services` - Microservices
- `/frontend` - Web application
- `/desktop` - Desktop application
- `/extension` - Browser extension

### Important Files
- `docker-compose.yml` - Service configuration
- `requirements.txt` - Python dependencies
- `package.json` - Frontend dependencies
- `.env` - Environment variables

## Communication Channels

### Documentation
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Requirements: `docs/requirements/REQUIREMENTS.md`
- Progress: `docs/progress/PROGRESS_LOG.md`
- Bugs: `docs/bugs/BUG_LOG.md`

### Development
- Code repository
- Issue tracker
- CI/CD pipeline
- Monitoring dashboards

## Getting Help

### Internal Resources
1. Project documentation
2. Code comments
3. Test cases
4. Architecture diagrams

### External Resources
1. Framework documentation
2. API references
3. Community forums
4. Stack Overflow

## Best Practices

### Code Quality
1. Follow style guides
2. Write unit tests
3. Document changes
4. Review code

### Documentation
1. Keep docs updated
2. Add code comments
3. Update progress log
4. Document decisions

### Security
1. Follow security guidelines
2. Review dependencies
3. Test security features
4. Monitor vulnerabilities

## Emergency Procedures

### Critical Issues
1. Check error logs
2. Review recent changes
3. Test affected services
4. Implement fixes
5. Update documentation

### Data Issues
1. Check backups
2. Verify data integrity
3. Review data flow
4. Test recovery procedures

### Performance Issues
1. Check metrics
2. Review logs
3. Test load
4. Optimize code

Remember to:
- Keep documentation updated
- Follow established patterns
- Test thoroughly
- Document decisions
- Ask for help when needed 