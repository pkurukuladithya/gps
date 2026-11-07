-- STELLA: Smart Tracking, Exploration & Location Live Analytics
-- Supabase PostgreSQL Schema & Security Policies

-- 1. Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'interrupted')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create location_history table
CREATE TABLE IF NOT EXISTS public.location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_location_history_trip_id ON public.location_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON public.location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON public.location_history(recorded_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for trips
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trips' AND policyname = 'Users can view their own trips') THEN
        CREATE POLICY "Users can view their own trips"
        ON public.trips FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trips' AND policyname = 'Users can insert their own trips') THEN
        CREATE POLICY "Users can insert their own trips"
        ON public.trips FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trips' AND policyname = 'Users can update their own trips') THEN
        CREATE POLICY "Users can update their own trips"
        ON public.trips FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trips' AND policyname = 'Users can delete their own trips') THEN
        CREATE POLICY "Users can delete their own trips"
        ON public.trips FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. RLS Policies for location_history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can view their own locations') THEN
        CREATE POLICY "Users can view their own locations"
        ON public.location_history FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can insert their own locations') THEN
        CREATE POLICY "Users can insert their own locations"
        ON public.location_history FOR INSERT
        WITH CHECK (
            auth.uid() = user_id AND
            EXISTS (
                SELECT 1 FROM public.trips
                WHERE trips.id = location_history.trip_id
                AND trips.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can delete their own locations') THEN
        CREATE POLICY "Users can delete their own locations"
        ON public.location_history FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 7. Realtime Publication Setup
-- Enable replica identity full for precise realtime payloads
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.location_history REPLICA IDENTITY FULL;

-- Ensure tables are added to the supabase_realtime publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.location_history;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;
