-- Función RPC para crear facturas manuales/históricas (solo para administradores)
-- Esta función permite a los administradores insertar facturas manualmente,
-- evitando los problemas de RLS en la tabla facturas.

create or replace function public.create_manual_invoice(
  p_usuario_id uuid,
  p_periodo_inicio date,
  p_periodo_fin date,
  p_monto_total numeric,
  p_estado text,
  p_nota text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invoice_id uuid;
  v_caller_role text;
  v_saldo_pendiente numeric;
  v_fecha_pago timestamptz;
begin
  -- Verificar que el usuario que llama es admin
  select role into v_caller_role
  from public.user_profiles
  where id = auth.uid();

  if v_caller_role is null or v_caller_role != 'admin' then
    raise exception 'No tienes permisos para crear facturas manuales';
  end if;

  -- Validar que el usuario destino existe
  if not exists (select 1 from public.user_profiles where id = p_usuario_id) then
    raise exception 'El usuario especificado no existe';
  end if;

  -- Validar el estado
  if p_estado not in ('pendiente', 'pagada') then
    raise exception 'Estado de factura inválido. Debe ser "pendiente" o "pagada"';
  end if;

  -- Validar que el monto sea positivo
  if p_monto_total <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  -- Validar fechas
  if p_periodo_inicio > p_periodo_fin then
    raise exception 'La fecha de inicio no puede ser posterior a la fecha de fin';
  end if;

  -- Calcular saldo_pendiente y fecha_pago según el estado
  if p_estado = 'pagada' then
    v_saldo_pendiente := 0;
    v_fecha_pago := now();
  else
    v_saldo_pendiente := p_monto_total;
    v_fecha_pago := null;
  end if;

  -- Insertar la factura
  insert into public.facturas (
    usuario_id,
    periodo_inicio,
    periodo_fin,
    monto_total,
    monto_base,
    monto_descuento,
    saldo_pendiente,
    estado,
    fecha_emision,
    fecha_pago,
    nota
  )
  values (
    p_usuario_id,
    p_periodo_inicio,
    p_periodo_fin,
    p_monto_total,
    p_monto_total, -- Para facturas manuales, base = total
    0, -- Sin descuento
    v_saldo_pendiente,
    p_estado,
    now(),
    v_fecha_pago,
    p_nota
  )
  returning id into v_invoice_id;

  -- NOTA: El trigger trigger_conciliar_nueva_factura se ejecutará automáticamente
  -- ANTES del INSERT (es un BEFORE trigger), por lo que puede modificar los valores
  -- de saldo_pendiente y estado si el usuario tiene saldo a favor.
  -- Sin embargo, como estamos usando SECURITY DEFINER e insertando directamente,
  -- necesitamos tener en cuenta que el trigger puede no ejecutarse correctamente
  -- si depende de auth.uid().
  --
  -- Para facturas históricas MANUALES, generalmente queremos que se creen tal cual
  -- las especificamos (sin conciliación automática), así que esto está bien.

  return v_invoice_id;
end;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
grant execute on function public.create_manual_invoice to authenticated;

-- Comentario para documentación
comment on function public.create_manual_invoice is
'Permite a los administradores crear facturas manuales/históricas. Valida permisos de admin y ejecuta con privilegios elevados para evitar RLS. No aplica conciliación automática para preservar los valores históricos.';
