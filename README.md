# STELLA — Smart Tracking, Exploration & Location Live Analytics

STELLA is a real-time GPS live tracking and journey analytics platform designed for Android devices, backed by Supabase and visualized with an interactive OpenStreetMap React web dashboard.

---

## 🚀 System Architecture

```text
       SAMSUNG GALAXY F07 (Android)
                    │
      Foreground High-Accuracy GPS
      (~1 second update interval)
                    │
                    ▼
          Expo Location + SDK
                    │
                    ▼
          SUPABASE BACKEND
       ┌────────────┴────────────┐
       ▼                         ▼
PostgreSQL Tables        Supabase Realtime
- trips                   - Live location events
- location_history        - Active trip updates
       ▲                         ▲
       └────────────┬────────────┘
                    │
                    ▼
        REACT WEB DASHBOARD (Vite)
         - OpenStreetMap & Leaflet
         - Live Moving Marker & Route
         - Journey Analytics & History
```

---

## 📁 Repository Structure

```text
gps/
├── .github/
│   └── workflows/
│       └── android-build.yml       # Automated GitHub Actions Android APK build pipeline
├── mobile_app/                     # React Native / Expo Android application
│   ├── app/                        # Expo Router file-based screens
│   ├── components/                 # Reusable UI widgets and metrics displays
│   ├── hooks/                      # Custom React hooks (GPS tracker, KeepAwake, Network)
│   ├── services/                   # Supabase client and location upload service
│   ├── utils/                      # Formatting and distance calculations
│   ├── constants/                  # Color palette (Yellow & White) and config
│   ├── .env.example                # Example environment file
│   └── package.json
├── frontend/                       # React + Vite + Tailwind CSS Web Dashboard
│   ├── src/
│   │   ├── components/             # Live tracking map, metrics cards, header
│   │   ├── pages/                  # Dashboard, Live Tracking, Trip History, Login
│   │   ├── hooks/                  # Supabase Realtime subscriptions & queries
│   │   ├── services/               # Supabase client & REST queries
│   │   ├── utils/                  # Haversine distance, speed calculations
│   │   └── styles/                 # Tailwind theme configuration
│   ├── .env.example
│   └── package.json
├── supabase/
│   ├── schema.sql                  # Idempotent database schema, RLS policies, & indexes
│   └── README.md                   # Supabase setup guide
├── .gitignore                      # Git ignore protecting credentials and build artifacts
└── README.md
```

---

## 🎨 Design Theme

- **Primary Accent:** `#F5C400` (STELLA Yellow)
- **Background:** `#F7F7F5` / `#FFFFFF`
- **Text & Accents:** `#1C1C1C` (Dark Charcoal) & `#777777` (Muted Grey)

---

## 🔐 Security & RLS Policy

- **Row Level Security (RLS)** is strictly enforced on all tables.
- Users can view and manage only their own trips and location records.
- Secret and service-role keys are never embedded in client applications.
- All environment files containing actual credentials (`.env`) and raw config files are strictly gitignored.
