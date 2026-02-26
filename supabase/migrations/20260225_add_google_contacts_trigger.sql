-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS "net";

-- Function to call the Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_user_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the Edge Function "add-google-contact"
  -- Replace [SERVICE_ROLE_KEY] with your actual service role key (found in Supabase Dashboard -> Settings -> API)
  PERFORM
    net.http_post(
      url := 'https://tgetexpttsvcgsheaybu.supabase.co/functions/v1/add-google-contact',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXRleHB0dHN2Y2dzaGVheWJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODc5OTg5MSwiZXhwIjoyMDU0Mzc1ODkxfQ.HybjGQjAJNYzrecSBpfe81MOK5K9auQCa4WxoyMP11c'
      ),
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'firstName', NEW.raw_user_meta_data->>'firstName',
          'lastName', NEW.raw_user_meta_data->>'lastName',
          'email', NEW.email,
          'phone', NEW.raw_user_meta_data->>'phone',
          'profession', NEW.raw_user_meta_data->>'profession'
        )
      )
    );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_google_contact ON auth.users;
CREATE TRIGGER on_auth_user_created_google_contact
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_contact();
