#!/usr/bin/env bash
# Cross-client end-to-end run for the Procurement module:
#
#   Flutter (Branch Manager)  -> API -> PostgreSQL -> Procurement Coordinator Agent -> PendingApproval
#   React   (Procurement Mgr) -> approves through POST /api/agent-workflows/{id}/approve
#   Flutter (initiator)       -> sees the proposal as Approved
#
# Requirements: a PostgreSQL server you may create databases on, the .NET 8 SDK, Flutter, Node.
#
#   E2E_PG_HOST=localhost E2E_PG_PORT=5432 E2E_PG_USER=postgres PGPASSWORD=... \
#     scripts/e2e/run-procurement-cross-client.sh
#
# The run uses its own new database (stockpilot_e2e_<timestamp>), which it keeps afterwards so the
# evidence can be inspected. Output is also written to scripts/e2e/last-run.log.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PG_HOST="${E2E_PG_HOST:-localhost}"
PG_PORT="${E2E_PG_PORT:-5432}"
PG_USER="${E2E_PG_USER:-postgres}"
PSQL="${PSQL:-psql}"
API_PORT="${E2E_API_PORT:-5199}"
API_URL="http://localhost:${API_PORT}"
DB="stockpilot_e2e_$(date +%Y%m%d%H%M%S)"
STATE_FILE="$(mktemp -d)/procurement-e2e-state.json"
LOG="$ROOT/scripts/e2e/last-run.log"
API_PID=""

exec > >(tee "$LOG") 2>&1

cleanup() { [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT

step() { printf '\n=== %s ===\n' "$*"; }

psql_db() { "$PSQL" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB" -v ON_ERROR_STOP=1 "$@"; }

start_api() { # $1 = ASPNETCORE_ENVIRONMENT
  ASPNETCORE_ENVIRONMENT="$1" \
  UseInMemoryDatabase=false \
  ConnectionStrings__DefaultConnection="Host=${PG_HOST};Port=${PG_PORT};Username=${PG_USER};Password=${PGPASSWORD:-};Database=${DB}" \
  ASPNETCORE_URLS="$API_URL" \
    bash -c 'cd "$1" && exec dotnet StockPilot.API.dll' _ "$ROOT/backend/StockPilot.API/bin/Debug/net8.0" \
    > "$ROOT/scripts/e2e/api-$1.log" 2>&1 &   # run from the output folder so appsettings.json is found
  API_PID=$!
  for _ in $(seq 1 60); do
    curl -sf "$API_URL/api/health" > /dev/null && return 0
    kill -0 "$API_PID" 2>/dev/null || { echo "API exited; see scripts/e2e/api-$1.log"; exit 1; }
    sleep 1
  done
  echo "API did not become healthy"; exit 1
}

stop_api() { kill "$API_PID"; wait "$API_PID" 2>/dev/null || true; API_PID=""; }

step "Create database $DB"
"$PSQL" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB\""

step "Build API"
dotnet build "$ROOT/backend/StockPilot.API/StockPilot.API.csproj" -nologo -v quiet

# Program.cs seeds the dev logins (Development only) before it applies migrations, which fails on
# an empty database. Start once in Production to migrate, then in Development to seed the users.
step "Apply migrations (API in Production mode)"
start_api Production
stop_api

step "Start API in Development mode (seeds dev accounts)"
start_api Development
curl -s "$API_URL/api/health"; echo

step "1/3 Flutter: Branch Manager starts the Procurement Coordinator Agent"
(cd "$ROOT/mobile-flutter" && flutter test test/e2e/procurement_cross_client_e2e_test.dart \
  --dart-define=E2E_API_URL="$API_URL" --dart-define=E2E_STAGE=initiate --dart-define=E2E_STATE_FILE="$STATE_FILE")
cat "$STATE_FILE"; echo

step "PostgreSQL after initiate"
psql_db -c "SELECT \"Id\", \"Status\", \"CreatedByAgent\", \"TotalEstimatedCost\" FROM procurement.\"ProcurementProposals\" WHERE \"CreatedByAgent\";"
psql_db -c "SELECT \"Id\", \"AgentName\", \"CurrentStep\", \"ApprovalStatus\", \"IsSuccess\" FROM \"AgentWorkflowAudits\" WHERE \"AgentName\" = 'ProcurementCoordinatorAgent';"

step "2/3 React: Procurement Manager approves in the web client"
(cd "$ROOT/web/stockpilot-web" && E2E_API_URL="$API_URL" E2E_STATE_FILE="$STATE_FILE" npm run --silent test:e2e)

step "3/3 Flutter: initiator sees the decision"
(cd "$ROOT/mobile-flutter" && flutter test test/e2e/procurement_cross_client_e2e_test.dart \
  --dart-define=E2E_API_URL="$API_URL" --dart-define=E2E_STAGE=verify --dart-define=E2E_STATE_FILE="$STATE_FILE")

step "PostgreSQL after approval"
psql_db -c "SELECT p.\"Id\", p.\"Status\", d.\"Decision\", d.\"Comment\", d.\"DecidedAt\" FROM procurement.\"ProcurementProposals\" p JOIN procurement.\"ApprovalDecisions\" d ON d.\"ProposalId\" = p.\"Id\" WHERE p.\"CreatedByAgent\";"
psql_db -c "SELECT \"Id\", \"CurrentStep\", \"ApprovalStatus\", \"UpdatedBy\" FROM \"AgentWorkflowAudits\" WHERE \"AgentName\" = 'ProcurementCoordinatorAgent';"
psql_db -c "SELECT COUNT(*) AS purchase_orders_created_by_run FROM procurement.\"PurchaseOrders\" WHERE \"ProposalId\" IN (SELECT \"Id\" FROM procurement.\"ProcurementProposals\" WHERE \"CreatedByAgent\");"

step "PASS: Flutter -> API -> PostgreSQL -> agent -> React approval -> Flutter sees Approved (database $DB)"
