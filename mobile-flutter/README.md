# StockPilot Operational Mobile Application

Built with **Flutter** for warehouse and retail operational staff (Android & iOS).

StockPilot Mobile provides fast point-of-sale store transactions, stock count entry, and real-time demand alerts. Clients strictly call the ASP.NET Core API at `http://10.0.2.2:5004/api/v1` (Android Emulator) or `http://localhost:5004/api/v1` (iOS/Desktop).

---

## Implemented Features (Sales & Demand Component)

1. **Store POS Sales Entry (`record_pos_sale_screen.dart`)**:
   - Quick retail transaction entry with branch selection.
   - Dynamic tax (8%) and line-total calculation.
   - Synchronous dispatch to ASP.NET Core `POST /api/v1/Sales` endpoint.
2. **Demand & ROP Alerts (`demand_alerts_screen.dart`)**:
   - Live query of `GET /api/v1/demand/reorder-suggestions`.
   - Urgency status color-coding: `Critical` (Rose), `Warning` (Amber), `Normal` (Emerald).
   - Shows days-of-supply remaining and Reorder Point (ROP) threshold.

## Implemented Features (Procurement Component)

Calls the same `/api/procurement/...` and `/api/auth/...` endpoints as `web/stockpilot-web`
(no `/api/v1` prefix on these — that prefix is Sales/Demand-specific). Requires signing in
first via the placeholder `LoginScreen` (no shared auth UI exists yet in this repo).

1. **Purchase Order Status (`purchase_order_status_screen.dart`)**: read-only "where's my
   order" list with a status filter, for anyone the backend's `ProcurementRoles.ViewOrders`
   policy allows (`StoreEmployee`, `BranchManager`, `ProcurementManager`, `BusinessOwner`).
   The API doesn't expose branch on `PurchaseOrder` yet, so this can't be scoped to "my
   branch" client-side — it shows everything the caller's role can see.
2. **Delivery Receiving (`delivery_receiving_screen.dart`)**: lets a Store Employee confirm
   full/partial receipt of an `Ordered`/`PartiallyReceived` order, checking scanned or typed
   product codes off against the order's line items. Backend limitation: there's no per-line
   `ReceivedQuantity` field on `UpdateOrderStatusRequest`, so per-item counts decide whether
   the submitted status is `PartiallyReceived` or `Received` and get folded into the
   free-text `notes` for an audit trail, but aren't queryable as structured data server-side.
3. **Proposal decision notifications (`proposal_decision_watcher.dart` +
   `procurement_notification_service.dart`)**: polls the signed-in user's own proposals
   every 45s and fires a local notification the first time one flips to Approved/Rejected.
   This is a stub, not real push — it only works while the app is open and polling.
4. **Shared scan input (`shared/widgets/scan_input_field.dart`)**: placeholder for the
   camera-based scanner the Inventory module owns — coordinate before shipping this to
   production. Currently accepts keyboard-wedge scanner input or manual typing.

---

## Directory Structure

```
mobile/
├── lib/
│   ├── main.dart                               # App shell, session gate, bottom nav
│   ├── shared/
│   │   ├── models/app_user.dart                # Decoded /api/auth/login user info
│   │   ├── services/
│   │   │   ├── auth_service.dart               # Secure token storage + session state
│   │   │   ├── auth_api_service.dart           # POST /api/auth/login
│   │   │   └── procurement_notification_service.dart  # Local-notification stub
│   │   ├── screens/login_screen.dart           # Placeholder sign-in UI
│   │   └── widgets/scan_input_field.dart       # Placeholder for shared scan widget
│   ├── procurement/
│   │   ├── models/
│   │   │   ├── purchase_order.dart             # PurchaseOrder(Summary|Detail) DTOs
│   │   │   └── proposal_summary.dart           # ProposalSummaryResponse DTO
│   │   ├── screens/
│   │   │   ├── purchase_order_status_screen.dart
│   │   │   └── delivery_receiving_screen.dart
│   │   └── services/
│   │       ├── procurement_api_service.dart    # GET/PATCH /api/procurement/orders
│   │       └── proposal_decision_watcher.dart  # Polls proposals for decisions
│   └── sales/
│       ├── models/
│       │   ├── sale_transaction.dart           # Sale and item DTOs
│       │   └── demand_summary.dart             # ROP alert models
│       ├── screens/
│       │   ├── record_pos_sale_screen.dart     # Point-of-sale checkout screen
│       │   └── demand_alerts_screen.dart       # Live stockout risk alerts screen
│       └── services/
│           └── sales_api_service.dart          # HTTP client for ASP.NET Core
└── pubspec.yaml                                # Flutter package manifest
```

**Note:** this repo has no `android/`/`ios/` platform folders committed yet — run
`flutter create .` inside `mobile/` first if you haven't, then `flutter pub get`. The
procurement code above was written and reviewed by hand but not run through
`flutter analyze`/`flutter run`, since no Flutter SDK was available in the environment
that wrote it — please verify on your machine before merging.

---

## Running the App

1. Ensure the ASP.NET Core API is running:
   ```bash
   cd backend && dotnet run --project src/StockPilot.Api
   ```
2. Run Flutter app on emulator or device:
   ```bash
   cd mobile
   flutter pub get
   flutter run
   ```
