-- Query para verificar la estructura de la tabla user_profiles
-- Ejecuta esto en el SQL Editor de Supabase para ver todos los campos de la tabla

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- También muestra los primeros 3 usuarios para verificar los valores
SELECT * FROM public.user_profiles LIMIT 3;

-- Verificar si hay campos numéricos que puedan estar confundiéndose con el id UUID
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND (data_type LIKE '%int%' OR data_type LIKE '%serial%' OR data_type LIKE '%number%')
ORDER BY ordinal_position;
