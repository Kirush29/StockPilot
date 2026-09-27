#!/usr/bin/env bash
# Cross-platform end-to-end run of the multi-agent replenishment workflow, on real agents and PostgreSQL:
#
#   React   (Procurement Mgr) -> Replenishment page -> API -> Replenishment Orchestrator
#                                -> Inventory Optimization -> Demand Forecast -> Supplier Evaluation
#                                -> Procurement Coordinator -> PostgreSQL -> PendingApproval (stops for a human)
#   React   (Business Owner)  -> approves on the Replenishment page (human gate)
#   React   (Procurement Mgr) -> converts the proposal to a purchase order and receives it -> Inventory batch (D14)
#   Flutter (Branch Manager)  -> sees the final status: proposal Converted, order Received
#
# Requirements: a PostgreSQL server you may create databases on, the .NET 8 SDK, Flutter, Node, and the
# Supplier Evaluation agent's Python requirements (pip install -r agentic-ai/requirements.txt).
#
#   E2E_PG_HOST=localhost E2E_PG_PORT=5432 E2E_PG_USER=postgres PGPASSWORD=... \
#     scripts/e2e/run-replenishment-e2e.sh
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
STATE_FILE="$(mktemp -d)/replenishment-e2e-state.json"
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
    bash -c 'cd "$1" && exec dotnet StockPilot.Api.dll' _ "$ROOT/backend/StockPilot.Api/bin/Debug/net8.0" \
    > "$ROOT/scripts/e2e/api-$1.log" 2>&1 &   # run from the output folder so appsettings.json is found
  API_PID=$!
  for _ in $(seq 1 60); do
    curl -sf "$API_URL/api/health" > /dev/null && return 0
    kill -0 "$API_PID" 2>/dev/null || { echo "API exited; see scripts/e2e/api-$1.log"; exit 1; }
    sleep 1
  done
  echo "API did not become healthy"; exit 1
}

step "Create database $DB"
"$PSQL" -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB\""

step "Build API"
dotnet build "$ROOT/backend/StockPilot.Api/StockPilot.Api.csproj" -nologo -v quiet

# Program.cs applies the shared platform baseline migration (all four modules, one history) and
# then, in Development, seeds the dev logins, so one start is enough on an empty database.
step "Start API in Development mode (applies baseline migration, seeds dev accounts)"
start_api Development
curl -s "$API_URL/api/health"; echo

step "PostgreSQL: one migration history (D2)"
psql_db -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY \"MigrationId\";"
psql_db -tA -c "SELECT to_regclass('procurement.\"__EFMigrationsHistory\"') IS NULL;" | grep -qx t \
  || { echo "FAIL: a separate procurement migration history exists"; exit 1; }

step "1/4 React: Procurement Manager runs the multi-agent replenishment workflow"
(cd "$ROOT/web" && E2E_API_URL="$API_URL" E2E_STATE_FILE="$STATE_FILE" E2E_STAGE=initiate npm run --silent test:e2e)
cat "$STATE_FILE"; echo

step "PostgreSQL: one orchestrator trace linking the four agents' records"
WF=$(sed -n 's/.*"workflowId": "\([^"]*\)".*/\1/p' "$STATE_FILE")
psql_db -c "SELECT \"AgentName\", \"CurrentStep\", \"ApprovalStatus\", \"IsSuccess\" FROM \"AgentWorkflowAudits\" WHERE \"Id\" = '$WF';"
psql_db -c "SELECT \"FinalOutcomeJson\"::json->'result'->'childWorkflows' AS child_workflows FROM \"AgentWorkflowAudits\" WHERE \"Id\" = '$WF';"
psql_db -c "SELECT \"AgentName\", COUNT(*) AS runs FROM \"AgentWorkflowAudits\" GROUP BY \"AgentName\" ORDER BY 1;"
psql_db -c "SELECT \"RecommendationType\", \"IssueType\", \"SuggestedQuantity\", \"Status\" FROM \"AiRecommendations\" WHERE \"ProductId\" = '18464716-8fa7-49da-b521-08b1dc057c28' AND \"DestinationBranchId\" = '11111111-1111-1111-1111-111111111111';"
psql_db -c "SELECT \"Id\", \"Status\", \"CreatedByAgent\", \"TotalEstimatedCost\" FROM procurement.\"ProcurementProposals\" WHERE \"CreatedByAgent\";"

step "2/4 React: Business Owner approves; the order is placed and received"
(cd "$ROOT/web" && E2E_API_URL="$API_URL" E2E_STATE_FILE="$STATE_FILE" E2E_STAGE=approve npm run --silent test:e2e)

step "3/4 Flutter: Branch Manager sees the final status"
(cd "$ROOT/mobile" && flutter test test/e2e/replenishment_e2e_test.dart \
  --dart-define=E2E_API_URL="$API_URL" --dart-define=E2E_STAGE=verify --dart-define=E2E_STATE_FILE="$STATE_FILE")

step "4/4 PostgreSQL: final state"
psql_db -c "SELECT p.\"Status\" AS proposal_status, d.\"Decision\", d.\"Comment\", o.\"OrderNumber\", o.\"Status\" AS order_status FROM procurement.\"ProcurementProposals\" p JOIN procurement.\"ApprovalDecisions\" d ON d.\"ProposalId\" = p.\"Id\" JOIN procurement.\"PurchaseOrders\" o ON o.\"ProposalId\" = p.\"Id\" WHERE p.\"CreatedByAgent\";"
psql_db -c "SELECT b.\"BatchNumber\", b.\"Quantity\", b.\"UnitCost\", i.\"QuantityOnHand\" AS colombo_stock_now FROM \"Batches\" b JOIN \"Inventories\" i ON i.\"ProductId\" = b.\"ProductId\" AND i.\"BranchId\" = b.\"BranchId\" WHERE b.\"BatchNumber\" LIKE 'PO-%';"

step "PASS: React -> API -> orchestrator -> 4 real agents -> PostgreSQL -> human approval -> order received -> Flutter sees final status (database $DB)"
