# StockPilot Backend (.NET 8)

The backend is organized into two primary projects:
- **`StockPilot.API`**: ASP.NET Core Web API containing Controllers, Application services/DTOs/Agentic AI, Domain entities/enums, and Infrastructure/Persistence (Entity Framework Core with PostgreSQL & In-Memory support).
- **`StockPilot.Tests`**: Automated unit and integration test suite (xUnit).

## Folder Structure

```
backend/
├── StockPilot.API/
│   ├── Application/        # Core business logic, DTOs, interfaces, and Agentic AI workflows
│   ├── Controllers/        # REST API endpoints (Sales, Demand Forecast, Agent Workflow)
│   ├── Domain/             # Entities, enums, base entity models
│   ├── Infrastructure/     # EF Core DbContext, entity configurations, seed data
│   ├── Properties/         # launchSettings.json (Port 5004)
│   ├── appsettings.json    # Application configuration
│   ├── Program.cs          # Dependency injection & HTTP request pipeline
│   └── StockPilot.API.csproj
├── StockPilot.Tests/
│   ├── SalesAndDemandTests.cs
│   └── StockPilot.Tests.csproj
├── README.md
└── StockPilot.sln
```

## Running the Backend

### Option 1: From `backend/` directory
```bash
cd backend
dotnet run --project StockPilot.API
```

### Option 2: Navigate directly into the API project
```bash
cd backend/StockPilot.API
dotnet run
```

### Option 3: From the repository root
```bash
dotnet run --project backend/StockPilot.API
```

### Running with In-Memory Database (No PostgreSQL required)
```powershell
$env:USE_IN_MEMORY="true"; dotnet run --project backend/StockPilot.API
```

## Running Tests

From `backend/`:
```bash
dotnet test StockPilot.sln
```
Or from the repository root:
```bash
dotnet test backend/StockPilot.sln
```
