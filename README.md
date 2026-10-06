# StockPilot

### Right Stock. Right Supplier. Right Time.

StockPilot is an integrated **Inventory and Procurement Management System** developed for **SE3090 Assignment 1**.

The system combines a **React web application**, **Flutter mobile application**, **ASP.NET Core Web API**, **PostgreSQL database**, and a controlled **Agentic AI workflow** to support inventory optimization, demand forecasting, supplier evaluation, and procurement coordination.

---

## System Architecture

```text
React Web                Flutter Mobile
    │                          │
    └────────────┬─────────────┘
                 ▼
        ASP.NET Core Web API
                 │
          ┌──────┴──────┐
          ▼             ▼
     PostgreSQL    Agentic AI Layer
                        │
                        ▼
              Replenishment Orchestrator
                        │
                        ▼
              Specialized AI Agents
                        │
                        ▼
               Business Validation
                        │
                        ▼
              Procurement Proposal
                        │
                        ▼
                  Human Approval
                        │
                        ▼
                 Purchase Order
```

### Architecture Rules

- React and Flutter communicate only with the ASP.NET Core API.
- Client applications never directly access PostgreSQL or external AI services.
- PostgreSQL is the centralized database.
- Business logic and validation are handled by the backend.
- AI agents generate recommendations and procurement proposals.
- AI recommendations cannot bypass deterministic business rules.
- Purchase-order creation requires authorized human approval.
- AI workflow activities are recorded for auditing and traceability.
- Credentials, passwords, and API keys must never be committed to Git.

---

## Technology Stack

| Area | Technology |
|---|---|
| Web Application | React |
| Mobile Application | Flutter |
| Backend | ASP.NET Core Web API |
| Database | PostgreSQL |
| Backend Language | C# |
| AI Components | C# + Python |
| AI Framework | Microsoft Semantic Kernel |
| External AI | OpenAI / Google Gemini |
| Authentication | JWT |
| ORM | Entity Framework Core |
| Containerization | Docker / Docker Compose |
| CI | GitHub Actions |

---

## Main Business Modules

StockPilot contains four main business modules:

1. **Inventory Management**
2. **Sales & Demand Management**
3. **Supplier Management**
4. **Procurement Management**

The system also includes **Identity and User Management, Branch Management, Agentic AI Workflow Auditing, and shared integration services**.

---

## Agentic AI Workflow

StockPilot uses four specialized agents.

| Component | AI Agent | Owner |
|---|---|---|
| Inventory Management | Inventory Optimization Agent | Mathusha P |
| Sales & Demand | Demand Forecast Agent | Ravi |
| Supplier Management | Supplier Evaluation Agent | Kulshan Begum |
| Procurement Management | Procurement Coordinator Agent | Kirushan |

### Workflow

```text
Inventory Data
      │
      ▼
Inventory Optimization Agent
      │
      ▼
Transfer or Reorder Recommendation
      │
      ▼
Demand Forecast Agent
      │
      ▼
Supplier Evaluation Agent
      │
      ▼
Procurement Coordinator Agent
      │
      ▼
Deterministic Business Validation
      │
      ▼
Procurement Proposal
      │
      ▼
Human Review and Approval
      │
      ▼
Purchase Order Process
```

The AI workflow assists with decision-making but does not independently complete high-impact purchasing actions.

---

## AI Agent Responsibilities

### Inventory Optimization Agent

Analyzes inventory conditions, identifies shortages, checks stock availability at other branches, and recommends either an **internal stock transfer or supplier replenishment**.

### Demand Forecast Agent

Analyzes sales and demand information to estimate future demand and determine the required **replenishment quantity**.

### Supplier Evaluation Agent

Evaluates available supplier quotations and supplier information to recommend a suitable quotation. This component is implemented using **Python** and integrates with the ASP.NET Core backend.

### Procurement Coordinator Agent

Receives outputs from the previous agents, checks budgets and procurement rules, prepares justification, and creates a **procurement proposal for human review**.

---

## Repository Structure

```text
backend/
  StockPilot.Api/
    Modules/
      Inventory/
      SalesDemand/
      Suppliers/
      Procurement/

    Shared/
      Identity/
      Data/
      Agents/
        Orchestrator/
        Contracts/
      Integration/

    Program.cs

  tests/
  StockPilot.Tests/

web/
  src/
    modules/
      inventory/
      sales-demand/
      suppliers/
      procurement/
      agent-monitoring/

    shared/
      theme/
      layout/
      navigation/
      auth/
      api/

    components/
      ui/

mobile/
  lib/
    modules/
      inventory/
      sales_demand/
      procurement/

    shared/
      theme/
      navigation/
      auth/

agentic-ai/
  agents/
    supplier_evaluation/

  contracts/
  evaluation/
  tests/

docs/
  architecture/
  ADRs/
  database/
  integration/
  testing/

scripts/
  e2e/
```

