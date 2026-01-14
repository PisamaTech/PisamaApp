-- 1. Crear tipo de dato ENUM para el estado y tipo de pago (Opcional, o usar CHECK constraints)
-- Usaremos TEXT con CHECK para simplificar si no queremos tipos custom.

-- 2. Crear tabla de PAGOS
create table if not exists public.pagos (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references public.user_profiles(id) on delete set null,
  monto numeric not null check (monto > 0),
  tipo text not null check (tipo in ('transferencia', 'efectivo', 'descuento_especial', 'ajuste_saldo')),
  fecha_pago timestamptz default now(),
  origen_id text unique, -- ID de la transacción externa (para evitar duplicados)
  estado text default 'procesado' check (estado in ('procesado', 'pendiente', 'error')),
  nota text,
  created_at timestamptz default now()
);

-- 3. Modificar tabla de FACTURAS para ver saldo pendiente
-- Si saldo_pendiente es NULL, asumimos que es igual al monto_total (para facturas viejas)
alter table public.facturas 
add column if not exists saldo_pendiente numeric default 0;

-- Actualizar facturas existentes: 
-- Si está pagada -> saldo_pendiente = 0
-- Si está pendiente -> saldo_pendiente = monto_total
update public.facturas 
set saldo_pendiente = 0 
where estado = 'pagada';

update public.facturas 
set saldo_pendiente = monto_total 
where estado = 'pendiente';

-- 4. Función de Conciliación Automática (FIFO)
create or replace function public.conciliar_pagos()
returns trigger
language plpgsql
security definer
as $$
declare
  v_saldo_disponible numeric;
  r_factura record;
  v_monto_a_pagar numeric;
begin
  -- Solo nos interesa si el pago entra como 'procesado' (o si pasa a procesado)
  if new.estado = 'procesado' then
    v_saldo_disponible := new.monto;

    -- Iterar sobre facturas pendientes del usuario, ordenadas por fecha (más antigua primero)
    for r_factura in 
      select * from public.facturas 
      where usuario_id = new.usuario_id 
        and estado = 'pendiente'
        and saldo_pendiente > 0
      order by fecha_emision asc
    loop
      -- Si ya no hay saldo, salir
      if v_saldo_disponible <= 0 then
        exit;
      end if;

      -- Determinar cuánto pagamos de esta factura
      if v_saldo_disponible >= r_factura.saldo_pendiente then
        v_monto_a_pagar := r_factura.saldo_pendiente;
      else
        v_monto_a_pagar := v_saldo_disponible;
      end if;

      -- Actualizar factura
      update public.facturas
      set 
        saldo_pendiente = saldo_pendiente - v_monto_a_pagar,
        estado = case when (saldo_pendiente - v_monto_a_pagar) <= 0 then 'pagada' else 'pendiente' end,
        fecha_pago = case when (saldo_pendiente - v_monto_a_pagar) <= 0 then now() else null end
      where id = r_factura.id;

      -- Restar del saldo disponible
      v_saldo_disponible := v_saldo_disponible - v_monto_a_pagar;

    end loop;
    
    -- El saldo restante (si v_saldo_disponible > 0) queda "a favor" implícitamente 
    -- en la suma de pagos vs facturas, no necesitamos guardarlo en una columna,
    -- pero para conciliar facturas FUTURAS, necesitaremos un trigger en INSERT FACTURA también.
  end if;

  return new;
end;
$$;

-- 5. Trigger al insertar PAGO
create or replace trigger trigger_conciliar_pagos_insert
after insert on public.pagos
for each row
execute function public.conciliar_pagos();

-- 6. Función inversa: Conciliar al insertar FACTURA (o actualizarla)
-- Si el usuario tiene saldo a favor acumulado, la nueva factura debe nacer pagada o descontada.
create or replace function public.conciliar_nueva_factura()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_pagos numeric;
  v_total_facturado numeric;
  v_saldo_a_favor numeric;
  v_monto_a_cubrir numeric;
