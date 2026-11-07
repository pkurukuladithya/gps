# STELLA — Supabase Architecture & Database Setup

This directory contains the database definition and configuration reference for the STELLA GPS tracking platform.

## Architecture Overview

STELLA uses Supabase as its unified backend:
1. **Supabase Auth**: Authenticates users with Email & Password. Both the React Native mobile app and the Vite web dashboard share the exact same user credentials.
2. **PostgreSQL Database**:
   - `trips`: Stores individual journey records (`id`, `user_id`, `trip_name`, `status`, `started_at`, `ended_at`, `created_at`).
   - `location_history`: Stores individual GPS coordinate fixes recorded during trips (`id`, `trip_id`, `user_id`, `latitude`, `longitude`, `accuracy`, `speed`, `recorded_at`, `received_at`).
3. **Row Level Security (RLS)**: Enforces strict data isolation:
   - Users can only query, insert, update, or delete their own trips.
   - Users can only insert locations tied to their own active trips.
   - Unauthenticated/anonymous requests cannot access or insert any tracking data.
4. **Supabase Realtime**:
   - The `location_history` and `trips` tables are published to the `supabase_realtime` publication.
   - Allows the web dashboard to listen to live GPS updates via WebSockets as coordinates are pushed from the mobile phone.

## Database Schema & Migrations

The authoritative idempotent SQL script is available in:
[`supabase/schema.sql`](file:///c:/Users/ictpr/Desktop/gps/supabase/schema.sql)

### How to Apply / Verify in Supabase Dashboard

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project (**live-gps-tracking**).
3. Navigate to **SQL Editor** from the left navigation panel.
4. Click **New Query**.
5. Copy and paste the contents of `supabase/schema.sql` into the editor.
6. Click **Run**.
7. Go to **Database -> Replication** and verify that `location_history` (and optionally `trips`) has Realtime enabled (Source = Enabled).
