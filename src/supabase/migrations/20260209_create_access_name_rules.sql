-- Create access_name_rules table for managing access name behavior
-- action: 'ignore' = do not save records, 'track' = save without linking to user_id
CREATE TABLE IF NOT EXISTS public.access_name_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_name TEXT NOT NULL UNIQUE,
    action TEXT NOT NULL CHECK (action IN ('ignore', 'track')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.access_name_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Admin has full access
CREATE POLICY "Admins have full access to access_name_rules"
ON public.access_name_rules
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.user_profiles WHERE role = 'admin'
  )
);

-- Create index for quick lookups by name
CREATE INDEX idx_access_name_rules_name ON public.access_name_rules(access_name);

-- Insert initial rules
INSERT INTO public.access_name_rules (access_name, action, description) VALUES
('Adriana', 'ignore', 'Alquiler fijo - no registrar'),
('Mari', 'track', 'Limpieza - registrar sin vincular');