begin
  -- Solo aplica si la factura nace pendiente
  if new.estado = 'pendiente' then
    -- Calcular saldo a favor global del usuario
    -- Saldo = (Total Pagos Procesados) - (Total Facturas Pagadas + Total Facturas Pendientes (excluyendo la actual si ya se insertó))
    
    -- Mejor enfoque: Calcular pagos totales - lo que ya se usó para cubrir facturas anteriores.
    -- Pero dado que actualizamos 'saldo_pendiente' en las facturas, podemos confiar en eso.
    -- Saldo A Favor Real = (Sum Pagos) - (Sum (MontoTotal - SaldoPendiente) de todas las facturas)
    
    select coalesce(sum(monto), 0) into v_total_pagos
    from public.pagos
    where usuario_id = new.usuario_id and estado = 'procesado';

    select coalesce(sum(monto_total - saldo_pendiente), 0) into v_total_facturado
    from public.facturas
    where usuario_id = new.usuario_id; 
    -- Nota: Al insertar, la nueva factura aún no está "cubierta", su saldo_pendiente será igual al monto total inicialmente
    -- y no contribuirá a v_total_facturado "cubierto" si lo manejamos bien. 
    -- Pero cuidado, este trigger es BEFORE o AFTER? 
    -- Si es BEFORE, new.saldo_pendiente será null o lo que venga. Lo seteamos.
    
    -- Vamos a hacerlo mas simple:
    -- Saldo Disponible = v_total_pagos - v_total_facturado
    -- Pagar la nueva factura con ese saldo.
    
    v_saldo_a_favor := v_total_pagos - v_total_facturado;
    
    if v_saldo_a_favor > 0 then
      if v_saldo_a_favor >= new.monto_total then
        new.saldo_pendiente := 0;
        new.estado := 'pagada';
        new.fecha_pago := now();
      else
        new.saldo_pendiente := new.monto_total - v_saldo_a_favor;
        -- Queda pendiente con saldo reducido
      end if;
    else
        new.saldo_pendiente := new.monto_total;
    end if;
  end if;

  return new;
end;
$$;

-- 7. Trigger al insertar FACTURA
-- Debe ser BEFORE INSERT para modificar los campos de la propia factura antes de guardar
create or replace trigger trigger_conciliar_nueva_factura
before insert on public.facturas
for each row
execute function public.conciliar_nueva_factura();

-- 8. Seguridad (RLS)
alter table public.pagos enable row level security;

-- Usuario ve sus propios pagos
create policy "Usuarios ven sus propios pagos"
on public.pagos for select
using (auth.uid() = usuario_id);

-- Admin ve todo (asumiendo que admin usa roles de supabase o service role,
-- pero si usas una columna 'role' en user_profiles, ajusta esto)
-- Por ahora dejamos que el usuario vea lo suyo. El backend (edge function) usará service_role.

-- 9. Vista para Admin: Pagos con detalles de usuario
create or replace view public.pagos_con_detalles_usuario as
select
  p.id,
  p.usuario_id,
  p.monto,
  p.tipo,
  p.fecha_pago,
  p.origen_id,
  p.estado,
  p.nota,
  p.created_at,
  u.firstName,
  u.lastName,
  u.email
from public.pagos p
left join public.user_profiles u on p.usuario_id = u.id;

-- 10. RPC para obtener balance de usuario
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
begin
  return query
  select
    coalesce(sum(pg.monto), 0) - coalesce(sum(f.monto_total - f.saldo_pendiente), 0) as saldo_disponible,
    coalesce(sum(pg.monto), 0) as total_pagos,
    coalesce(sum(f.monto_total - f.saldo_pendiente), 0) as total_facturado,
    coalesce(sum(f.saldo_pendiente), 0) as saldo_facturas_pendientes
  from (select p_user_id as uid) u
  left join public.pagos pg on pg.usuario_id = u.uid and pg.estado = 'procesado'
  left join public.facturas f on f.usuario_id = u.uid;
end;
$$;

-- 11. Agregar columna nota a facturas (para facturas manuales históricas)
alter table public.facturas
add column if not exists nota text;

