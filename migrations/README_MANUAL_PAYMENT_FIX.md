# Solución al Error de RLS en Pagos y Facturas Manuales

## Problema
Al intentar crear pagos o facturas manuales desde la interfaz de administrador, aparecían estos errores:
```
No se pudo crear el pago: No se pudo crear el pago manual: new row violates row-level security policy for table "pagos"
```
```
No se pudo crear la factura: No se pudo crear la factura manual: new row violates row-level security policy for table "facturas"
```

## Causa
Las tablas `pagos` y `facturas` tienen Row Level Security (RLS) habilitado, pero solo tienen políticas de SELECT. No hay políticas de INSERT, lo que impide que cualquier usuario (incluso administradores) pueda insertar registros directamente en estas tablas.

## Solución
Se crearon dos funciones RPC (Remote Procedure Call) en Postgres:

### 1. `create_manual_payment` - Para Pagos Manuales
- Se ejecuta con privilegios elevados (`SECURITY DEFINER`)
- Valida que el usuario que la llama sea administrador
- Inserta el pago en la tabla evitando las restricciones de RLS
- Activa automáticamente el trigger de conciliación de pagos

### 2. `create_manual_invoice` - Para Facturas Históricas
- Se ejecuta con privilegios elevados (`SECURITY DEFINER`)
- Valida que el usuario que la llama sea administrador
- Inserta la factura en la tabla evitando las restricciones de RLS
- Preserva los valores históricos sin conciliación automática

## Pasos para Aplicar la Solución

### 1. Ejecutar las Migraciones SQL

Ve a tu proyecto de Supabase:
1. Abre el **SQL Editor** en el dashboard de Supabase
2. Ejecuta el contenido del archivo `add_create_manual_payment_rpc.sql`
3. Ejecuta el contenido del archivo `add_create_manual_invoice_rpc.sql`

O desde la terminal (si tienes Supabase CLI instalado):
```bash
supabase db push --file migrations/add_create_manual_payment_rpc.sql
supabase db push --file migrations/add_create_manual_invoice_rpc.sql
```

### 2. Verificar la Instalación

Ejecuta esta consulta en el SQL Editor para verificar que las funciones se crearon correctamente:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_manual_payment', 'create_manual_invoice')
ORDER BY routine_name;
```

Deberías ver dos resultados:
- routine_name: `create_manual_invoice` | routine_type: `FUNCTION`
- routine_name: `create_manual_payment` | routine_type: `FUNCTION`

### 3. Probar la Funcionalidad

Una vez ejecutadas las migraciones:

**Para Pagos Manuales:**
1. Recarga la aplicación
2. Ve a la página de **Gestión de Pagos** (como administrador)
3. Haz clic en "Crear Pago Manual"
4. Completa el formulario y envía
5. El pago debería crearse exitosamente y aparecer en la lista

**Para Facturas Históricas:**
1. En la misma página de **Gestión de Pagos**
2. Haz clic en "Factura Histórica"
3. Completa el formulario con los datos del período y monto
4. Selecciona el estado (pendiente o pagada)
5. La factura debería crearse exitosamente

## Cambios Realizados en el Código

### Archivo Modificado:
- `src/services/paymentService.js`

### Cambios:

#### 1. Función `createManualPayment` (Pagos Manuales)
**Antes:**
```javascript
const { data, error } = await supabase
  .from("pagos")
  .insert({ ... })
```

**Después:**
```javascript
const { data, error } = await supabase.rpc("create_manual_payment", {
  p_usuario_id: paymentData.userId,
  p_monto: paymentData.amount,
  p_tipo: paymentData.type,
  p_fecha_pago: paymentData.date || new Date().toISOString(),
  p_nota: paymentData.note || null,
});
```

#### 2. Función `createManualInvoice` (Facturas Históricas)
**Antes:**
```javascript
const { data, error } = await supabase
  .from("facturas")
  .insert({ ... })
```

**Después:**
```javascript
const { data, error } = await supabase.rpc("create_manual_invoice", {
  p_usuario_id: invoiceData.userId,
  p_periodo_inicio: invoiceData.periodoInicio,
  p_periodo_fin: invoiceData.periodoFin,
  p_monto_total: invoiceData.montoTotal,
  p_estado: invoiceData.estado,
  p_nota: invoiceData.note || null,
});
```

## Validaciones Incluidas

### `create_manual_payment` (Pagos)
- ✅ Verifica que el usuario que llama tenga rol de administrador
- ✅ Valida que el usuario destino existe
- ✅ Valida que el tipo de pago sea válido (`transferencia`, `efectivo`, `descuento_especial`, `ajuste_saldo`)
- ✅ Valida que el monto sea mayor a 0

### `create_manual_invoice` (Facturas)
- ✅ Verifica que el usuario que llama tenga rol de administrador
- ✅ Valida que el usuario destino existe
- ✅ Valida que el estado sea válido (`pendiente` o `pagada`)
- ✅ Valida que el monto sea mayor a 0
- ✅ Valida que la fecha de inicio no sea posterior a la fecha de fin
- ✅ Calcula automáticamente `saldo_pendiente` y `fecha_pago` según el estado

## Notas Adicionales

### Para Pagos Manuales:
- El trigger `trigger_conciliar_pagos_insert` se ejecuta automáticamente después de insertar el pago
- Este trigger concilia el pago con facturas pendientes siguiendo el método FIFO (First In, First Out)
- Los pagos creados tienen automáticamente el estado `procesado`

### Para Facturas Históricas:
- Las facturas históricas NO se concilian automáticamente para preservar los valores históricos exactos
- El `saldo_pendiente` se calcula según el estado:
  - Si `estado = 'pagada'`: `saldo_pendiente = 0` y `fecha_pago = now()`
  - Si `estado = 'pendiente'`: `saldo_pendiente = monto_total` y `fecha_pago = null`
- El `monto_base` se establece igual al `monto_total` (sin descuentos)
- El `monto_descuento` se establece en `0`

### Archivos de Migración:
- `migrations/add_create_manual_payment_rpc.sql` - Función RPC para pagos
- `migrations/add_create_manual_invoice_rpc.sql` - Función RPC para facturas
