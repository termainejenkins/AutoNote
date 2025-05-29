# Testing Documentation

## Overview

This document outlines the testing strategy and procedures for the AutoNote project. The testing suite includes unit tests, integration tests, and end-to-end tests for all services.

## Test Scripts

### Windows (PowerShell)

The main test script is located at `scripts/test-services.ps1`. This script:
- Checks the health of all services
- Tests authentication flows
- Verifies CRUD operations
- Tests content processing
- Validates AI features

To run the tests:
```powershell
# Run all tests
.\scripts\test-services.ps1

# Run specific service tests
.\scripts\test-services.ps1 -Service auth-service
```

### Linux/Mac (Bash)

For Linux/Mac users, use the bash script at `scripts/test-services.sh`:
```bash
# Make the script executable
chmod +x scripts/test-services.sh

# Run all tests
./scripts/test-services.sh
```

## Service Tests

### API Gateway (Port 8000)
- Health check endpoint
- Service health monitoring
- Request routing
- Authentication middleware

### Auth Service (Port 8001)
- User registration
- User login
- Token validation
- Password management

### Note Service (Port 8002)
- Note creation
- Note retrieval
- Note updates
- Note deletion
- Tag management

### Content Service (Port 8003)
- Web content processing
- PDF processing
- Content extraction
- Metadata handling

### AI Service (Port 8004)
- Content summarization
- Key point extraction
- Question generation
- AI model integration

## Monitoring Tests

### Prometheus (Port 9090)
- Metrics collection
- Service health monitoring
- Performance metrics

### Grafana (Port 3000)
- Dashboard visualization
- Metric queries
- Alert configuration

## Test Data

The test script uses the following test data:

### User Data
```json
{
    "email": "test@example.com",
    "password": "testpass123",
    "username": "testuser"
}
```

### Note Data
```json
{
    "title": "Test Note",
    "content": "This is a test note",
    "tags": ["test"]
}
```

### Content Data
```json
{
    "url": "https://example.com",
    "type": "web"
}
```

### AI Processing Data
```json
{
    "content": "This is a test content for AI processing",
    "operation": "summarize"
}
```

## Troubleshooting

### Common Issues

1. **Service Not Responding**
   - Check if Docker containers are running
   - Verify service health endpoints
   - Check service logs

2. **Authentication Failures**
   - Verify JWT token generation
   - Check token expiration
   - Validate user credentials

3. **Database Connection Issues**
   - Check PostgreSQL connection
   - Verify database credentials
   - Check database logs

### Debugging

To enable debug logging:
1. Set environment variable: `LOG_LEVEL=DEBUG`
2. Check service logs: `docker-compose logs <service-name>`
3. Monitor Prometheus metrics
4. Check Grafana dashboards

## Continuous Integration

The project includes automated testing in the CI/CD pipeline:
- GitHub Actions workflow for automated testing
- Code coverage reporting
- Performance benchmarking
- Security scanning

## Best Practices

1. **Test Coverage**
   - Maintain high test coverage
   - Test edge cases
   - Include negative test cases

2. **Test Data**
   - Use realistic test data
   - Clean up test data after tests
   - Avoid hardcoding sensitive data

3. **Performance Testing**
   - Monitor response times
   - Test under load
   - Benchmark critical operations

4. **Security Testing**
   - Test authentication
   - Validate authorization
   - Check input validation
   - Test rate limiting 