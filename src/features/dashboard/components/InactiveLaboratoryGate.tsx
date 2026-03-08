import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'

/**
 * Cuando el laboratorio está inactivo (status === 'inactive'), muestra
 * una pantalla de bloqueo y no permite usar el sistema. Nadie puede usar el lab.
 */
export function InactiveLaboratoryGate({ children }: { children: React.ReactNode }) {
  const { laboratory, isLoading } = useLaboratory()

  if (isLoading || !laboratory) {
    return <>{children}</>
  }

  if (laboratory.status !== 'inactive') {
    return <>{children}</>
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-8 text-center shadow-lg">
        <AlertCircle className="h-16 w-16 mx-auto text-red-600 dark:text-red-400 mb-4" />
        <h1 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
          Sistema desactivado temporalmente
        </h1>
        <p className="text-red-800 dark:text-red-200">
          Tu administrador o dueño no ha pagado el sistema, por lo tanto ha sido desactivado
          temporalmente. Para reactivar el servicio, contacte al administrador o dueño del laboratorio.
        </p>
      </div>
    </div>
  )
}
