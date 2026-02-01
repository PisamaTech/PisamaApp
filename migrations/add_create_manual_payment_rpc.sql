-- Función RPC para crear pagos manuales (solo para administradores)
-- Esta función permite a los administradores insertar pagos manualmente,
-- evitando los problemas de RLS en la tabla pagos.

create or replace function public.create_manual_payment(
  p_usuario_id uuid,
  p_monto numeric,
  p_tipo text,
  p_fecha_pago timestamptz default now(),
  p_nota text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_payment_id uuid;
  v_caller_role text;
begin
  -- Verificar que el usuario que llama es admin
  select role into v_caller_role
  from public.user_profiles
  where id = auth.uid();

  if v_caller_role is null or v_caller_role != 'admin' then
    raise exception 'No tienes permisos para crear pagos manuales';
  end if;

  -- Validar que el usuario destino existe
  if not exists (select 1 from public.user_profiles where id = p_usuario_id) then
    raise exception 'El usuario especificado no existe';
  end if;

  -- Validar el tipo de pago
  if p_tipo not in ('transferencia', 'efectivo', 'descuento_especial', 'ajuste_saldo') then
    raise exception 'Tipo de pago inválido';
  end if;

  -- Validar que el monto sea positivo
  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  -- Insertar el pago
  insert into public.pagos (
    usuario_id,
    monto,
    tipo,
    fecha_pago,
    estado,
    nota
  )
  values (
    p_usuario_id,
    p_monto,
    p_tipo,
    p_fecha_pago,
    'procesado',
    p_nota
  )
  returning id into v_payment_id;

  -- El trigger trigger_conciliar_pagos_insert se ejecutará automáticamente
  -- para conciliar el pago con facturas pendientes

  return v_payment_id;
end;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
grant execute on function public.create_manual_payment to authenticated;

-- Comentario para documentación
comment on function public.create_manual_payment is
'Permite a los administradores crear pagos manuales. Valida permisos de admin y ejecuta con privilegios elevados para evitar RLS.';
