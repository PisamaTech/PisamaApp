# Ejemplo de Integración desde App de Finanzas (NextJS)

Este documento muestra cómo integrar el envío de pagos desde tu app de finanzas NextJS a PisamaApp.

## Configuración Inicial

### 1. Variables de Entorno

Crea o actualiza tu archivo `.env.local` en la app de finanzas:

```env
# .env.local
PISAMA_WEBHOOK_URL=https://[tu-project-ref].supabase.co/functions/v1/receive-payment
PISAMA_API_KEY=[tu_api_key_generada]
```

⚠️ **NUNCA** commitees estas variables a git. Agrega `.env.local` a tu `.gitignore`.

## Código de Integración

### Cliente API (TypeScript)

Crea un archivo `lib/pisama-integration.ts`:

```typescript
// lib/pisama-integration.ts

export interface Transaction {
  id: string
  userEmail: string
  userName: string
  amount: number
  description?: string
  date: string
  category: string
}

export interface PaymentResult {
  transactionId: string
  status: 'success' | 'error' | 'already_sent'
  data?: any
  error?: string
}

export async function sendPaymentToPisama(
  transaction: Transaction
): Promise<PaymentResult> {
  try {
    const response = await fetch(process.env.PISAMA_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PISAMA_API_KEY!
      },
      body: JSON.stringify({
        email: transaction.userEmail,
        fullName: transaction.userName,
        amount: transaction.amount,
        transactionId: transaction.id,
        note: transaction.description,
        paymentDate: transaction.date
      })
    })

    const result = await response.json()

    if (response.ok) {
      // Éxito o ya procesado
      return {
        transactionId: transaction.id,
        status: result.status === 'already_processed' ? 'already_sent' : 'success',
        data: result
      }
    } else {
      // Error
      return {
        transactionId: transaction.id,
        status: 'error',
        error: result.message || result.error,
        data: result
      }
    }
  } catch (error) {
    return {
      transactionId: transaction.id,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function sendMultiplePaymentsToPisama(
  transactions: Transaction[]
): Promise<PaymentResult[]> {
  const results: PaymentResult[] = []

  for (const tx of transactions) {
    const result = await sendPaymentToPisama(tx)
    results.push(result)
  }

  return results
}
```

### Componente React (UI)

Crea un componente para enviar los pagos:

```typescript
// components/SendToPisamaButton.tsx
'use client'

import { useState } from 'react'
import { sendMultiplePaymentsToPisama, Transaction } from '@/lib/pisama-integration'

interface Props {
  transactions: Transaction[]
  onSuccess?: () => void
}

export function SendToPisamaButton({ transactions, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleSend = async () => {
    if (!confirm(`¿Enviar ${transactions.length} pagos a PisamaApp?`)) {
      return
    }

    setLoading(true)
    setShowResults(false)

    try {
      const results = await sendMultiplePaymentsToPisama(transactions)
      setResults(results)
      setShowResults(true)

      // Contar éxitos
      const successCount = results.filter(r => r.status === 'success').length
      const alreadySentCount = results.filter(r => r.status === 'already_sent').length
      const errorCount = results.filter(r => r.status === 'error').length

      alert(
        `Resultados:\n` +
        `✅ ${successCount} enviados correctamente\n` +
        `⚠️ ${alreadySentCount} ya enviados previamente\n` +
        `❌ ${errorCount} fallidos`
      )

      if (successCount > 0 && onSuccess) {
        onSuccess()
      }
    } catch (error) {
      alert('Error al enviar pagos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSend}
        disabled={loading || transactions.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : `Enviar ${transactions.length} pagos a PisamaApp`}
      </button>

      {showResults && (
        <div className="border rounded p-4 space-y-2">
          <h3 className="font-bold">Resultados del Envío</h3>
          {results.map((result, i) => (
            <div
              key={result.transactionId}
              className={`p-2 rounded ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : result.status === 'already_sent'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              } border`}
            >
              <div className="font-mono text-sm">{result.transactionId}</div>
              <div className="text-sm">
                {result.status === 'success' && '✅ Enviado correctamente'}
                {result.status === 'already_sent' && '⚠️ Ya enviado previamente'}
                {result.status === 'error' && `❌ Error: ${result.error}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Uso en una Página

```typescript
// app/finanzas/page.tsx (o pages/finanzas.tsx en Pages Router)
'use client'

import { useState, useEffect } from 'react'
import { SendToPisamaButton } from '@/components/SendToPisamaButton'

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState([])
  const [selectedTxs, setSelectedTxs] = useState<string[]>([])

  useEffect(() => {
    // Cargar transacciones con categoría "Espacio Pisama (Pago)"
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    // Tu lógica para cargar transacciones desde Supabase
    // const { data } = await supabase
    //   .from('transactions')
    //   .select('*')
    //   .eq('category', 'Espacio Pisama (Pago)')
    //   .order('date', { ascending: false })
    // setTransactions(data)
  }

  const handleToggleTransaction = (txId: string) => {
    setSelectedTxs(prev =>
      prev.includes(txId)
        ? prev.filter(id => id !== txId)
        : [...prev, txId]
    )
  }

  const selectedTransactions = transactions.filter(tx =>
    selectedTxs.includes(tx.id)
  )

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Pagos de Espacio Pisama</h1>

      <div className="mb-4">
        <SendToPisamaButton
          transactions={selectedTransactions}
          onSuccess={() => {
            // Marcar transacciones como enviadas en tu BD
            // O recargar la lista
            loadTransactions()
          }}
        />
      </div>

      <div className="space-y-2">
        {transactions.map(tx => (
          <label
            key={tx.id}
            className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedTxs.includes(tx.id)}
              onChange={() => handleToggleTransaction(tx.id)}
            />
            <div className="flex-1">
              <div className="font-medium">{tx.userName}</div>
              <div className="text-sm text-gray-600">{tx.userEmail}</div>
            </div>
            <div className="text-lg font-bold">${tx.amount.toLocaleString()}</div>
            <div className="text-sm text-gray-500">{tx.date}</div>
          </label>
        ))}
      </div>
    </div>
  )
}
```

