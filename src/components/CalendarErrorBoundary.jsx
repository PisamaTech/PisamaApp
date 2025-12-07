import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';

/**
 * Specialized error boundary for calendar components
 */
function CalendarErrorFallback({ error, resetError }) {
  return (
    <Card className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <Calendar className="w-16 h-16 text-gray-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Error al cargar el calendario
        </h2>
        <p className="text-gray-600">
          No pudimos cargar el calendario. Esto puede deberse a un problema de conexión
          o datos incorrectos.
        </p>
        {error?.message && (
          <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-100 p-2 rounded">
            {error.message}
          </p>
        )}
      </div>
      <Button onClick={resetError} className="flex items-center mx-auto">
        <RefreshCw className="w-4 h-4 mr-2" />
        Recargar calendario
      </Button>
    </Card>
  );
}

export function CalendarErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      name="CalendarErrorBoundary"
      fallback={CalendarErrorFallback}
      onError={(error) => {
        // Additional calendar-specific error handling
        console.error('Calendar error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default CalendarErrorBoundary;
