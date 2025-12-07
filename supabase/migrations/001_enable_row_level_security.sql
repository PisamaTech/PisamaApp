-- ============================================================================
-- MIGRACIÓN: Implementación de Row Level Security (RLS)
-- Descripción: Políticas de seguridad a nivel de fila para todas las tablas
-- Fecha: 2025-12-07
-- ============================================================================

-- ============================================================================
-- TABLA: user_profiles
-- Descripción: Perfiles de usuario vinculados a auth.users
-- ============================================================================

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar solo su propio perfil
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Los administradores pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Los administradores pueden actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Sistema puede insertar nuevos perfiles (durante registro)
CREATE POLICY "System can insert new profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ============================================================================
-- TABLA: reservas
-- Descripción: Reservas de consultorios por usuarios
-- ============================================================================

-- Habilitar RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo sus propias reservas
CREATE POLICY "Users can view own reservations"
  ON reservas
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política: Los usuarios pueden crear sus propias reservas
CREATE POLICY "Users can create own reservations"
  ON reservas
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Los usuarios pueden actualizar solo sus propias reservas
CREATE POLICY "Users can update own reservations"
  ON reservas
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Los usuarios pueden eliminar solo sus propias reservas
CREATE POLICY "Users can delete own reservations"
  ON reservas
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- Política: Los administradores pueden ver todas las reservas
CREATE POLICY "Admins can view all reservations"
  ON reservas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Los administradores pueden actualizar cualquier reserva
CREATE POLICY "Admins can update all reservations"
  ON reservas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Los administradores pueden eliminar cualquier reserva
CREATE POLICY "Admins can delete all reservations"
  ON reservas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- TABLA: facturas
-- Descripción: Facturas generadas para los usuarios
-- ============================================================================

-- Habilitar RLS
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo sus propias facturas
CREATE POLICY "Users can view own invoices"
  ON facturas
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política: Los administradores pueden ver todas las facturas
CREATE POLICY "Admins can view all invoices"
  ON facturas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden crear facturas
CREATE POLICY "Admins can create invoices"
  ON facturas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden actualizar facturas
CREATE POLICY "Admins can update invoices"
  ON facturas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden eliminar facturas
CREATE POLICY "Admins can delete invoices"
  ON facturas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- TABLA: detalles_factura
-- Descripción: Detalles/líneas de cada factura
-- ============================================================================

-- Habilitar RLS
ALTER TABLE detalles_factura ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver detalles de sus propias facturas
CREATE POLICY "Users can view own invoice details"
  ON detalles_factura
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM facturas
      WHERE facturas.id = detalles_factura.factura_id
      AND facturas.usuario_id = auth.uid()
    )
  );

-- Política: Los administradores pueden ver todos los detalles
CREATE POLICY "Admins can view all invoice details"
  ON detalles_factura
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden crear detalles de factura
CREATE POLICY "Admins can create invoice details"
  ON detalles_factura
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden actualizar detalles
CREATE POLICY "Admins can update invoice details"
  ON detalles_factura
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden eliminar detalles
CREATE POLICY "Admins can delete invoice details"
  ON detalles_factura
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- TABLA: notificaciones (cola_envios)
-- Descripción: Cola de notificaciones para usuarios
-- ============================================================================

-- Habilitar RLS
ALTER TABLE cola_envios ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON cola_envios
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política: Los usuarios pueden actualizar el estado de sus notificaciones
CREATE POLICY "Users can update own notifications"
  ON cola_envios
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política: El sistema puede crear notificaciones para cualquier usuario
-- (Esto permite que triggers o funciones del servidor creen notificaciones)
CREATE POLICY "System can create notifications"
  ON cola_envios
  FOR INSERT
  WITH CHECK (true);

-- Política: Los administradores pueden ver todas las notificaciones
CREATE POLICY "Admins can view all notifications"
  ON cola_envios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Los administradores pueden administrar notificaciones
CREATE POLICY "Admins can manage notifications"
  ON cola_envios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- TABLA: preferencias_notificaciones
-- Descripción: Preferencias de notificación de cada usuario
-- ============================================================================

-- Habilitar RLS
ALTER TABLE preferencias_notificaciones ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver solo sus propias preferencias
CREATE POLICY "Users can view own notification preferences"
  ON preferencias_notificaciones
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política: Los usuarios pueden actualizar solo sus propias preferencias
CREATE POLICY "Users can update own notification preferences"
  ON preferencias_notificaciones
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Los usuarios pueden crear sus propias preferencias
CREATE POLICY "Users can create own notification preferences"
  ON preferencias_notificaciones
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política: Los administradores pueden ver todas las preferencias
CREATE POLICY "Admins can view all notification preferences"
  ON preferencias_notificaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- TABLA: consultorios
-- Descripción: Catálogo de consultorios disponibles
-- ============================================================================

-- Habilitar RLS
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden ver consultorios
CREATE POLICY "Authenticated users can view consultorios"
  ON consultorios
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Solo administradores pueden crear consultorios
CREATE POLICY "Admins can create consultorios"
  ON consultorios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden actualizar consultorios
CREATE POLICY "Admins can update consultorios"
  ON consultorios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Política: Solo administradores pueden eliminar consultorios
CREATE POLICY "Admins can delete consultorios"
  ON consultorios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );


-- ============================================================================
-- VISTAS: facturas_con_detalles_usuario y reservas_completas
-- Descripción: Las vistas heredan las políticas de las tablas base,
--              pero podemos agregar políticas específicas si es necesario
-- ============================================================================

-- Nota: Las vistas en Supabase generalmente heredan las políticas RLS
-- de las tablas subyacentes. Si necesitas políticas específicas para vistas,
-- puedes agregarlas aquí.


-- ============================================================================
-- GRANTS: Permisos de ejecución para funciones RPC
-- Descripción: Asegurar que las funciones RPC respeten RLS
-- ============================================================================

-- Las funciones RPC en Supabase deben tener SECURITY DEFINER o SECURITY INVOKER
-- SECURITY INVOKER: La función se ejecuta con los permisos del usuario que la llama (respeta RLS)
-- SECURITY DEFINER: La función se ejecuta con los permisos del propietario (puede bypassear RLS)

-- Ejemplo para funciones existentes (ajusta según tus funciones RPC):
-- ALTER FUNCTION nombre_funcion() SECURITY INVOKER;


-- ============================================================================
-- COMENTARIOS Y NOTAS
-- ============================================================================

-- IMPORTANTE:
-- 1. Antes de aplicar esta migración en producción, haz un backup completo
-- 2. Prueba en un ambiente de desarrollo primero
-- 3. Verifica que todas las consultas existentes sigan funcionando
-- 4. Considera agregar índices en columnas usadas frecuentemente en políticas
--    (especialmente user_profiles.role y campos de usuario_id)

-- Índices recomendados para optimizar políticas RLS:
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_id ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_id ON facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cola_envios_usuario_id ON cola_envios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_preferencias_notificaciones_usuario_id ON preferencias_notificaciones(usuario_id);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
