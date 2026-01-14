/**
 * Cliente API para integración con PisamaApp
 *
 * Este módulo maneja el envío de pagos desde la Finance App hacia PisamaApp
 * mediante la Edge Function 'receive-payment'.
 *
 * @example
 * ```typescript
 * import { sendPaymentToPisama } from '@/lib/pisama-integration';
 *
 * const result = await sendPaymentToPisama({
 *   transactionId: 'tx_12345',
 *   email: 'usuario@example.com',
 *   fullName: 'Juan Pérez',
 *   amount: 1500,
 *   paymentDate: '2026-01-13T10:30:00Z',
 *   note: 'Pago semanal - Enero 2026'
 * });
 * ```
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * Configuración de la integración con PisamaApp
 * IMPORTANTE: Estas variables deben estar en tu archivo .env o .env.local
 */
const PISAMA_CONFIG = {
  projectRef: process.env.NEXT_PUBLIC_PISAMA_PROJECT_REF || 'tgetexpttsvcgsheaybu',
  apiKey: process.env.PISAMA_API_KEY || '',
  anonKey: process.env.NEXT_PUBLIC_PISAMA_ANON_KEY || '',
};

/**
 * Construye la URL completa de la Edge Function
 */
const getEdgeFunctionUrl = (): string => {
  return `https://${PISAMA_CONFIG.projectRef}.supabase.co/functions/v1/receive-payment`;
};

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Datos del pago a enviar a PisamaApp
 */
export interface PaymentData {
  /** ID único de la transacción (debe ser único, se usa para idempotencia) */
  transactionId: string;
  /** Email del usuario (debe existir en PisamaApp) */
  email: string;
  /** Nombre completo del usuario (se usa fuzzy matching) */
  fullName: string;
  /** Monto del pago */
  amount: number;
  /** Fecha del pago (ISO 8601), si no se proporciona usa la fecha actual */
  paymentDate?: string;
  /** Nota opcional sobre el pago */
  note?: string;
}

/**
 * Respuesta exitosa de la Edge Function
 */
export interface PaymentSuccessResponse {
  success: true;
  message: string;
  payment?: {
    id: string;
    usuario_id: string;
    monto: number;
    tipo: string;
    fecha_pago: string;
    estado: string;
  };
  alreadyProcessed?: boolean;
}

/**
 * Respuesta de error de la Edge Function
 */
export interface PaymentErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Resultado del envío del pago
 */
export type PaymentResult = {
  success: true;
  data: PaymentSuccessResponse;
} | {
  success: false;
  error: PaymentErrorResponse;
  statusCode: number;
};

// ============================================================================
// VALIDACIÓN
// ============================================================================

/**
 * Valida que la configuración esté completa
 */
const validateConfig = (): void => {
  if (!PISAMA_CONFIG.apiKey) {
    throw new Error(
      'PISAMA_API_KEY no está configurada. Agrega la API key en tu archivo .env'
    );
  }
  if (!PISAMA_CONFIG.anonKey) {
    throw new Error(
      'NEXT_PUBLIC_PISAMA_ANON_KEY no está configurada. Agrega el anon key en tu archivo .env'
    );
  }
  if (!PISAMA_CONFIG.projectRef) {
    throw new Error(
      'NEXT_PUBLIC_PISAMA_PROJECT_REF no está configurada. Agrega el project ref en tu archivo .env'
    );
  }
};

/**
 * Valida los datos del pago antes de enviarlos
 */
const validatePaymentData = (data: PaymentData): void => {
  if (!data.transactionId || data.transactionId.trim() === '') {
    throw new Error('El transactionId es requerido y no puede estar vacío');
  }
  if (!data.email || data.email.trim() === '') {
    throw new Error('El email es requerido y no puede estar vacío');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('El email no tiene un formato válido');
  }
  if (!data.fullName || data.fullName.trim() === '') {
    throw new Error('El fullName es requerido y no puede estar vacío');
  }
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    throw new Error('El amount debe ser un número mayor a 0');
  }
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Envía un pago a PisamaApp
 *
 * Esta función maneja:
 * - Validación de datos
 * - Envío HTTP con autenticación
 * - Manejo de errores
 * - Idempotencia (transacciones duplicadas)
 *
 * @param data - Datos del pago a enviar
 * @returns Resultado del envío (éxito o error)
 *
 * @example
 * ```typescript
 * const result = await sendPaymentToPisama({
 *   transactionId: 'tx_12345',
 *   email: 'usuario@example.com',
 *   fullName: 'Juan Pérez',
 *   amount: 1500,
 * });
 *
 * if (result.success) {
 *   console.log('Pago enviado:', result.data.message);
 *   if (result.data.alreadyProcessed) {
 *     console.log('Este pago ya había sido procesado anteriormente');
 *   }
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 * ```
 */
export async function sendPaymentToPisama(
  data: PaymentData
): Promise<PaymentResult> {
  try {
    // 1. Validar configuración
    validateConfig();

    // 2. Validar datos del pago
    validatePaymentData(data);

    // 3. Preparar payload
    const payload = {
      transactionId: data.transactionId.trim(),
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      amount: data.amount,
      paymentDate: data.paymentDate || new Date().toISOString(),
      note: data.note?.trim() || null,
    };

    // 4. Realizar petición HTTP
    const response = await fetch(getEdgeFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PISAMA_CONFIG.anonKey}`,
        'x-api-key': PISAMA_CONFIG.apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 5. Parsear respuesta
    const responseData = await response.json();

    // 6. Manejar respuesta según status code
    if (response.ok) {
      return {
        success: true,
        data: responseData as PaymentSuccessResponse,
      };
    } else {
      return {
        success: false,
        error: responseData as PaymentErrorResponse,
        statusCode: response.status,
      };
    }
  } catch (error) {
    // 7. Manejar errores de red o validación
    return {
      success: false,
      error: {
        error: 'network_error',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      statusCode: 0,
    };
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene un mensaje de error amigable basado en el código de error
 */
export function getErrorMessage(result: PaymentResult): string {
  if (result.success) {
    return '';
  }

  const errorCode = result.error.error;
  const errorMessage = result.error.message;

  switch (errorCode) {
    case 'validation_error':
      return `Error de validación: ${errorMessage}`;
    case 'user_not_found':
      return 'Usuario no encontrado en PisamaApp. Verifica el email.';
    case 'user_name_mismatch':
      return `El nombre no coincide: ${errorMessage}`;
    case 'network_error':
      return `Error de conexión: ${errorMessage}`;
    case 'unauthorized':
      return 'Error de autenticación. Verifica la configuración de API keys.';
    default:
      return `Error: ${errorMessage}`;
  }
}

/**
 * Verifica si un error es por transacción duplicada (idempotencia)
 */
export function isDuplicateTransaction(result: PaymentResult): boolean {
  if (result.success) {
    return result.data.alreadyProcessed === true;
  }
  return (
    result.error.error === 'duplicate_transaction' ||
    result.error.message?.includes('duplicate key value violates unique constraint')
  );
}

/**
 * Formatea el resultado para logging
 */
export function formatResultForLogging(
  data: PaymentData,
  result: PaymentResult
): string {
  const timestamp = new Date().toISOString();
  const status = result.success ? 'SUCCESS' : 'ERROR';
  const details = result.success
    ? `Payment ID: ${result.data.payment?.id || 'N/A'}`
    : `Error: ${result.error.error} - ${result.error.message}`;

  return `[${timestamp}] ${status} | Transaction: ${data.transactionId} | User: ${data.email} | Amount: $${data.amount} | ${details}`;
}
