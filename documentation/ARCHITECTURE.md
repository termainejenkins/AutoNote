# AutoNote Architecture Design Document

Copyright © 2025 SENTIENT SOLUTIONS LLC. All rights reserved.
Created by Termaine "TJ" Jenkins

CONFIDENTIAL AND PROPRIETARY
This document contains confidential and proprietary information of SENTIENT SOLUTIONS LLC.
No part of this document may be reproduced, distributed, or transmitted without explicit written permission.

## 1. Introduction

### 1.1 Purpose
This document provides a comprehensive architectural overview of the AutoNote application, detailing the system's structure, components, and their interactions.

### 1.2 Scope
The document covers the entire AutoNote ecosystem, including web application, desktop application, browser extension, and all supporting services.

### 1.3 Definitions
- **Microservice**: An independently deployable service that implements a specific business capability
- **API Gateway**: A service that routes requests to appropriate microservices
- **Content Service**: Service responsible for content capture and processing
- **Note Service**: Service managing note storage and retrieval

## 2. System Overview

### 2.1 System Context
AutoNote is a multi-platform application that automatically captures and processes content from various sources (web, PDFs, videos) and generates structured notes.

### 2.2 Key Requirements
- Scalable microservices architecture
- Real-time content processing
- Cross-platform support
- AI-powered content analysis
- Secure data storage

## 3. Architecture Decisions

### 3.1 Technology Stack
```yaml
Backend:
  - Language: Python 3.8+
  - Framework: FastAPI
  - Database: PostgreSQL
  - Cache: Redis
  - Message Queue: RabbitMQ
  - Search: Elasticsearch

Frontend:
  - Framework: React
  - State Management: Redux Toolkit
  - UI: Material-UI
  - Desktop: Electron

DevOps:
  - Containerization: Docker
  - Orchestration: Kubernetes
  - CI/CD: GitHub Actions
  - Monitoring: Prometheus + Grafana
```

### 3.2 Architecture Patterns
- Microservices Architecture
- Event-Driven Architecture
- CQRS (Command Query Responsibility Segregation)
- Repository Pattern
- Factory Pattern for Content Scrapers

### 3.1.1 Frontend Architecture and Features (2024 Update)
- **Pages:** Home, Login, Register, NotesList, NoteEditor, ContentProcessor, Profile
- **Components:** MainLayout, Navbar, Dashboard, NoteDetail, NotesList, PrivateRoute
- **Authentication:** Login, registration, protected routes, user profile management
- **Notes Management:** List, create, edit, search, filter, sort, tag notes
- **Content Processing:** Web and PDF content extraction via URL, with UI for processing and note creation
- **State Management:** Redux Toolkit slices for auth and notes
- **API Integration:** Centralized service for backend communication (auth, notes, content)
- **UI/UX:** Material-UI for design, TinyMCE for rich text editing, responsive layouts
- **Routing:** React Router v6, with public and protected routes
- **TypeScript:** Used for type safety across state, API, and components

## 4. System Architecture

### 4.1 High-Level Architecture
```
[Client Layer]
    ├── Web Application
    ├── Desktop Application
    └── Browser Extension

[API Gateway]
    └── Service Router

[Service Layer]
    ├── Auth Service
    ├── Note Service
    ├── Content Service
    ├── AI Service
    └── Notification Service

[Data Layer]
    ├── PostgreSQL
    ├── Redis
    ├── Elasticsearch
    └── Message Queue
```

### 4.2 Service Descriptions

#### 4.2.1 API Gateway
- Request routing
- Load balancing
- Rate limiting
- Authentication verification

#### 4.2.2 Auth Service
- User authentication
- Authorization
- Session management
- OAuth integration

#### 4.2.3 Note Service
- Note CRUD operations
- Note organization
- Search functionality
- Version control

#### 4.2.4 Content Service
- Web scraping
- PDF processing
- Video transcription
- Content cleaning

#### 4.2.5 AI Service
- Content summarization
- Key point extraction
- Topic categorization
- Smart tagging

## 5. Data Architecture

### 5.1 Data Models
```python
class Note:
    id: UUID
    title: str
    content: str
    source_type: str
    metadata: dict
    created_at: datetime
    updated_at: datetime

class User:
    id: UUID
    email: str
    preferences: dict
    created_at: datetime

class Content:
    id: UUID
    source_url: str
    content_type: str
    raw_content: str
    processed_content: str
    metadata: dict
```

### 5.2 Data Flow
1. Content capture
2. Content processing
3. Note generation
4. Storage and indexing
5. Retrieval and presentation

## 6. Security Architecture

### 6.1 Authentication
- JWT-based authentication
- OAuth2 for third-party integration
- Session management

### 6.2 Authorization
- Role-based access control
- Resource-level permissions
- API key management

### 6.3 Data Security
- Encryption at rest
- TLS for data in transit
- Secure credential storage

## 7. Deployment Architecture

### 7.1 Infrastructure
- Containerized deployment
- Kubernetes orchestration
- Load balancing
- Auto-scaling

### 7.2 Monitoring
- Service health checks
- Performance metrics
- Error tracking
- Usage analytics

## 8. Development Guidelines

### 8.1 Code Organization
- Feature-based structure
- Clear separation of concerns
- Consistent naming conventions
- Comprehensive documentation

### 8.2 Testing Strategy
- Unit testing
- Integration testing
- End-to-end testing
- Performance testing

### 8.3 Documentation
- API documentation
- Code documentation
- Deployment guides
- User documentation

## 9. Future Considerations

### 9.1 Scalability
- Horizontal scaling
- Database sharding
- Caching strategies
- Load distribution

### 9.2 Extensibility
- Plugin architecture
- API versioning
- Service discovery
- Feature flags

## 10. Appendix

### 10.1 API Specifications
- OpenAPI/Swagger documentation
- API versioning strategy
- Rate limiting policies

### 10.2 Database Schema
- Entity relationships
- Indexing strategy
- Migration strategy

### 10.3 Deployment Diagrams
- Development environment
- Staging environment
- Production environment

## Current Development Focus

The following areas are the current focus for the AutoNote team, ensuring the architecture is realized as planned and the system is robust, scalable, and user-friendly:

- Test and debug the full authentication and note-taking flow from frontend to backend
- Fix any integration issues between frontend and backend services
- Implement and test content extraction and AI summarization features
- Begin browser extension MVP: set up project, implement basic content capture, connect to API
- Expand and run automated tests (unit, integration, E2E)
- Update documentation to reflect current architecture and next steps

For a detailed, actionable checklist and broader roadmap, see the PROGRESS_LOG.md.