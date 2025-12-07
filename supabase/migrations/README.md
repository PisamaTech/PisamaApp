# Migraciones de Supabase - Row Level Security (RLS)

## 📋 Índice

- [¿Qué es Row Level Security?](#qué-es-row-level-security)
- [Estructura de Políticas](#estructura-de-políticas)
- [Cómo Aplicar las Migraciones](#cómo-aplicar-las-migraciones)
- [Verificación y Testing](#verificación-y-testing)
- [Troubleshooting](#troubleshooting)

---

## ¿Qué es Row Level Security?

**Row Level Security (RLS)** es una característica de PostgreSQL que permite controlar el acceso a filas individuales de una tabla basándose en el usuario que realiza la consulta.

### Beneficios:

✅ **Seguridad a nivel de datos**: Los usuarios solo pueden acceder a sus propios datos
✅ **Separación de responsabilidades**: No dependes únicamente de la lógica de aplicación
✅ **Prevención de data leaks**: Incluso si hay un bug en el código, RLS protege los datos
✅ **Cumplimiento normativo**: Ayuda con GDPR y otras regulaciones de privacidad

### Sin RLS (INSEGURO ⚠️):
```javascript
// Vulnerable: Un usuario podría modificar userId en el cliente
const { data } = await supabase
  .from('reservas')
  .select('*')
  .eq('usuario_id', userId);  // ❌ No confiable si viene del cliente
```

### Con RLS (SEGURO ✅):
```javascript
// Seguro: RLS garantiza que solo se devuelvan las filas del usuario autenticado
const { data } = await supabase
  .from('reservas')
  .select('*');  // ✅ RLS automáticamente filtra por auth.uid()
```

---

## Estructura de Políticas

### Tablas Protegidas

| Tabla | Usuarios | Administradores |
|-------|----------|-----------------|
| **user_profiles** | Ver/editar su propio perfil | Ver/editar todos los perfiles |
| **reservas** | CRUD de sus propias reservas | CRUD de todas las reservas |
| **facturas** | Ver sus propias facturas | CRUD de todas las facturas |
| **detalles_factura** | Ver detalles de sus facturas | CRUD de todos los detalles |
| **cola_envios** | Ver/actualizar sus notificaciones | Ver/administrar todas |
| **preferencias_notificaciones** | Ver/editar sus preferencias | Ver todas las preferencias |
| **consultorios** | Ver catálogo (solo lectura) | CRUD completo |

### Tipos de Políticas Implementadas

#### 1. **Políticas de Usuario Normal**
- **SELECT**: Solo ver sus propios datos
- **INSERT**: Solo crear datos para sí mismo
- **UPDATE**: Solo actualizar sus propios datos
- **DELETE**: Solo eliminar sus propios datos

#### 2. **Políticas de Administrador**
- **Todas las operaciones**: Acceso completo a todas las tablas
- **Identificación**: `user_profiles.role = 'admin'`

#### 3. **Políticas de Sistema**
- **Notificaciones**: El sistema puede crear notificaciones para cualquier usuario
- **Perfiles**: Permitir inserción durante el registro

---

## Cómo Aplicar las Migraciones

### Opción 1: Supabase Dashboard (Recomendado para desarrollo)

1. **Accede al Supabase Dashboard**
   - Ve a [https://app.supabase.com](https://app.supabase.com)
   - Selecciona tu proyecto PisamaApp

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en **SQL Editor**
   - Crea una nueva query

3. **Copia y ejecuta la migración**
   - Abre el archivo `001_enable_row_level_security.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor
   - Haz clic en **Run** (F5)

4. **Verifica la ejecución**
   - Revisa que no haya errores en la consola
   - Verifica en **Database > Policies** que las políticas se hayan creado

### Opción 2: Supabase CLI (Recomendado para producción)

```bash
# 1. Instala Supabase CLI si no lo tienes
npm install -g supabase

# 2. Inicializa Supabase en tu proyecto (si no está inicializado)
supabase init

# 3. Link a tu proyecto
supabase link --project-ref tu-project-ref

# 4. Copia la migración a la carpeta de Supabase CLI
cp supabase/migrations/001_enable_row_level_security.sql supabase/migrations/

# 5. Aplica las migraciones
supabase db push

# 6. Verifica el estado
supabase migration list
```

### Opción 3: Script SQL directo (Avanzado)

```bash
# Ejecuta directamente en PostgreSQL
psql -h db.your-project.supabase.co \
     -U postgres \
     -d postgres \
     -f supabase/migrations/001_enable_row_level_security.sql
```

---

## Verificación y Testing

### 1. Verificar que RLS está habilitado

```sql
-- Ejecuta en SQL Editor de Supabase
SELECT tablename, rowsecurity
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
);

-- Todas las tablas deben mostrar rowsecurity = true
```

### 2. Listar políticas creadas

```sql
-- Ver todas las políticas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Test de políticas de usuario normal

**Prueba en el frontend:**

```javascript
import { supabase } from '@/supabase';

// Test 1: Usuario solo ve sus propias reservas
async function testUserReservations() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*');

  console.log('Reservas del usuario:', data);
  // Debe devolver solo las reservas del usuario autenticado
}

// Test 2: Usuario NO puede ver reservas de otros
async function testCannotSeeOthersReservations() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('usuario_id', 'otro-usuario-id');  // ⚠️ Debe devolver vacío

  console.log('Reservas de otro usuario:', data);
  // Debe devolver array vacío []
}

// Test 3: Usuario NO puede actualizar reservas de otros
async function testCannotUpdateOthersReservations() {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', 'reserva-de-otro-usuario-id');

  console.log('Error esperado:', error);
  // Debe fallar con error de política
}
```

### 4. Test de políticas de administrador

**Prueba con usuario admin:**

```javascript
// Admin debe ver todas las reservas
async function testAdminViewAllReservations() {
  // Primero asegúrate de estar logueado como admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', auth.uid())
    .single();

  console.log('Rol:', profile.role);  // Debe ser 'admin'

  const { data, error } = await supabase
    .from('reservas')
    .select('*');

  console.log('Todas las reservas:', data);
  // Debe devolver TODAS las reservas, no solo las del admin
}
```

---

## Troubleshooting

### ❌ Error: "new row violates row-level security policy"

**Causa**: Intentas insertar/actualizar datos que no pasan la política RLS.

**Solución**:
```javascript
// ❌ INCORRECTO: Intentar crear reserva para otro usuario
await supabase
  .from('reservas')
  .insert({ usuario_id: 'otro-usuario-id', ... });

// ✅ CORRECTO: Crear reserva para el usuario autenticado
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('reservas')
  .insert({ usuario_id: user.id, ... });
```

### ❌ Error: "permission denied for table"

**Causa**: La tabla tiene RLS habilitado pero no hay políticas que permitan el acceso.

**Solución**: Verifica que las políticas se hayan creado correctamente:
```sql
SELECT * FROM pg_policies WHERE tablename = 'nombre_tabla';
```

### ⚠️ Consultas que antes funcionaban ahora devuelven vacío

**Causa**: RLS está filtrando resultados correctamente.

**Solución esperada**: Esto es el comportamiento correcto. Verifica que:
1. El usuario esté autenticado: `supabase.auth.getUser()`
2. El campo `usuario_id` coincida con `auth.uid()`
3. Si es admin, verifica que `user_profiles.role = 'admin'`

### 🐛 Políticas no se aplican a funciones RPC

**Causa**: Las funciones RPC con `SECURITY DEFINER` bypassean RLS.

**Solución**: Cambiar a `SECURITY INVOKER`:
```sql
ALTER FUNCTION nombre_funcion() SECURITY INVOKER;
```

### 🔧 Necesito bypassear RLS temporalmente (desarrollo)

**NO RECOMENDADO EN PRODUCCIÓN**

```sql
-- Deshabilitar RLS temporalmente (SOLO DESARROLLO)
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

-- Habilitar nuevamente
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
```

### 📊 Performance: Consultas lentas después de RLS

**Causa**: Falta de índices en columnas usadas en políticas.

**Solución**: Verifica que los índices se hayan creado:
```sql
-- Ver índices existentes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'reservas', 'facturas');

-- Los índices deberían incluir:
-- idx_user_profiles_role
-- idx_reservas_usuario_id
-- idx_facturas_usuario_id
-- etc.
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Auth helpers de Supabase](https://supabase.com/docs/guides/auth/auth-helpers)

---

## 🔐 Checklist de Seguridad

Antes de ir a producción, verifica:

- [ ] RLS habilitado en todas las tablas sensibles
- [ ] Políticas creadas y probadas para usuarios normales
- [ ] Políticas creadas y probadas para administradores
- [ ] Índices creados para optimizar consultas con RLS
- [ ] Tests automatizados que verifican permisos
- [ ] Revisión de funciones RPC (SECURITY INVOKER vs DEFINER)
- [ ] Backup de base de datos antes de aplicar en producción
- [ ] Logs de auditoría configurados (opcional pero recomendado)

---

**Última actualización**: 2025-12-07
**Autor**: Claude Code
**Versión**: 1.0.0
