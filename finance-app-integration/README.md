# Integración Finance App → PisamaApp

Este directorio contiene el código necesario para integrar tu aplicación de finanzas (NextJS + Supabase) con PisamaApp, permitiendo el envío automático de pagos.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Componentes](#componentes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🏗️ Arquitectura

```
Finance App (NextJS)          Edge Function              PisamaApp Database
     |                              |                            |
     |  1. Envío HTTP              |                            |
     |  POST /receive-payment      |                            |
     |  Headers:                   |                            |
     |  - Authorization: Bearer    |                            |
     |  - x-api-key: XXX          |                            |
     |---------------------------->|                            |
     |                              | 2. Validar API Key        |
     |                              | 3. Match usuario (email)  |
     |                              | 4. Fuzzy match (nombre)   |
     |                              |                            |
     |                              | 5. INSERT en tabla pagos  |
     |                              |--------------------------->|
     |                              |                            | 6. Trigger FIFO
     |                              |                            | (conciliar_pagos)
     |                              |                            |
     |                              | 7. Crear notificación     |
     |                              |--------------------------->|
     |                              |                            |
     |  8. Respuesta JSON          |                            |
     |<----------------------------|                            |
```

## 📦 Instalación

### 1. Copiar archivos a tu proyecto

Copia los siguientes archivos a tu proyecto de Finance App (NextJS):

```bash
# Cliente API
cp finance-app-integration/lib/pisama-integration.ts <tu-finance-app>/lib/

# Componente UI
cp finance-app-integration/components/SendToPisamaButton.tsx <tu-finance-app>/components/

# Variables de entorno
cp finance-app-integration/.env.example <tu-finance-app>/.env.local
```

### 2. Instalar dependencias

No se requieren dependencias adicionales si ya tienes NextJS 13+ con TypeScript.

## ⚙️ Configuración

### 1. Variables de entorno

Edita el archivo `.env.local` en tu Finance App:

```bash
# Project Reference de PisamaApp
NEXT_PUBLIC_PISAMA_PROJECT_REF=tgetexpttsvcgsheaybu

# Anon Key (pública)
NEXT_PUBLIC_PISAMA_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXRleHB0dHN2Y2dzaGVheWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NDkwOTksImV4cCI6MjA1MjIyNTA5OX0.a3cpRUgNz-UMDCfgQCMNGu8Z2yRl3VC89J-Zo7-2xRM

# API Key PRIVADA (solo servidor)
PISAMA_API_KEY=Hv2cXWZznIojXOzRYlvygJBFKGioG3HPaa8hENmrUkE=
```

### 2. Verificar .gitignore

Asegúrate de que `.env.local` esté en tu `.gitignore`:

```gitignore
# .gitignore
.env.local
.env*.local
```

## 🚀 Uso

### Uso Básico: Envío Individual

```tsx
import { SendToPisamaButton } from "@/components/SendToPisamaButton";

export default function TransactionRow({ transaction }) {
  return (
    <tr>
      <td>{transaction.id}</td>
      <td>{transaction.fullName}</td>
      <td>${transaction.amount}</td>
      <td>
        <SendToPisamaButton
          transaction={{
            id: transaction.id,
            email: transaction.email,
            fullName: transaction.fullName,
            amount: transaction.amount,
            date: transaction.date,
            description: transaction.description,
          }}
          onSuccess={(result) => {
            console.log("Pago enviado exitosamente:", result);
            // Actualizar UI, marcar como enviado, etc.
          }}
          onError={(error) => {
            console.error("Error al enviar pago:", error);
            // Mostrar toast de error, etc.
          }}
        />
      </td>
    </tr>
  );
}
```

### Uso Avanzado: Envío en Lote

```tsx
import { SendBatchToPisama } from "@/components/SendToPisamaButton";

export default function WeeklyPaymentsPage({ payments }) {
  // Filtrar solo pagos de "Espacio Pisama (Pago)"
  const pisamaPayments = payments.filter(
    (p) => p.category === "Espacio Pisama (Pago)",
  );

  return (
    <div>
      <h2>Enviar pagos semanales a PisamaApp</h2>
      <p>{pisamaPayments.length} pagos listos para enviar</p>

      <SendBatchToPisama
        transactions={pisamaPayments}
        onComplete={(results) => {
          console.log("Envío completo:", results);
          // results = { success: 10, errors: 0, duplicates: 2 }
          alert(
            `Enviados: ${results.success}, Duplicados: ${results.duplicates}, Errores: ${results.errors}`,
          );
        }}
      />
    </div>
  );
}
```

### Uso Programático (sin UI)

```tsx
import { sendPaymentToPisama, getErrorMessage } from "@/lib/pisama-integration";

export async function sendWeeklyPayments() {
  const payments = await getWeeklyPaymentsFromDB();

  for (const payment of payments) {
    const result = await sendPaymentToPisama({
      transactionId: payment.id,
      email: payment.user_email,
      fullName: payment.user_name,
      amount: payment.amount,
      paymentDate: payment.date,
      note: "Pago semanal automático",
    });

    if (result.success) {
      console.log("✓ Enviado:", payment.id);
      await markAsSentInDB(payment.id);
    } else {
      console.error("✗ Error:", getErrorMessage(result));
      await logErrorInDB(payment.id, result.error);
    }
  }
}
```

## 🧩 Componentes

### `pisama-integration.ts` (Cliente API)

**Funciones principales:**

- `sendPaymentToPisama(data: PaymentData): Promise<PaymentResult>`
  - Envía un pago a PisamaApp
  - Maneja validación, autenticación, y errores
  - Retorna resultado tipado

- `getErrorMessage(result: PaymentResult): string`
  - Convierte código de error en mensaje amigable

- `isDuplicateTransaction(result: PaymentResult): boolean`
  - Detecta si una transacción ya fue procesada (idempotencia)

- `formatResultForLogging(data, result): string`
  - Formatea el resultado para logs

**Tipos:**

```typescript
interface PaymentData {
  transactionId: string; // ID único (idempotencia)
  email: string; // Email del usuario
  fullName: string; // Nombre completo (fuzzy matching)
  amount: number; // Monto del pago
  paymentDate?: string; // Fecha ISO 8601 (opcional)
  note?: string; // Nota adicional (opcional)
}

type PaymentResult =
  | {
      success: true;
      data: PaymentSuccessResponse;
    }
  | {
      success: false;
      error: PaymentErrorResponse;
      statusCode: number;
    };
```

### `SendToPisamaButton.tsx` (Componente UI)

**Props:**

```typescript
interface SendToPisamaButtonProps {
  transaction: Transaction;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: PaymentResult) => void;
  disabled?: boolean;
  buttonText?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}
```

**Estados visuales:**

- `idle`: Estado inicial (botón normal)
- `loading`: Enviando (spinner animado)
- `success`: Enviado exitosamente (✓ verde)
- `error`: Error al enviar (✗ rojo, con mensaje)
- `duplicate`: Ya fue enviado antes (⚠ amarillo)

## 🧪 Testing

### Test Manual (curl)

```bash
# Desde la terminal de tu Finance App
curl -X POST https://tgetexpttsvcgsheaybu.supabase.co/functions/v1/receive-payment \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-api-key: Hv2cXWZznIojXOzRYlvygJBFKGioG3HPaa8hENmrUkE=" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "test_123",
    "email": "titantelo@gmail.com",
    "fullName": "Gastón Campo",
    "amount": 1500,
    "note": "Test desde Finance App"
  }'
```

### Test desde NextJS (API Route)

Crea un archivo `app/api/test-pisama/route.ts`:

```typescript
import { sendPaymentToPisama } from "@/lib/pisama-integration";
import { NextResponse } from "next/server";

export async function POST() {
  const result = await sendPaymentToPisama({
    transactionId: `test_${Date.now()}`,
    email: "titantelo@gmail.com",
    fullName: "Gastón Campo",
    amount: 1500,
    note: "Test desde API Route",
  });

  return NextResponse.json(result);
}
```

Luego accede a: `http://localhost:3000/api/test-pisama` (POST)

## 🔧 Troubleshooting

### Error: "Missing authorization header"

**Causa:** No se está enviando el `Authorization: Bearer` header.

**Solución:** Verifica que `NEXT_PUBLIC_PISAMA_ANON_KEY` esté configurada correctamente en `.env.local`.

### Error: "Invalid API key"

**Causa:** La API key en el header `x-api-key` no coincide con la configurada en la Edge Function.

**Solución:** Verifica que `PISAMA_API_KEY` en tu `.env.local` sea exactamente igual a la configurada en `supabase/functions/receive-payment/.env`.

### Error: "User not found"

**Causa:** El email no existe en PisamaApp.

**Solución:** Verifica que el usuario esté registrado en PisamaApp. Usa el email exacto (case-insensitive).

### Error: "User name mismatch"

**Causa:** El fuzzy matching falló porque el nombre es muy diferente.

**Solución:** El nombre debe coincidir parcialmente. Por ejemplo:

- ✓ "Gastón Campo" → "Campo" (OK)
- ✓ "Gastón Campo" → "Gastón" (OK)
- ✗ "Gastón Campo" → "Juan Pérez" (ERROR)

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existe un pago con ese `transactionId`.

**Solución:** Esto es NORMAL y esperado (idempotencia). El pago ya fue procesado. Muestra mensaje "Ya enviado".

### Warning: Variables de entorno no definidas

**Causa:** Olvidaste copiar `.env.example` a `.env.local`.

**Solución:**

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

## 📝 Notas Importantes

### Seguridad

- La `PISAMA_API_KEY` es PRIVADA. Solo úsala en:
  - Server Components (NextJS 13+ App Router)
  - API Routes (`/api/*`)
  - Server Actions
- NUNCA expongas la API key en el cliente (componentes `'use client'`)

### Idempotencia

- El `transactionId` debe ser único y consistente
- Si envías la misma transacción dos veces, la segunda será rechazada automáticamente
- Esto es SEGURO y previene pagos duplicados

### Fuzzy Matching

- El nombre se valida con fuzzy matching bidireccional:
  - "Gastón Campo" coincide con "Campo"
  - "Juan Pérez García" coincide con "Juan Pérez"
  - "María López" NO coincide con "Pedro Sánchez"
- Si el fuzzy matching falla, verifica que el nombre en Finance App sea similar al de PisamaApp

### Categorías

- Solo envía pagos con categoría `"Espacio Pisama (Pago)"`
- Filtra las transacciones antes de enviarlas:
  ```typescript
  const pisamaPayments = allTransactions.filter(
    (tx) => tx.category === "Espacio Pisama (Pago)",
  );
  ```

## 📞 Soporte

Si tienes problemas con la integración:

1. Revisa la sección [Troubleshooting](#troubleshooting)
2. Verifica los logs de la Edge Function en Supabase Dashboard
3. Usa `formatResultForLogging()` para obtener logs detallados
4. Contacta al equipo de desarrollo de PisamaApp

## 🔄 Flujo Recomendado (Semanal)

```
1. Lunes → Filtrar pagos de la semana anterior con categoría "Espacio Pisama (Pago)"
2. Revisar lista de pagos a enviar
3. Click en "Enviar todos a Pisama"
4. Revisar resultados (exitosos / duplicados / errores)
5. Para errores: corregir datos y reintentar
6. Marcar pagos como "enviados" en tu base de datos
```

## ✅ Checklist de Implementación

- [ ] Copiar `lib/pisama-integration.ts` a tu proyecto
- [ ] Copiar `components/SendToPisamaButton.tsx` a tu proyecto
- [ ] Crear `.env.local` con las 3 variables de entorno
- [ ] Verificar que `.env.local` esté en `.gitignore`
- [ ] Hacer un test con un pago de prueba
- [ ] Verificar que el pago aparezca en PisamaApp
- [ ] Implementar filtro por categoría "Espacio Pisama (Pago)"
- [ ] Agregar botón de envío en tu UI de transacciones
- [ ] Documentar el flujo semanal para tu equipo
- [ ] Configurar manejo de errores (logs, notificaciones, etc.)
