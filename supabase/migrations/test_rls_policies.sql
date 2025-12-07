-- ============================================================================
-- TESTS DE VERIFICACIÓN DE POLÍTICAS RLS
-- Descripción: Script para verificar que las políticas RLS funcionan correctamente
-- Uso: Ejecutar en SQL Editor de Supabase para validar las políticas
-- ============================================================================

-- ============================================================================
-- PARTE 1: VERIFICAR QUE RLS ESTÁ HABILITADO
-- ============================================================================

SELECT
  tablename,
  rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles',
  'reservas',
  'facturas',
  'detalles_factura',
  'cola_envios',
  'preferencias_notificaciones',
  'consultorios'
)
ORDER BY tablename;

-- Resultado esperado: Todas las tablas deben tener rowsecurity = true


-- ============================================================================
-- PARTE 2: LISTAR TODAS LAS POLÍTICAS CREADAS
-- ============================================================================

SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  policyname AS "Policy Name",
  cmd AS "Command",
  qual AS "USING Expression",
  with_check AS "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Resultado esperado: Debe haber múltiples políticas por tabla


-- ============================================================================
-- PARTE 3: CONTAR POLÍTICAS POR TABLA
-- ============================================================================

SELECT
  tablename AS "Table",
  COUNT(*) AS "Number of Policies"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Resultado esperado (mínimo):
-- user_profiles: 5 políticas
-- reservas: 7 políticas
-- facturas: 5 políticas
-- detalles_factura: 5 políticas
-- cola_envios: 4 políticas
-- preferencias_notificaciones: 4 políticas
-- consultorios: 4 políticas


-- ============================================================================
-- PARTE 4: VERIFICAR ÍNDICES PARA OPTIMIZACIÓN RLS
-- ============================================================================

SELECT
  tablename AS "Table",
  indexname AS "Index Name",
  indexdef AS "Index Definition"
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_%_usuario_id'
  OR indexname LIKE 'idx_%_role'
)
ORDER BY tablename, indexname;

-- Resultado esperado: Índices en:
-- - user_profiles.role
-- - reservas.usuario_id
-- - facturas.usuario_id
-- - cola_envios.usuario_id
-- - preferencias_notificaciones.usuario_id


-- ============================================================================
-- PARTE 5: POLÍTICAS ESPECÍFICAS POR TABLA
-- ============================================================================

-- Políticas de user_profiles
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: Yes'
    ELSE 'USING: No'
  END AS has_using,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: Yes'
    ELSE 'WITH CHECK: No'
  END AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles'
ORDER BY policyname;


-- Políticas de reservas
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: Yes'
    ELSE 'USING: No'
  END AS has_using,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: Yes'
    ELSE 'WITH CHECK: No'
  END AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'reservas'
ORDER BY policyname;


-- Políticas de facturas
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: Yes'
    ELSE 'USING: No'
  END AS has_using,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: Yes'
    ELSE 'WITH CHECK: No'
  END AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'facturas'
ORDER BY policyname;


-- ============================================================================
-- PARTE 6: TEST DE FUNCIONALIDAD (SIMULACIÓN)
-- ============================================================================

-- NOTA: Estos queries son de ejemplo y deben ejecutarse con diferentes usuarios
-- para verificar que RLS funciona correctamente.

-- Test 1: Verificar que existe la columna 'role' en user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND column_name = 'role';

-- Test 2: Verificar que existen usuarios con rol 'admin'
-- (Comentado para no exponer datos sensibles)
-- SELECT COUNT(*) AS admin_count
-- FROM user_profiles
-- WHERE role = 'admin';


-- ============================================================================
-- PARTE 7: VERIFICAR FUNCIONES RPC Y SU SECURITY CONTEXT
-- ============================================================================

SELECT
  routine_name AS "Function Name",
  security_type AS "Security Type"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Resultado esperado:
-- SECURITY INVOKER: Funciones que respetan RLS (recomendado)
-- SECURITY DEFINER: Funciones que bypassean RLS (usar con precaución)


-- ============================================================================
-- PARTE 8: VERIFICAR QUE auth.uid() ESTÁ DISPONIBLE
-- ============================================================================

-- Test que auth.uid() funciona (solo para usuarios autenticados)
-- Este query debe ejecutarse desde el frontend con un usuario logueado
-- SELECT auth.uid() AS current_user_id;


-- ============================================================================
-- PARTE 9: ANÁLISIS DE PERMISOS DE ROLES
-- ============================================================================

-- Verificar permisos de la tabla
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN (
  'user_profiles',
  'reservas',
  'facturas',
  'detalles_factura',
  'cola_envios',
  'preferencias_notificaciones',
  'consultorios'
)
ORDER BY table_name, grantee, privilege_type;


-- ============================================================================
-- PARTE 10: CHECKLIST DE VALIDACIÓN
-- ============================================================================

-- Este query genera un reporte de checklist
SELECT
  t.tablename AS "Table",
  CASE WHEN t.rowsecurity THEN '✓' ELSE '✗' END AS "RLS Enabled",
  COALESCE(p.policy_count, 0) AS "Policies Count",
  CASE WHEN COALESCE(p.policy_count, 0) >= 2 THEN '✓' ELSE '⚠' END AS "Has Policies",
  COALESCE(i.index_count, 0) AS "Indexes on FK"
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
LEFT JOIN (
  SELECT tablename, COUNT(*) AS index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND (indexname LIKE '%usuario_id%' OR indexname LIKE '%role%')
  GROUP BY tablename
) i ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
  'user_profiles',
  'reservas',
  'facturas',
  'detalles_factura',
  'cola_envios',
  'preferencias_notificaciones',
  'consultorios'
)
ORDER BY t.tablename;

-- Resultado esperado:
-- Todas las tablas deben tener:
-- - RLS Enabled: ✓
-- - Has Policies: ✓
-- - Al menos 1 index en FK (para tablas con usuario_id)


-- ============================================================================
-- NOTAS FINALES
-- ============================================================================

/*
CÓMO USAR ESTE SCRIPT:

1. Copia y pega cada sección en el SQL Editor de Supabase
2. Ejecuta sección por sección para verificar cada aspecto
3. Verifica que los resultados coincidan con lo esperado
4. Si algo falla, revisa la migración 001_enable_row_level_security.sql

TESTS ADICIONALES RECOMENDADOS:

1. Test desde el frontend con usuario normal
2. Test desde el frontend con usuario admin
3. Intentar acceder a datos de otros usuarios (debe fallar)
4. Intentar crear/modificar datos de otros usuarios (debe fallar)
5. Verificar performance de queries con EXPLAIN ANALYZE

EJEMPLO DE TEST MANUAL:

-- Como usuario normal (ejecutar en frontend):
const { data } = await supabase.from('reservas').select('*');
// Debe devolver solo las reservas del usuario autenticado

-- Como admin (ejecutar en frontend):
const { data } = await supabase.from('reservas').select('*');
// Debe devolver TODAS las reservas

*/
