-- Función RPC para obtener el resumen de saldos de todos los usuarios
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION get_all_users_balance(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  total_pagos NUMERIC,
  total_facturado NUMERIC,
  saldo_disponible NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id AS user_id,
    up."firstName" AS first_name,
    up."lastName" AS last_name,
    up.email,
    COALESCE(pagos.total, 0) AS total_pagos,
    COALESCE(facturas.total, 0) AS total_facturado,
    COALESCE(pagos.total, 0) - COALESCE(facturas.total, 0) AS saldo_disponible
  FROM user_profiles up
  LEFT JOIN (
    SELECT usuario_id, SUM(monto) AS total
    FROM pagos WHERE estado = 'procesado'
    GROUP BY usuario_id
  ) pagos ON pagos.usuario_id = up.id
  LEFT JOIN (
    SELECT usuario_id, SUM(monto_total) AS total
    FROM facturas
    GROUP BY usuario_id
  ) facturas ON facturas.usuario_id = up.id
  WHERE (p_user_id IS NULL OR up.id = p_user_id)
  ORDER BY up."lastName", up."firstName";
END;
$$;
