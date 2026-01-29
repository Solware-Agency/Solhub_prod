import { useState } from 'react';
import { Button } from '@shared/components/ui/button';
import { Card } from '@shared/components/ui/card';
import { AlertTriangle, Bomb } from 'lucide-react';

/**
 * Componente de prueba para el Error Boundary
 * Solo para desarrollo - permite simular errores de chunk loading
 */
export const ErrorBoundaryTest = () => {
  const [shouldError, setShouldError] = useState(false);

  const triggerChunkError = () => {
    // Simular un error de chunk loading
    setShouldError(true);
  };

  if (shouldError) {
    // Lanzar un error que simula un chunk load error
    throw new Error('Loading chunk 123 failed. (error: https://example.com/chunk-123.js)');
  }

  return (
    <div className="p-6">
      <Card className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
          <h2 className="text-2xl font-bold">Prueba de Error Boundary</h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Este componente te permite probar el Error Boundary y ver cómo se ve la pantalla 
            después de que fallan los 3 reintentos automáticos.
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Nota:</strong> Al hacer clic en el botón, se simulará un error de carga de chunk.
              El Error Boundary intentará recuperarse 3 veces automáticamente y luego mostrará 
              la pantalla de error.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">¿Qué verás?</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Pantalla de "Reintentando cargar..." (aparecerá brevemente)</li>
              <li>Después de los 3 intentos, verás la pantalla de error completa</li>
              <li>Tendrás opciones para "Recargar página" o "Ir al inicio"</li>
            </ol>
          </div>

          <Button
            onClick={triggerChunkError}
            className="w-full flex items-center justify-center gap-2"
            variant="destructive"
          >
            <Bomb className="w-4 h-4" />
            Simular Error de Chunk Loading
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Para volver a la normalidad después del error, haz clic en "Ir al inicio"
          </p>
        </div>
      </Card>
    </div>
  );
};
