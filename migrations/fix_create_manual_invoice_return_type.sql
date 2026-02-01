-- Corrección: Cambiar el tipo de retorno de uuid a bigint
-- El campo 'id' de la tabla facturas es bigint, no uuid

DROP FUNCTION IF EXISTS public.create_manual_invoice;

CREATE OR REPLACE FUNCTION public.create_manual_invoice(
  p_usuario_id uuid,
  p_periodo_inicio date,
  p_periodo_fin date,
  p_monto_total numeric,
  p_estado text,
  p_nota text default null
)
RETURNS bigint  -- ✅ CAMBIADO de uuid a bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id bigint;  -- ✅ CAMBIADO de uuid a bigint
  v_caller_role text;
  v_saldo_pendiente numeric;
  v_fecha_pago timestamptz;
BEGIN
  -- Verificar que el usuario que llama es admin
  SELECT role INTO v_caller_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'No tienes permisos para crear facturas manuales';
  END IF;

  -- Validar que el usuario destino existe
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_usuario_id) THEN
    RAISE EXCEPTION 'El usuario especificado no existe';
  END IF;

  -- Validar el estado
  IF p_estado NOT IN ('pendiente', 'pagada') THEN
    RAISE EXCEPTION 'Estado de factura inválido. Debe ser "pendiente" o "pagada"';
  END IF;

  -- Validar que el monto sea positivo
  IF p_monto_total <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Validar fechas
  IF p_periodo_inicio > p_periodo_fin THEN
    RAISE EXCEPTION 'La fecha de inicio no puede ser posterior a la fecha de fin';
  END IF;

  -- Calcular saldo_pendiente y fecha_pago según el estado
  IF p_estado = 'pagada' THEN
    v_saldo_pendiente := 0;
    v_fecha_pago := now();
  ELSE
    v_saldo_pendiente := p_monto_total;
    v_fecha_pago := NULL;
  END IF;

  -- Insertar la factura
  INSERT INTO public.facturas (
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
  VALUES (
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
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.create_manual_invoice TO authenticated;

-- Comentario
COMMENT ON FUNCTION public.create_manual_invoice IS
'Permite a los administradores crear facturas manuales/históricas. Retorna el ID (bigint) de la factura creada.';
