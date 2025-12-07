import React from 'react';
import { logger } from '@/services/logger';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Base Error Boundary component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our logging service
    logger.error('Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      boundary: this.props.name || 'UnnamedBoundary',
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset,
        });
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.handleReset}
          showDetails={this.props.showDetails !== false}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback UI
 */
function ErrorFallback({ error, errorInfo, resetError, showDetails = true }) {
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.MODE === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-2xl w-full p-6 space-y-6">
        {/* Icon and Title */}
        <div className="flex items-center space-x-3 text-red-600">
          <AlertTriangle className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Algo salió mal</h1>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <p className="text-gray-700">
            Lo sentimos, ha ocurrido un error inesperado. Nuestro equipo ha sido
            notificado y trabajaremos para solucionarlo.
          </p>
          {error && showDetails && (
            <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded font-mono">
              {error.message || 'Error desconocido'}
            </p>
          )}
        </div>

        {/* Stack trace (development only) */}
        {isDevelopment && errorInfo && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
              Detalles técnicos (solo en desarrollo)
            </summary>
            <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-64">
              <p className="font-mono whitespace-pre-wrap">{error?.stack}</p>
              <p className="font-mono whitespace-pre-wrap mt-4">
                {errorInfo.componentStack}
              </p>
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Button onClick={resetError} variant="default" className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Ir al inicio
          </Button>
        </div>

        {/* Support info */}
        <div className="text-sm text-gray-500 pt-4 border-t">
          <p>
            Si el problema persiste, contacta a soporte en{' '}
            <a href="mailto:soporte@pisama.com" className="text-blue-600 hover:underline">
              soporte@pisama.com
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}

/**
 * Higher-order component to wrap components with error boundary
 * @param {React.Component} Component - Component to wrap
 * @param {object} options - Error boundary options
 */
export function withErrorBoundary(Component, options = {}) {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default ErrorBoundary;