---

## Main Features

- User authentication and authorization
- Role and policy-based access control
- Branch management
- Product and category management
- Inventory management
- Batch management
- Stock movement tracking
- Inter-branch stock transfers
- Barcode scanning
- Sales recording
- Demand forecasting
- Inventory optimization
- Supplier management
- Supplier ratings
- Quotation management
- AI-assisted supplier evaluation
- Procurement budget management
- Procurement proposal generation
- Human approval workflow
- Purchase-order management
- AI-assisted recommendations
- Agent workflow auditing and monitoring
- React management interface
- Flutter operational mobile application
- Email notification support

---

## React Web Application

The React application provides the main **management interface** for StockPilot.

It supports:

- Inventory management
- Sales and demand monitoring
- Supplier management
- Procurement management
- Proposal review and approval
- Purchase-order visibility
- Agentic AI monitoring
- Business dashboards

React communicates only with the ASP.NET Core API.

```text
React
  │
  ▼
ASP.NET Core API
  │
  ▼
Business Services
  │
  ▼
PostgreSQL
```

---

## Flutter Mobile Application

The Flutter application focuses on **operational activities**.

It supports:

- Inventory viewing
- Barcode scanning
- POS sales recording
- Procurement-related operations
- Purchase-order status
- AI-assisted insights

Flutter uses the same ASP.NET Core API, authentication model, business rules, and PostgreSQL database as the React application.

> **Current limitation:** A dedicated Flutter Supplier Management module is not fully implemented.

---

## Backend API

The ASP.NET Core Web API acts as the **central integration point** of StockPilot.

It connects:

```text
React
Flutter
PostgreSQL
Inventory Module
Sales & Demand Module
Supplier Module
Procurement Module
Agentic AI
OpenAI / Gemini
Email Notifications
```

Business logic is maintained in the backend rather than duplicated across the client applications.

---

## Database

StockPilot uses a centralized **PostgreSQL database** accessed through **Entity Framework Core**.

```text
React / Flutter
      │
      ▼
ASP.NET Core API
      │
      ▼
Application Services
      │
      ▼
Entity Framework Core
      │
      ▼
AppDbContext
      │
      ▼
PostgreSQL
```

Database migrations are maintained under the backend project.

Development seed data is available to support testing and demonstration.

---

## Authentication and Authorization

StockPilot uses **JWT-based authentication**.

### Main Roles

- Business Owner
- Procurement Manager
- Branch Manager
- Store Employee

Authentication flow:

```text
User Login
    │
    ▼
Credential Validation
    │
    ▼
JWT Generated
    │
    ▼
Client Uses JWT
    │
    ▼
ASP.NET Core Authentication
    │
    ▼
Role / Policy Authorization
    │
    ▼
Authorized Business Operation
```

Final authorization is always enforced by the backend.

---

## AI Safety and Human Control

StockPilot uses several controls to reduce risks from AI-generated output:

- Structured agent input/output contracts
- Agent schema validation
- Deterministic business rules
- Product and supplier validation
- Quotation validation
- Budget validation
- Controlled AI tools
- Untrusted-content screening
- Workflow auditing
- Deterministic fallback behaviour
- Human approval

The general safety flow is:

```text
External / Business Data
        │
        ▼
Untrusted Content Screening
        │
        ▼
Agent Processing
        │
        ▼
Structured Output Validation
        │
        ▼
Deterministic Business Validation
        │
        ▼
Procurement Proposal
        │
        ▼
Human Approval
        │
        ▼
Authorized Business Action
```

AI-generated recommendations cannot override mandatory business rules.

---

## Third-Party Integrations

StockPilot currently integrates:

- **OpenAI**
- **Google Gemini**
- **SMTP Email Services**

External services are accessed through controlled backend or Agentic AI components.

React and Flutter never directly store or use external AI credentials.

---

## Environment Configuration

Copy the example environment file and configure the required values locally.

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `Jwt__SigningKey` | JWT signing secret |
| `OpenAI__ApiKey` | OpenAI API key for backend components |
| `OPENAI_API_KEY` | OpenAI API key for Python components |
| `GEMINI_API_KEY` | Google Gemini API key |
| `AgenticAi__WorkingDirectory` | Python Agentic AI directory |
| `AgenticAi__PythonPath` | Python executable |
| `AgenticAi__AgentMode` | `deterministic` or `ai` |
| `Cors__AllowedOrigins` | Allowed frontend origins |

