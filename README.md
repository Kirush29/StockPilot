# StockPilot

**Right Stock. Right Supplier. Right Time.**

StockPilot is an integrated **inventory and procurement management system** developed for **SE3090 Assignment 1**.

The system combines a **React web application**, **Flutter mobile application**, **ASP.NET Core Web API**, and **PostgreSQL database**. It also includes a controlled **Agentic AI workflow** for inventory optimization, demand forecasting, supplier evaluation, and procurement coordination.

---

## System Architecture

```text
React Web / Flutter Mobile
          │
          ▼
   ASP.NET Core API
          │
          ▼
      PostgreSQL
          │
          ▼
Replenishment Orchestrator
          │
     ┌────┴────┐
     ▼         ▼
 C# Agents   Python Agent
     │         │
     └────┬────┘
          ▼
   Workflow Result
          │
          ▼
   Human Approval
          │
          ▼
    Purchase Order
```

### Architecture Rules

- React and Flutter communicate only with the ASP.NET Core API.
- Client applications never access PostgreSQL or AI services directly.
- PostgreSQL acts as the centralized database.
- AI agents generate recommendations and procurement proposals.
- Purchase orders require authorized **human approval**.
- AI workflow activities are recorded for auditing and traceability.
- Credentials and API keys must never be committed to Git.

---

## Main Technologies

| Area | Technology |
|---|---|
| Web Application | React |
| Mobile Application | Flutter |
| Backend | ASP.NET Core Web API |
| Database | PostgreSQL |
| Backend Language | C# |
| AI Component | C# + Python |
| External AI | OpenAI / Gemini |
| Authentication | JWT |
| Containerization | Docker |
| CI | GitHub Actions |

---

## Agentic AI Workflow

StockPilot uses four specialized AI agents:

| Component | AI Agent | Owner |
|---|---|---|
| Inventory Management | Inventory Optimization Agent | Mathusha P |
| Sales & Demand | Demand Forecast Agent | Ravi |
| Supplier Management | Supplier Evaluation Agent | Kulshan Begum |
| Procurement Management | Procurement Coordinator Agent | Kirushan |

The workflow follows:

```text
Inventory Condition
        │
        ▼
Inventory Optimization Agent
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
Business Rule Validation
        │
        ▼
Procurement Proposal
        │
        ▼
Human Review & Approval
        │
        ▼
Purchase Order
```

The AI assists with decision-making but does not independently complete high-impact purchasing actions.

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

    shared/
      theme/
      layout/
      navigation/
      auth/
      api/

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

- User authentication and role-based authorization
- Product and category management
- Branch inventory management
- Batch and stock movement tracking
- Inter-branch stock transfers
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
- Purchase order management
- AI recommendations
- Agent workflow auditing
- React management interface
- Flutter operational mobile application

---

## Security

StockPilot uses **JWT authentication** with role and policy-based authorization.

Main roles include:

- Business Owner
- Procurement Manager
- Branch Manager
- Store Employee

Protected operations are validated through the ASP.NET Core backend before accessing business services or PostgreSQL.

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

The client applications never connect directly to the database.

Database migrations are maintained under:

```text
backend/StockPilot.API/Shared/Data/Migrations/
```

Development seed data is provided for testing and demonstration.

---

## AI Safety and Validation

AI-generated recommendations are controlled using:

- Structured input/output contracts
- Schema validation
- Deterministic business rules
- Budget validation
- Supplier validation
- Quotation validation
- Controlled AI tools
- Workflow auditing
- Human approval

If external AI services are unavailable, selected workflows can use deterministic fallback behaviour.

---

## Environment Configuration

Copy the example environment configuration and provide secrets locally.

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Example / Default |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection | `Host=postgres;Port=5432;Database=stockpilotdb;Username=postgres;Password=...` |
| `Jwt__SigningKey` | JWT signing secret (minimum 32 characters) | Development secret |
| `OpenAI__ApiKey` | OpenAI API key | Optional |
| `OPENAI_API_KEY` | OpenAI key for Python components | Optional |
| `GEMINI_API_KEY` | Gemini API key | Optional |
| `AgenticAi__WorkingDirectory` | Python AI directory | `../../agentic-ai` |
| `AgenticAi__PythonPath` | Python executable | `python` / `python3` |
| `AgenticAi__AgentMode` | AI execution mode | `deterministic` / `ai` |
| `Cors__AllowedOrigins` | Allowed frontend origins | `http://localhost:5173;http://localhost:3000` |

> **Important:** Never commit real API keys, passwords, JWT secrets, or production connection strings.

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

Use small and meaningful commits:

```text
feat: add stock movement endpoint
fix: correct inventory validation
test: cover invalid quotation
docs: update database architecture
```

---

## Continuous Integration

GitHub Actions is used for Continuous Integration, including:

```text
Code Push / Pull Request
          │
          ▼
     Backend Build
          │
          ▼
    Automated Tests
          │
          ▼
 PostgreSQL Integration Tests
          │
          ▼
 React Test & Build
          │
          ▼
Flutter Analysis & Tests
          │
          ▼
     Python Pytest
```

Automated production deployment is not currently included.

---

## Current Limitations

- Flutter Supplier Management is not fully implemented.
- Some React and Flutter modules have limited automated test coverage.
- Android release configuration requires finalization.
- Production deployment is not automated.
- External AI functionality depends on provider availability.
- The Agentic AI workflow currently follows a sequential execution model.

---

## Future Improvements

Future improvements include:

- Complete Flutter Supplier Management
- Expand automated and end-to-end testing
- Add automated deployment
- Improve database and API performance
- Expand Agentic AI evaluation
- Improve workflow monitoring and observability
- Strengthen production secret management
- Add database backup and recovery policies

---

## Development Rules

1. Use the ASP.NET Core API as the authoritative application layer.
2. Keep shared business logic in the backend.
3. Do not connect React or Flutter directly to PostgreSQL.
4. Do not allow AI agents to bypass business-rule validation.
5. Require human approval for purchase-order creation.
6. Store auditable AI workflow results rather than hidden model reasoning.
7. Never commit credentials, API keys, passwords, or real personal data.
8. Use meaningful branches, commits, pull requests, and code reviews.

---

## Project Goal

StockPilot aims to provide a centralized system for managing **inventory, sales, suppliers, procurement, and AI-assisted replenishment decisions** across web and mobile platforms.

The overall objective is simple:

> **Right Stock. Right Supplier. Right Time.**
