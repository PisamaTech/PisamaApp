/**
 * Componente UI para enviar pagos a PisamaApp
 *
 * Este componente React proporciona una interfaz de usuario para:
 * - Seleccionar transacciones a enviar
 * - Validar y enviar pagos individuales o en lote
 * - Mostrar feedback visual (loading, success, error)
 * - Manejar casos edge (duplicados, errores de validación, etc.)
 *
 * @example
 * ```tsx
 * import { SendToPisamaButton } from '@/components/SendToPisamaButton';
 *
 * <SendToPisamaButton
 *   transaction={{
 *     id: 'tx_12345',
 *     email: 'usuario@example.com',
 *     fullName: 'Juan Pérez',
 *     amount: 1500,
 *     date: '2026-01-13T10:30:00Z',
 *     description: 'Pago semanal'
 *   }}
 *   onSuccess={(result) => console.log('Enviado!', result)}
 *   onError={(error) => console.error('Error:', error)}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import {
  sendPaymentToPisama,
  getErrorMessage,
  isDuplicateTransaction,
  formatResultForLogging,
  type PaymentData,
  type PaymentResult,
} from '@/lib/pisama-integration';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Datos de la transacción desde la Finance App
 */
export interface Transaction {
  /** ID único de la transacción */
  id: string;
  /** Email del usuario */
  email: string;
  /** Nombre completo del usuario */
  fullName: string;
  /** Monto de la transacción */
  amount: number;
  /** Fecha de la transacción */
  date: string;
  /** Descripción o nota (opcional) */
  description?: string;
  /** Categoría (opcional, solo se envía si es "Espacio Pisama (Pago)") */
  category?: string;
}

/**
 * Props del componente SendToPisamaButton
 */
export interface SendToPisamaButtonProps {
  /** Transacción a enviar */
  transaction: Transaction;
  /** Callback cuando el envío es exitoso */
  onSuccess?: (result: PaymentResult) => void;
  /** Callback cuando hay un error */
  onError?: (error: PaymentResult) => void;
  /** Deshabilitar el botón */
  disabled?: boolean;
  /** Texto personalizado del botón (default: "Enviar a Pisama") */
  buttonText?: string;
  /** Variante del botón (default: "primary") */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Tamaño del botón (default: "md") */
  size?: 'sm' | 'md' | 'lg';
  /** Clase CSS adicional */
  className?: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function SendToPisamaButton({
  transaction,
  onSuccess,
  onError,
  disabled = false,
  buttonText = 'Enviar a Pisama',
  variant = 'primary',
  size = 'md',
  className = '',
}: SendToPisamaButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  /**
   * Maneja el envío del pago
   */
  const handleSendPayment = async () => {
    try {
      setIsLoading(true);
      setStatus('idle');
      setErrorMessage('');

      // Preparar datos del pago
      const paymentData: PaymentData = {
        transactionId: transaction.id,
        email: transaction.email,
        fullName: transaction.fullName,
        amount: transaction.amount,
        paymentDate: transaction.date,
        note: transaction.description,
      };

      // Enviar pago
      const result = await sendPaymentToPisama(paymentData);

      // Log del resultado (útil para debugging)
      console.log(formatResultForLogging(paymentData, result));

      // Manejar resultado
      if (result.success) {
        if (isDuplicateTransaction(result)) {
          setStatus('duplicate');
          setErrorMessage('Este pago ya fue enviado anteriormente');
        } else {
          setStatus('success');
          onSuccess?.(result);
        }
      } else {
        setStatus('error');
        const message = getErrorMessage(result);
        setErrorMessage(message);
        onError?.(result);
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(message);
      console.error('Error al enviar pago a Pisama:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Estilos del botón según variante
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  };

  // Estilos del ícono de estado
  const getStatusIcon = () => {
    if (isLoading) {
      return (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }

    if (status === 'success') {
      return (
        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }

    if (status === 'error') {
      return (
        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }

    if (status === 'duplicate') {
      return (
        <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }

    return null;
  };

  // Texto del botón según estado
  const getButtonText = () => {
    if (isLoading) return 'Enviando...';
    if (status === 'success') return 'Enviado ✓';
    if (status === 'duplicate') return 'Ya enviado';
    if (status === 'error') return 'Reintentar';
    return buttonText;
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleSendPayment}
        disabled={disabled || isLoading || status === 'success' || status === 'duplicate'}
        className={getButtonStyles()}
        type="button"
      >
        {getStatusIcon()}
        {getButtonText()}
      </button>

      {/* Mensaje de error */}
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {/* Mensaje de duplicado */}
      {status === 'duplicate' && (
        <p className="text-sm text-yellow-600">
          Este pago ya fue procesado anteriormente
        </p>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PARA ENVÍO EN LOTE
// ============================================================================

/**
 * Props del componente SendBatchToPisama
 */
export interface SendBatchToPisamaProps {
  /** Lista de transacciones a enviar */
  transactions: Transaction[];
  /** Callback cuando todos los envíos terminan */
  onComplete?: (results: { success: number; errors: number; duplicates: number }) => void;
  /** Texto del botón (default: "Enviar todos a Pisama") */
  buttonText?: string;
}

/**
 * Componente para enviar múltiples pagos en lote
 */
export function SendBatchToPisama({
  transactions,
  onComplete,
  buttonText = 'Enviar todos a Pisama',
}: SendBatchToPisamaProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState({ success: 0, errors: 0, duplicates: 0 });

  const handleSendBatch = async () => {
    setIsLoading(true);
    setProgress({ current: 0, total: transactions.length });
    setResults({ success: 0, errors: 0, duplicates: 0 });

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      setProgress({ current: i + 1, total: transactions.length });

      try {
        const paymentData: PaymentData = {
          transactionId: transaction.id,
          email: transaction.email,
          fullName: transaction.fullName,
          amount: transaction.amount,
          paymentDate: transaction.date,
          note: transaction.description,
        };

        const result = await sendPaymentToPisama(paymentData);

        if (result.success) {
          if (isDuplicateTransaction(result)) {
            duplicateCount++;
          } else {
            successCount++;
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error al enviar transacción ${transaction.id}:`, error);
      }

      setResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    }

    setIsLoading(false);
    onComplete?.({ success: successCount, errors: errorCount, duplicates: duplicateCount });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSendBatch}
        disabled={isLoading || transactions.length === 0}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enviando {progress.current} de {progress.total}...
          </>
        ) : (
          buttonText
        )}
      </button>

      {/* Resultados */}
      {!isLoading && results.success + results.errors + results.duplicates > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-2">Resultados del envío:</h4>
          <ul className="space-y-1 text-sm">
            <li className="text-green-600">✓ Exitosos: {results.success}</li>
            <li className="text-yellow-600">⚠ Duplicados: {results.duplicates}</li>
            <li className="text-red-600">✗ Errores: {results.errors}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
