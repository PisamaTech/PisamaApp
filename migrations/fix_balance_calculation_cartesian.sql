-- Fix: Corrección del producto cartesiano en get_user_balance
-- El problema: los LEFT JOINs múltiples causan que los montos se multipliquen
-- La solución: usar subconsultas separadas para calcular cada total
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

create or replace function public.get_user_balance(p_user_id uuid)
returns table(
  saldo_disponible numeric,
  total_pagos numeric,
  total_facturado numeric,
  saldo_facturas_pendientes numeric
)
language plpgsql
security definer
as $$
declare
  v_total_pagos numeric;
  v_total_facturado numeric;
  v_saldo_facturas_pendientes numeric;
begin
  -- Calcular total de pagos procesados
  select coalesce(sum(monto), 0)
  into v_total_pagos
  from public.pagos
  where usuario_id = p_user_id and estado = 'procesado';

  -- Calcular total facturado
  select coalesce(sum(monto_total), 0)
  into v_total_facturado
  from public.facturas
  where usuario_id = p_user_id;

  -- Calcular saldo pendiente de facturas
  select coalesce(sum(saldo_pendiente), 0)
  into v_saldo_facturas_pendientes
  from public.facturas
  where usuario_id = p_user_id;

  -- Retornar los valores calculados
  return query
  select
    v_total_pagos - v_total_facturado as saldo_disponible,
    v_total_pagos,
    v_total_facturado,
    v_saldo_facturas_pendientes;
end;
$$;

-- Verificar con tu usuario (reemplaza con tu user_id real)
-- select * from get_user_balance('tu-user-id-aqui');
