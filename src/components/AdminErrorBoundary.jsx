import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Specialized error boundary for admin routes
 */
function AdminErrorFallback({ error, resetError }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center space-y-4">
        <div className="flex justify-center">
          <Shield className="w-16 h-16 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error en el panel de administración
          </h2>
          <p className="text-gray-600">
            Ocurrió un error al cargar esta sección administrativa. Por favor, intenta
            nuevamente o contacta al equipo técnico.
          </p>
          {error?.message && (
            <p className="text-sm text-gray-500 mt-3 font-mono bg-gray-100 p-3 rounded">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex space-x-3 justify-center pt-2">
          <Button onClick={resetError} variant="default" className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function AdminErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      name="AdminErrorBoundary"
      fallback={AdminErrorFallback}
      onError={(error, errorInfo) => {
        // Log admin errors with high priority
        console.error('Admin panel error:', error, errorInfo);
        // Could send to admin-specific monitoring
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default AdminErrorBoundary;
