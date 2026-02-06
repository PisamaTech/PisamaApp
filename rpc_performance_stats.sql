-- Función para obtener estadísticas mensuales de horas (Activas, Utilizadas, Penalizadas, Canceladas)
CREATE OR REPLACE FUNCTION get_monthly_hours_stats(year_input int)
RETURNS TABLE (
  mes int,
  horas_activas numeric,
  horas_utilizadas numeric,
  horas_penalizadas numeric,
  horas_canceladas numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM start_time)::int AS mes,
    -- Horas Activas: reservas activas (pendientes de uso)
    COALESCE(COUNT(*) FILTER (WHERE estado = 'activa'), 0)::numeric AS horas_activas,
    -- Horas Utilizadas: reservas utilizadas
    COALESCE(COUNT(*) FILTER (WHERE estado = 'utilizada'), 0)::numeric AS horas_utilizadas,
    -- Horas Penalizadas: reservas con estado 'penalizada'
    COALESCE(COUNT(*) FILTER (WHERE estado = 'penalizada'), 0)::numeric AS horas_penalizadas,
    -- Horas Canceladas: reservas canceladas
    COALESCE(COUNT(*) FILTER (WHERE estado = 'cancelada'), 0)::numeric AS horas_canceladas
  FROM reservas
  WHERE EXTRACT(YEAR FROM start_time) = year_input
  GROUP BY mes
  ORDER BY mes;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de tipos de reserva y reagendamientos
CREATE OR REPLACE FUNCTION get_reservation_type_stats(year_input int)
RETURNS TABLE (
  mes int,
  total_eventual bigint,
  total_fija bigint,
  total_reagendadas bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(MONTH FROM start_time)::int AS mes,
    COUNT(*) FILTER (WHERE tipo_reserva = 'eventual') AS total_eventual,
    COUNT(*) FILTER (WHERE tipo_reserva = 'fija') AS total_fija,
    COUNT(*) FILTER (WHERE fue_reagendada = true) AS total_reagendadas
  FROM reservas
  WHERE EXTRACT(YEAR FROM start_time) = year_input
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener datos del mapa de calor
CREATE OR REPLACE FUNCTION get_heatmap_data(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE (
  dia_semana int,
  hora int,
  cantidad bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM start_time)::int AS dia_semana,
    EXTRACT(HOUR FROM start_time)::int AS hora,
    COUNT(*) AS cantidad
  FROM reservas
  WHERE start_time >= start_date AND start_time <= end_date
  AND estado != 'cancelada'
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$ LANGUAGE plpgsql;

-- [FIXED] Función para obtener Top Usuarios (VIP) - V2
-- Corregido el problema del producto cartesiano y simplificado el JOIN
CREATE OR REPLACE FUNCTION get_top_users_v2(p_limit int)
RETURNS TABLE (
  usuario_id uuid,
  nombre_completo text,
  email text,
  total_gastado numeric,
  total_reservas bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH user_spending AS (
    SELECT usuario_id, SUM(monto_total) as total_gastado
    FROM facturas
    WHERE estado = 'pagada'
    GROUP BY usuario_id
  ),
  user_reservations AS (
    SELECT usuario_id, COUNT(*) as total_reservas
    FROM reservas
    GROUP BY usuario_id
  )
  SELECT
    p.id AS usuario_id,
    (p.firstname || ' ' || p.lastname) AS nombre_completo,
    p.email,
    COALESCE(s.total_gastado, 0) AS total_gastado,
    COALESCE(r.total_reservas, 0) AS total_reservas
  FROM user_profiles p
  LEFT JOIN user_spending s ON s.usuario_id = p.id
  LEFT JOIN user_reservations r ON r.usuario_id = p.id
  WHERE COALESCE(s.total_gastado, 0) > 0 OR COALESCE(r.total_reservas, 0) > 0
  ORDER BY total_gastado DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener KPIs Generales
CREATE OR REPLACE FUNCTION get_kpi_stats(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS json AS $$
DECLARE
  ticket_promedio numeric;
  tasa_cancelacion numeric;
  tasa_reagendamiento numeric;
  total_reservas bigint;
  reservas_canceladas bigint;
  reservas_reagendadas bigint;
  ingresos_totales numeric;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'cancelada'),
    COUNT(*) FILTER (WHERE fue_reagendada = true)
  INTO
    total_reservas,
    reservas_canceladas,
    reservas_reagendadas
  FROM reservas
  WHERE start_time >= start_date AND start_time <= end_date;

  SELECT COALESCE(SUM(monto_total), 0)
  INTO ingresos_totales
  FROM facturas
  WHERE fecha_emision >= start_date AND fecha_emision <= end_date AND estado = 'pagada';

  IF total_reservas > 0 THEN
    tasa_cancelacion := ROUND((reservas_canceladas::numeric / total_reservas::numeric) * 100, 2);
    tasa_reagendamiento := ROUND((reservas_reagendadas::numeric / total_reservas::numeric) * 100, 2);
    ticket_promedio := ROUND(ingresos_totales / total_reservas::numeric, 2);
  ELSE
    tasa_cancelacion := 0;
    tasa_reagendamiento := 0;
    ticket_promedio := 0;
  END IF;

  RETURN json_build_object(
    'ticket_promedio', ticket_promedio,
    'tasa_cancelacion', tasa_cancelacion,
    'tasa_reagendamiento', tasa_reagendamiento,
    'total_reservas', total_reservas,
    'ingresos_totales', ingresos_totales
  );
END;
$$ LANGUAGE plpgsql;
