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

---

## Directory Structure

```
mobile/
├── lib/
│   ├── main.dart                               # App shell & bottom navigation bar
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
