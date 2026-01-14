/**
 * EJEMPLO DE IMPLEMENTACIÓN
 *
 * Esta página demuestra cómo integrar el envío de pagos a PisamaApp
 * en tu Finance App (NextJS).
 *
 * Escenario: Página que muestra transacciones semanales y permite
 * enviarlas a PisamaApp individualmente o en lote.
 */

'use client';

import { useState, useEffect } from 'react';
import { SendToPisamaButton, SendBatchToPisama } from '@/components/SendToPisamaButton';
import type { Transaction } from '@/components/SendToPisamaButton';

// Simulación de datos de transacciones (reemplaza con tu fetch real)
const mockTransactions: Transaction[] = [
  {
    id: 'tx_001',
    email: 'titantelo@gmail.com',
    fullName: 'Gastón Campo',
    amount: 1500,
    date: '2026-01-06T10:00:00Z',
    description: 'Pago semanal - 06/01 al 12/01',
    category: 'Espacio Pisama (Pago)',
  },
  {
    id: 'tx_002',
    email: 'maria@example.com',
    fullName: 'María García',
    amount: 2000,
    date: '2026-01-07T15:30:00Z',
    description: 'Pago semanal - 06/01 al 12/01',
    category: 'Espacio Pisama (Pago)',
  },
  {
    id: 'tx_003',
    email: 'juan@example.com',
    fullName: 'Juan Rodríguez',
    amount: 1000,
    date: '2026-01-08T09:15:00Z',
    description: 'Pago semanal - 06/01 al 12/01',
    category: 'Espacio Pisama (Pago)',
  },
  {
    id: 'tx_004',
    email: 'ana@example.com',
    fullName: 'Ana López',
    amount: 500,
    date: '2026-01-09T11:45:00Z',
    description: 'Descuento especial',
    category: 'Espacio Pisama (Pago)',
  },
];

export default function WeeklyPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sentTransactions, setSentTransactions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Cargar transacciones (reemplaza con tu lógica real)
  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        // Aquí harías tu fetch real a tu base de datos
        // const response = await fetch('/api/transactions?week=current&category=Espacio Pisama (Pago)');
        // const data = await response.json();
        // setTransactions(data);

        // Por ahora usamos datos mock
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simular delay
        setTransactions(mockTransactions);
      } catch (error) {
        console.error('Error al cargar transacciones:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, []);

  // Handler cuando un pago individual se envía exitosamente
  const handlePaymentSuccess = (transactionId: string) => {
    setSentTransactions((prev) => new Set(prev).add(transactionId));
    // Aquí podrías actualizar tu base de datos, mostrar un toast, etc.
    console.log(`Pago ${transactionId} enviado exitosamente`);
  };

  // Handler cuando un pago individual falla
  const handlePaymentError = (transactionId: string, error: any) => {
    // Aquí podrías mostrar un toast de error, loggear, etc.
    console.error(`Error al enviar pago ${transactionId}:`, error);
  };

  // Handler cuando el envío en lote termina
  const handleBatchComplete = (results: { success: number; errors: number; duplicates: number }) => {
    alert(
      `Envío completado:\n` +
      `✓ Exitosos: ${results.success}\n` +
      `⚠ Duplicados: ${results.duplicates}\n` +
      `✗ Errores: ${results.errors}`
    );
    // Recargar transacciones para actualizar el estado
    window.location.reload();
  };

  // Filtrar solo transacciones no enviadas
  const pendingTransactions = transactions.filter(
    (tx) => !sentTransactions.has(tx.id)
  );

  // Calcular totales
  const totalAmount = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando transacciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pagos Semanales - Espacio Pisama
        </h1>
        <p className="text-gray-600">
          Envía los pagos de la semana a PisamaApp para que se concilien automáticamente con las facturas.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Total Pendientes</p>
          <p className="text-2xl font-bold text-blue-900">{pendingTransactions.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Monto Total</p>
          <p className="text-2xl font-bold text-green-900">
            ${totalAmount.toLocaleString('es-UY')}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 font-medium mb-1">Enviados</p>
          <p className="text-2xl font-bold text-gray-900">{sentTransactions.size}</p>
        </div>
      </div>

      {/* Botón de envío en lote */}
      {pendingTransactions.length > 0 && (
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Envío en Lote</h3>
          <p className="text-sm text-gray-600 mb-4">
            Envía todos los pagos pendientes ({pendingTransactions.length}) a PisamaApp de una sola vez.
          </p>
          <SendBatchToPisama
            transactions={pendingTransactions}
            onComplete={handleBatchComplete}
            buttonText={`Enviar ${pendingTransactions.length} pago(s) a Pisama`}
          />
        </div>
      )}

      {/* Tabla de transacciones */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Transacciones Pendientes
          </h2>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium">No hay pagos pendientes</p>
            <p className="text-sm mt-1">
              Todos los pagos de esta semana ya fueron enviados a PisamaApp
            </p>
          </div>
        ) : (
          <>
            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Transacción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('es-UY', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${transaction.amount.toLocaleString('es-UY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <SendToPisamaButton
                          transaction={transaction}
                          onSuccess={() => handlePaymentSuccess(transaction.id)}
                          onError={(error) => handlePaymentError(transaction.id, error)}
                          size="sm"
                          variant="primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="md:hidden divide-y divide-gray-200">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.fullName}</p>
                      <p className="text-sm text-gray-500">{transaction.email}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{transaction.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${transaction.amount.toLocaleString('es-UY')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('es-UY')}
                      </p>
                    </div>
                  </div>
                  <SendToPisamaButton
                    transaction={transaction}
                    onSuccess={() => handlePaymentSuccess(transaction.id)}
                    onError={(error) => handlePaymentError(transaction.id, error)}
                    size="sm"
                    variant="primary"
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Notas importantes */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">
          ℹ️ Notas Importantes
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>Solo se envían transacciones con categoría "Espacio Pisama (Pago)"</li>
          <li>Si una transacción ya fue enviada, se marcará como "Ya enviado" (duplicado)</li>
          <li>Los pagos se concilian automáticamente con las facturas en PisamaApp</li>
          <li>Los usuarios recibirán una notificación cuando se procese su pago</li>
        </ul>
      </div>
    </div>
  );
}
