# ==============================================================================
# StockPilot Backend Dockerfile (.NET 8 Web API + Python 3 Agentic AI)
# ==============================================================================

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project definitions for caching dependency restore
COPY backend/StockPilot.sln ./backend/
COPY backend/StockPilot.Api/StockPilot.Api.csproj ./backend/StockPilot.Api/
COPY backend/StockPilot.Tests/StockPilot.Tests.csproj ./backend/StockPilot.Tests/
COPY backend/tests/StockPilot.Api.Tests/StockPilot.Api.Tests.csproj ./backend/tests/StockPilot.Api.Tests/
COPY backend/tests/StockPilot.Procurement.Tests/StockPilot.Procurement.Tests.csproj ./backend/tests/StockPilot.Procurement.Tests/

WORKDIR /src/backend
RUN dotnet restore StockPilot.sln

# Copy remaining backend source files
WORKDIR /src
COPY backend/ ./backend/

WORKDIR /src/backend/StockPilot.Api
RUN dotnet publish StockPilot.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------------------
# Runtime stage: ASP.NET Core 8 + Python 3 runtime for Supplier Evaluation Agent
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install Python 3, pip, curl (for healthchecks), and create python symlink
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Copy published .NET application
COPY --from=build /app/publish .

# Copy agentic-ai files and install dependencies
COPY agentic-ai/ ./agentic-ai/
RUN pip install --no-cache-dir --break-system-packages -r ./agentic-ai/requirements.txt

ENV ASPNETCORE_URLS=http://+:10000 \
    ASPNETCORE_ENVIRONMENT=Production \
    AgenticAi__WorkingDirectory=/app/agentic-ai \
    AgenticAi__PythonPath=python3

EXPOSE 10000

ENTRYPOINT ["dotnet", "StockPilot.Api.dll"]
