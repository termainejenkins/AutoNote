# AutoNote

Copyright © 2025 SENTIENT SOLUTIONS LLC. All rights reserved.
Created by Termaine "TJ" Jenkins

This software and associated documentation files are the exclusive property of SENTIENT SOLUTIONS LLC. 
No part of this software may be reproduced, distributed, or transmitted in any form or by any means 
without the prior written permission of SENTIENT SOLUTIONS LLC.

AutoNote is a comprehensive note-taking and content processing platform that helps users capture, organize, and enhance their notes using AI-powered features.

## Features

- **Content Capture**: Capture notes from various sources (web, PDF, video)
- **AI Enhancement**: Automatic summarization, key point extraction, and question generation
- **Smart Organization**: Tag-based organization and intelligent search
- **Multi-platform**: Web interface, browser extension, and desktop application

## Project Structure

```
autonote/
├── services/              # Backend microservices
│   ├── api-gateway/      # API Gateway service
│   ├── auth-service/     # Authentication service
│   ├── note-service/     # Note management service
│   ├── content-service/  # Content processing service
│   └── ai-service/       # AI processing service
├── frontend/             # React frontend application
├── docs/                 # Documentation
├── scripts/             # Utility scripts
└── docker-compose.yml   # Docker Compose configuration
```

## Prerequisites

- Docker Desktop for Windows
- PowerShell 5.1 or later
- Git

## Getting Started

1. Clone the repository:
   ```powershell
   git clone https://github.com/yourusername/autonote.git
   cd autonote
   ```

2. Start the services:
   ```powershell
   docker-compose up --build -d
   ```

3. Run the test script to verify all services are working:
   ```powershell
   .\scripts\test-services.ps1
   ```

## Service Ports

- API Gateway: http://localhost:8000
- Auth Service: http://localhost:8001
- Note Service: http://localhost:8002
- Content Service: http://localhost:8003
- AI Service: http://localhost:8004
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

## Development

### Backend Services

Each service is built using FastAPI and follows a consistent structure:
- `main.py`: FastAPI application and endpoints
- `config.py`: Configuration and environment variables
- `models.py`: Data models and schemas
- `Dockerfile`: Container configuration

### Testing

The project includes automated tests for all services:
- Unit tests for individual components
- Integration tests for service interactions
- End-to-end tests for complete workflows

To run the tests:
```powershell
# Run all tests
.\scripts\test-services.ps1

# Run specific service tests
.\scripts\test-services.ps1 -Service auth-service
```

### Monitoring

The project includes Prometheus and Grafana for monitoring:
- Service health metrics
- Performance metrics
- Error tracking
- Resource usage

Access the monitoring dashboards:
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Proprietary Software Notice

This software is proprietary and confidential. 
Unauthorized copying, transfer, or reproduction of the contents of this software, via any medium, is strictly prohibited.

## Support

For support, please open an issue in the GitHub repository or contact the development team.