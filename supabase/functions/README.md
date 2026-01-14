# Supabase Edge Functions - PisamaApp

Este directorio contiene las Edge Functions de Supabase para PisamaApp.

## Edge Function: receive-payment

Recibe pagos desde la app de finanzas externa (NextJS) y los procesa automáticamente en PisamaApp.

### Flujo de Procesamiento

1. Valida API key en header `x-api-key`
2. Busca usuario por email (case-insensitive)
3. Verifica coincidencia de nombre (fuzzy matching)
4. Inserta pago en tabla `pagos` con idempotencia (via `origen_id` unique)
5. Trigger automático reconcilia facturas pendientes (FIFO)
6. Crea notificación para el usuario

### Deployment

#### Prerequisitos

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Login en Supabase**:
   ```bash
   supabase login
   ```

3. **Link al proyecto**:
   ```bash
   supabase link --project-ref [tu-project-ref]
   ```

   El `project-ref` lo encuentras en la URL de tu dashboard: `https://supabase.com/dashboard/project/[project-ref]`

#### Configurar Secrets

Antes de deployar, configura las variables de entorno:

```bash
# Generar API key segura (32 caracteres)
openssl rand -base64 32

# Configurar secret
supabase secrets set FINANCE_APP_API_KEY="[tu_clave_generada]"

# Verificar secrets (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están configurados automáticamente)
supabase secrets list
```

⚠️ **IMPORTANTE**: Guarda la API key generada en un lugar seguro. La necesitarás configurar en tu app de finanzas NextJS.

#### Deploy de la Function

```bash
# Deploy de una función específica
supabase functions deploy receive-payment

# O deploy de todas las funciones
supabase functions deploy
```

#### Obtener la URL de la Function

Después del deploy, obtendrás una URL como:
```
https://[project-ref].supabase.co/functions/v1/receive-payment
```

Esta URL es la que usarás en tu app de finanzas como `PISAMA_WEBHOOK_URL`.

### Testing Local

Para probar la función localmente antes de deployar:

```bash
# Iniciar funciones localmente
supabase functions serve receive-payment

# En otra terminal, hacer request de prueba
curl -X POST http://localhost:54321/functions/v1/receive-payment \
  -H "x-api-key: tu_clave_de_prueba" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-001",
    "note": "Pago de prueba"
  }'
```

### Testing en Producción

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/receive-payment \
  -H "x-api-key: [tu_api_key]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "fullName": "María García",
    "amount": 2000,
    "transactionId": "TXN-20260113-001",
    "note": "Pago semanal",
    "paymentDate": "2026-01-13T10:00:00Z"
  }'
```

### Respuestas de la API

#### Éxito (200)
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "usuario_id": "uuid",
    "monto": 1500,
    "fecha_pago": "2026-01-13T10:00:00Z",
    "estado": "procesado"
  },
  "message": "Payment processed successfully"
}
```

#### Pago Duplicado (200)
```json
{
  "status": "already_processed",
  "message": "This payment was already recorded",
  "transactionId": "TXN-123"
}
```

#### Usuario No Encontrado (404)
```json
{
  "error": "User not found",
  "message": "No user found with email: usuario@ejemplo.com",
  "email": "usuario@ejemplo.com"
}
```

#### Nombre No Coincide (400)
```json
{
  "error": "User name mismatch",
  "message": "Name \"Pedro López\" does not match user with email usuario@ejemplo.com",
  "foundUsers": ["Juan Pérez"]
}
```

#### API Key Inválida (401)
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

### Logs y Monitoreo

Para ver logs de la función en tiempo real:

```bash
supabase functions logs receive-payment

# Con seguimiento continuo
supabase functions logs receive-payment --follow
```

O desde el dashboard: **Edge Functions → receive-payment → Logs**

### Variables de Entorno Disponibles

Las siguientes variables están disponibles automáticamente:

- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin)
- `FINANCE_APP_API_KEY` - Tu API key personalizada (debes configurarla)

### Seguridad

- ✅ API key requerida en header `x-api-key`
- ✅ Service role key nunca se expone al cliente
- ✅ CORS configurado para permitir requests desde cualquier origen
- ✅ Idempotencia via `origen_id` unique constraint
- ✅ Validación de campos requeridos
- ✅ Fuzzy matching de nombres para evitar errores

### Rotación de API Key

Para rotar la API key (recomendado cada 6 meses):

```bash
# 1. Generar nueva key
openssl rand -base64 32

# 2. Actualizar secret en Supabase
supabase secrets set FINANCE_APP_API_KEY="[nueva_clave]"

# 3. Re-deploy (automático con el nuevo secret)
supabase functions deploy receive-payment

# 4. Actualizar .env en Finance App con la nueva key
```

### Troubleshooting

**Error: "No such file or directory"**
- Asegúrate de estar en el directorio raíz del proyecto donde está la carpeta `supabase/`

**Error: "Project ref not found"**
- Ejecuta `supabase link --project-ref [ref]` nuevamente

**Error: "Invalid API key"**
- Verifica que el secret esté configurado: `supabase secrets list`
- Asegúrate de que el header sea exactamente `x-api-key` (case-sensitive)

**Error: "User not found"**
- Verifica que el email del usuario exista en la tabla `user_profiles`
- El matching es case-insensitive, pero el email debe coincidir exactamente

**Error: "User name mismatch"**
- Verifica que el nombre enviado sea similar al nombre del usuario
- El matching es flexible (permite nombres parciales)

### Próximos Pasos

Después de deployar esta función:

1. Copia la URL de la función deployada
2. Guarda la API key generada
3. Configura ambos valores en tu app de finanzas NextJS:
   ```env
   PISAMA_WEBHOOK_URL=https://[project-ref].supabase.co/functions/v1/receive-payment
   PISAMA_API_KEY=[tu_api_key]
   ```
4. Implementa el cliente en la app de finanzas (ver Fase 7 del plan)
