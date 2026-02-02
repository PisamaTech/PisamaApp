-- Corrección de la función get_daily_booking_stats para manejar zona horaria correctamente
-- Problema: Las reservas del día actual después de las 21hs (hora local) no se contaban
-- porque se agrupaban por fecha UTC en lugar de fecha local Argentina

CREATE OR REPLACE FUNCTION get_daily_booking_stats(
    start_date timestamp with time zone,
    end_date timestamp with time zone
)
RETURNS TABLE (
    dia text,
    horas_reservadas bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Convertimos a zona horaria de Argentina antes de formatear la fecha
        TO_CHAR(start_time AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS dia,
        COUNT(*) AS horas_reservadas
    FROM public.reservas
    WHERE start_time BETWEEN start_date AND end_date
      AND estado IN ('activa', 'utilizada', 'penalizada')
    GROUP BY dia
    ORDER BY dia ASC;
END;
$$ LANGUAGE plpgsql;
