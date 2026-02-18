import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@shared/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary para capturar errores de lazy loading y otros errores de React
 * Implementa retry logic automático para resolver problemas de carga de chunks
 */
export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 segundo

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Actualizar el estado para que el siguiente renderizado muestre la UI de respaldo
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Si es un error de carga de chunk, intentar retry automático
    if (this.isChunkLoadError(error) && this.state.retryCount < this.maxRetries) {
      console.log(`🔄 Retrying chunk load (attempt ${this.state.retryCount + 1}/${this.maxRetries})...`);
      
      setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1,
        }));
      }, this.retryDelay * (this.state.retryCount + 1)); // Backoff exponencial
    }
  }

  private readonly chunkReloadStorageKey = 'ErrorBoundaryChunkReloadAttempted';

  /**
   * Detectar si el error es de carga de chunk (lazy loading)
   * Incluye patrones de Webpack y Vite/Rollup (dynamic import)
   */
  private isChunkLoadError(error: Error): boolean {
    const chunkLoadErrors = [
      'Loading chunk',
      'Failed to fetch',
      'ChunkLoadError',
      'Loading CSS chunk',
      'NetworkError',
      'dynamically imported module',
      'Failed to fetch dynamically imported module',
      'Importing a module script failed',
      'error loading dynamically imported module',
      'Loading module failed',
      'Network request failed',
    ];

    const raw = `${error.message ?? ''} ${error.name ?? ''}`.toLowerCase();
    return chunkLoadErrors.some(msg => raw.includes(msg.toLowerCase()));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma requerida por React
  componentDidUpdate(_prevProps: Props, _prevState: State) {
    // Un último intento con recarga completa cuando es error de chunk y se agotaron los reintentos
    if (
      this.state.hasError &&
      this.state.retryCount >= this.maxRetries &&
      this.state.error &&
      this.isChunkLoadError(this.state.error) &&
      !sessionStorage.getItem(this.chunkReloadStorageKey)
    ) {
      sessionStorage.setItem(this.chunkReloadStorageKey, '1');
      window.location.reload();
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(this.chunkReloadStorageKey);
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Si ya se intentó retry automático sin éxito, mostrar UI de error
      if (this.state.retryCount >= this.maxRetries || !this.isChunkLoadError(this.state.error!)) {
        const isChunkError = this.state.error && this.isChunkLoadError(this.state.error);
        const willAutoReload =
          isChunkError &&
          this.state.retryCount >= this.maxRetries &&
          !sessionStorage.getItem(this.chunkReloadStorageKey);

        if (willAutoReload) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Recargando para obtener la versión más reciente...</p>
            </div>
          );
        }

        if (this.props.fallback) {
          return this.props.fallback;
        }

        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-8 h-8" />
                <h2 className="text-xl font-bold">
                  {isChunkError ? 'Error al cargar la página' : 'Algo salió mal'}
                </h2>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  Ha ocurrido un error inesperado. Si acabas de actualizar la aplicación o tienes la
                  pestaña abierta desde hace tiempo, recarga la página (F5 o el botón inferior). Si
                  sigue fallando, prueba en otra pestaña o borrar la caché del navegador.
                </p>
                
                {this.state.retryCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Intentos de recuperación: {this.state.retryCount}
                  </p>
                )}

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    <summary className="cursor-pointer font-semibold mb-2">
                      Detalles del error (solo en desarrollo)
                    </summary>
                    <pre className="whitespace-pre-wrap wrap-break-words">
                      {this.state.error.toString()}
                      {this.state.errorInfo && (
                        <>
                          {'\n\n'}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar página
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  Ir al inicio
                </Button>
              </div>
            </div>
          </div>
        );
      }

      // Mostrar loading mientras se reintenta
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Reintentando cargar... ({this.state.retryCount}/{this.maxRetries})
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
