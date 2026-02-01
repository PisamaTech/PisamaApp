# Debug: Error de UUID Inválido en Facturas Históricas

## Error Reportado
```
No se pudo crear la factura: No se pudo crear la factura manual: invalid input syntax for type uuid: "374"
```

## Causa Probable
El valor "374" (un número) está siendo pasado como UUID cuando debería ser un UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).

## Pasos para Debuggear

### 1. Verificar la Estructura de `user_profiles`

Ejecuta la query SQL en `migrations/debug_user_profiles_structure.sql` en el SQL Editor de Supabase.

Esto te mostrará:
- Todos los campos de la tabla `user_profiles`
- Los primeros 3 usuarios de ejemplo
- Cualquier campo numérico que pueda estar causando confusión

**Busca específicamente:**
- ¿Hay un campo llamado `id` de tipo `uuid`?
- ¿Hay algún campo numérico (integer, serial, etc.) que pueda estar siendo usado incorrectamente?
- ¿Los valores en la columna `id` son UUIDs válidos?

### 2. Verificar en la Consola del Navegador

He agregado logs de depuración en el código. Para verlos:

1. Abre la aplicación en el navegador
2. Abre las **Herramientas de Desarrollador** (F12)
3. Ve a la pestaña **Console**
4. Navega a **Gestión de Pagos** (como administrador)

Deberías ver estos logs:
```
Loaded users: [...]
First user structure: {...}
First user id: <valor> type: <tipo>
```

5. Intenta crear una factura histórica
6. Selecciona un usuario del dropdown

Deberías ver:
```
UserCombobox - Selected userId: <valor> type: <tipo>
```

7. Haz clic en "Crear Factura"

Deberías ver:
```
Invoice Form userId: <valor>
Invoice Form userId type: <tipo>
```

### 3. Análisis de los Logs

**Caso 1: El userId es un número desde el principio**
Si ves `First user id: 374 type: number`, significa que la tabla `user_profiles` tiene un campo `id` numérico en lugar de UUID.

**Solución:** Necesitas modificar `fetchAllUsers` para usar el campo UUID correcto (probablemente se llame `user_id`, `uuid`, o similar).

**Caso 2: El userId se convierte en número durante la selección**
Si `First user id` es un UUID pero `Selected userId` es un número, el problema está en el `UserCombobox`.

**Solución:** Verificar que el campo correcto esté siendo pasado en el mapeo de usuarios.

**Caso 3: El userId se corrompe antes de enviar**
Si `Selected userId` es correcto pero `Invoice Form userId` es un número, hay alguna transformación o estado guardado incorrectamente.

## Soluciones Temporales

### Opción A: Modificar fetchAllUsers para seleccionar campos específicos

Si la tabla tiene múltiples campos de ID, modifica `src/services/adminService.js`:

```javascript
// En fetchAllUsers, línea 22
let query = supabase.from("user_profiles").select("id, firstName, lastName, email, role", { count: "exact" });
```

Asegúrate de que `id` sea el campo UUID correcto.

### Opción B: Mapear los datos al cargarlos

En `src/pages/admin/PaymentManagement.jsx`, después de cargar los usuarios:

```javascript
const { data } = await fetchAllUsers(1, 1000);
// Mapear para asegurar que 'id' sea string UUID
const mappedData = data.map(user => ({
  ...user,
  id: String(user.id) // o user.uuid, dependiendo del campo correcto
}));
setAllUsers(mappedData);
```

## Archivos Modificados para Debug

Los siguientes archivos tienen logs de depuración agregados:
- `src/pages/admin/PaymentManagement.jsx` (líneas ~102, ~230)
- `src/components/admin/UserCombobox.jsx` (línea ~34)

**Nota:** Estos logs deben ser removidos después de solucionar el problema.

## Próximos Pasos

1. Ejecuta la query SQL para verificar la estructura
2. Revisa los logs en la consola del navegador
3. Basándote en los resultados, aplica la solución correspondiente
4. Reporta tus hallazgos para que pueda ayudarte con la solución específica
