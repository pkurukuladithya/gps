-- KARP v1.0: Database Migration for Standby Telemetry & Dual-Rate Tracking

-- 1. Allow nullable trip_id in location_history for standby (3-second) telemetry
ALTER TABLE public.location_history 
  ALTER COLUMN trip_id DROP NOT NULL;

-- 2. Create index on location_history for trip_id (allowing fast null checks)
CREATE INDEX IF NOT EXISTS idx_location_history_trip_id_null ON public.location_history(trip_id) WHERE trip_id IS NULL;

-- 3. Update RLS Insert Policy for location_history to permit standby tracking when trip_id is null
DROP POLICY IF EXISTS "Users can insert their own locations" ON public.location_history;

CREATE POLICY "Users can insert their own locations"
ON public.location_history FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND (
        trip_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = location_history.trip_id
            AND trips.user_id = auth.uid()
        )
    )
);

-- 4. Ensure replica identity is FULL on both tables for realtime payload diffs
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.location_history REPLICA IDENTITY FULL;

-- 5. Ensure both tables are included in supabase_realtime publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.location_history;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