## Casos de Uso y Manejo de Errores

### Caso 1: Envío Exitoso

```typescript
// Respuesta de la API
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

// Acción: Marcar transacción como "Enviado a PisamaApp"
await updateTransactionStatus(tx.id, 'sent_to_pisama')
```

### Caso 2: Pago Duplicado (Idempotencia)

```typescript
// Respuesta de la API
{
  "status": "already_processed",
  "message": "This payment was already recorded",
  "transactionId": "TXN-123"
}

// Acción: Marcar como ya enviado, mostrar advertencia
await updateTransactionStatus(tx.id, 'already_sent')
alert('⚠️ Este pago ya fue enviado previamente')
```

### Caso 3: Usuario No Encontrado

```typescript
// Respuesta de la API
{
  "error": "User not found",
  "message": "No user found with email: usuario@ejemplo.com",
  "email": "usuario@ejemplo.com"
}

// Acción: Mostrar error, solicitar verificación manual
alert(`❌ Usuario no encontrado: ${email}\n\nVerifica que este usuario esté registrado en PisamaApp`)
```

### Caso 4: Nombre No Coincide

```typescript
// Respuesta de la API
{
  "error": "User name mismatch",
  "message": "Name \"Pedro López\" does not match user with email usuario@ejemplo.com",
  "foundUsers": ["Juan Pérez"]
}

// Acción: Mostrar sugerencias, solicitar corrección
alert(
  `❌ El nombre "Pedro López" no coincide con el usuario ${email}\n\n` +
  `Usuarios encontrados con ese email:\n` +
  `- Juan Pérez`
)
```

## Testing

### Test Manual con cURL

```bash
# Éxito
curl -X POST https://[ref].supabase.co/functions/v1/receive-payment \
  -H "x-api-key: tu_key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-001"
  }'

# Duplicado (enviar 2 veces el mismo transactionId)
curl -X POST https://[ref].supabase.co/functions/v1/receive-payment \
  -H "x-api-key: tu_key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-001"
  }'

# Usuario no encontrado
curl -X POST https://[ref].supabase.co/functions/v1/receive-payment \
  -H "x-api-key: tu_key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inexistente@ejemplo.com",
    "fullName": "Usuario Falso",
    "amount": 1500,
    "transactionId": "TEST-002"
  }'
```

### Test Unitario (Jest/Vitest)

```typescript
// lib/pisama-integration.test.ts
import { describe, it, expect, vi } from 'vitest'
import { sendPaymentToPisama } from './pisama-integration'

describe('sendPaymentToPisama', () => {
  it('should send payment successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        payment: { id: 'uuid', monto: 1500 }
      })
    })

    const result = await sendPaymentToPisama({
      id: 'TXN-001',
      userEmail: 'test@example.com',
      userName: 'Test User',
      amount: 1500,
      date: '2026-01-13',
      category: 'Espacio Pisama (Pago)'
    })

    expect(result.status).toBe('success')
  })

  it('should handle duplicate payments', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'already_processed',
        transactionId: 'TXN-001'
      })
    })

    const result = await sendPaymentToPisama({
      id: 'TXN-001',
      userEmail: 'test@example.com',
      userName: 'Test User',
      amount: 1500,
      date: '2026-01-13',
      category: 'Espacio Pisama (Pago)'
    })

    expect(result.status).toBe('already_sent')
  })

  it('should handle user not found error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'User not found',
        email: 'test@example.com'
      })
    })

    const result = await sendPaymentToPisama({
      id: 'TXN-001',
      userEmail: 'test@example.com',
      userName: 'Test User',
      amount: 1500,
      date: '2026-01-13',
      category: 'Espacio Pisama (Pago)'
    })

    expect(result.status).toBe('error')
    expect(result.error).toContain('User not found')
  })
})
```

## Mejoras Futuras

### 1. Guardar Estado de Envío

Agrega una columna en tu tabla de transacciones:

```sql
ALTER TABLE transactions
ADD COLUMN sent_to_pisama BOOLEAN DEFAULT false,
ADD COLUMN sent_at TIMESTAMPTZ,
ADD COLUMN pisama_payment_id UUID;
```

### 2. Reintentos Automáticos

```typescript
async function sendWithRetry(transaction: Transaction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sendPaymentToPisama(transaction)
    if (result.status === 'success' || result.status === 'already_sent') {
      return result
    }
    // Esperar antes de reintentar (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
  }
  throw new Error('Max retries reached')
}
```

### 3. Webhook Inverso (Notificaciones de PisamaApp → Finance App)

Si en el futuro quieres que PisamaApp notifique a tu app de finanzas cuando se genera una nueva factura, puedes crear una Edge Function similar en PisamaApp que llame a un endpoint de tu Finance App.

## Soporte

Si encuentras problemas:

1. Verifica los logs de la Edge Function: `supabase functions logs receive-payment`
2. Verifica que la API key esté correctamente configurada
3. Verifica que los emails de usuarios coincidan entre ambas apps
4. Verifica que la tabla `pagos` tenga los permisos RLS correctos