> **Security:** Never commit real API keys, passwords, JWT signing secrets, SMTP credentials, or production database connection strings.

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd StockPilot
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Add the required local configuration and credentials.

### 3. Backend

Restore dependencies and start the ASP.NET Core API.

```bash
dotnet restore
dotnet run
```

### 4. React

```bash
cd web
npm install
npm run dev
```

### 5. Flutter

```bash
cd mobile
flutter pub get
flutter run
```

### 6. Python Agentic AI

Configure the required Python environment and dependencies under:

```text
agentic-ai/
```

Provide an OpenAI or Gemini configuration when AI-assisted execution is required.

---

## Docker

StockPilot supports containerized execution using Docker and Docker Compose.

```text
React / NGINX
      │
      ▼
ASP.NET Core API
      │
      ▼
PostgreSQL
```

Start configured services using:

```bash
docker compose up --build
```

Docker Compose coordinates the web application, backend, and PostgreSQL services according to the repository configuration.

---

## Testing

StockPilot includes testing across multiple technology stacks.

### Backend

Examples include:

```text
ProductServiceTests
ProposalValidatorTests
ProcurementCoordinatorAgentTests
ProcurementTransactionIntegrationTests
```

### React

Examples include:

```text
ProposalDetailPage.test.jsx
AgentMonitoringPage.test.jsx
```

### Flutter

Tests are located under:

```text
mobile/test/
```

### Python Agentic AI

Tests are located under:

```text
agentic-ai/tests/
```

Testing covers business rules, validation, database operations, AI contracts, supplier evaluation, procurement behaviour, and selected frontend functionality.

---

## Continuous Integration

GitHub Actions is used for **Continuous Integration**.

```text
Push / Pull Request
        │
        ▼
ASP.NET Core Build & Tests
        │
        ▼
PostgreSQL Integration Tests
        │
        ▼
React Test & Build
        │
        ▼
Flutter Analyze & Tests
        │
        ▼
Python Pytest
        │
        ▼
CI Result
```

Automated production deployment is not currently included.

---

## Git Workflow

### Branch Naming

```text
feature/<short-name>
fix/<short-name>
test/<short-name>
docs/<short-name>
```

Examples:

```text
feature/inventory-stock-count
feature/supplier-quotation-compare
test/procurement-approval
docs/database-design
```

### Commit Convention

Use small and meaningful commits.

```text
feat: add stock movement endpoint
fix: correct inventory validation
test: cover invalid quotation
docs: update database architecture
```

Development should be completed through feature branches and reviewed before merging into `main`.

---

## Security

StockPilot applies multiple security controls:

- JWT authentication
- Password hashing
- Role-based authorization
- Policy-based authorization
- Login rate limiting
- Request validation
- HTTPS/HSTS support
- CORS configuration
- Centralized exception handling
- Environment-based secret configuration
- Controlled database access
- AI input screening
- Agent schema validation
- Deterministic business rules
- Human approval
- Workflow auditing

---

## Current Limitations

- Flutter Supplier Management is not fully implemented.
- Some React and Flutter modules have limited automated test coverage.
- Android release configuration requires finalization.
- Automated production deployment is not currently implemented.
- External AI functionality depends on provider availability.
- Agentic AI processing follows a sequential workflow and may introduce additional latency.

---

## Future Improvements

Planned improvements include:

- Complete Flutter Supplier Management
- Expand backend, React, and Flutter testing
- Add end-to-end testing
- Introduce automated deployment
- Improve database and API performance
- Expand Agentic AI evaluation
- Improve workflow monitoring and observability
- Strengthen production secret management
- Add database backup and recovery procedures
- Improve Android production release configuration

---

## Development Rules

1. Use the ASP.NET Core API as the authoritative application layer.
2. Keep shared business logic in the backend.
3. React and Flutter must not connect directly to PostgreSQL.
4. Client applications must not directly access external LLM providers.
5. AI agents must not bypass deterministic business validation.
6. Purchase-order creation requires authorized human approval.
7. Store auditable workflow information rather than hidden model reasoning.
8. Never commit credentials, API keys, passwords, or real personal data.
9. Use meaningful branches, commits, pull requests, and code reviews.
10. Test and verify changes before merging.

---

## Project Goal

StockPilot provides a centralized platform for managing **inventory, sales, demand, suppliers, procurement, and AI-assisted replenishment decisions** across web and mobile applications.

The system combines automation with deterministic business validation and human oversight to support the project's main objective:

> ### Right Stock. Right Supplier. Right Time.
