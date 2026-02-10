-- Create access_logs table
-- Corrected: reservation_id is BIGINT to match public.reservas(id)
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_time TIMESTAMPTZ NOT NULL,
    access_name TEXT NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id),
    content TEXT,
    status TEXT NOT NULL, -- 'valid', 'no_reservation', 'unmatched'
    reservation_id BIGINT REFERENCES public.reservas(id),
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate records based on time and name
    CONSTRAINT access_logs_time_name_key UNIQUE (access_time, access_name)
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin has full access
CREATE POLICY "Admins have full access to access_logs"
ON public.access_logs
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE role = 'admin'
  )
);

-- Policy: Users can view their own logs
CREATE POLICY "Users can view their own access logs"
ON public.access_logs
FOR SELECT
USING (
  auth.uid() = user_id
);
