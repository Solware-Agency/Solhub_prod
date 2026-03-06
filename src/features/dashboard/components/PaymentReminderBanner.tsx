import React, { useMemo } from 'react'
import { AlertTriangle, Calendar, AlertCircle } from 'lucide-react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { cn } from '@shared/lib/cn'

/**
 * Banner de recordatorio de pago para owners.
 * Muestra: 15 días, 7 días, 1 día antes, "vence hoy", o "en retraso" (overdue).
 * Si el laboratorio está inactivo, muestra mensaje de bloqueo.
 */
export function PaymentReminderBanner() {
  const { laboratory } = useLaboratory()
  const { profile } = useUserProfile()

  const isOwner = profile?.role === 'owner' || profile?.role === 'prueba'
  if (!isOwner || !laboratory) return null

  const nextPaymentDate = laboratory.next_payment_date
  const paymentStatus = laboratory.payment_status
  const status = laboratory.status
  const billingAmount = laboratory.billing_amount

  const reminder = useMemo(() => {
    if (status === 'inactive') {
      return {
        type: 'inactive' as const,
        message: 'Tu laboratorio está inactivo por falta de pago. Contacta a soporte para reactivar el servicio.',
        variant: 'destructive' as const,
      }
    }

    if (!nextPaymentDate) return null

    const next = new Date(nextPaymentDate + 'T12:00:00Z')
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    next.setUTCHours(0, 0, 0, 0)
    const diffMs = next.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

    if (paymentStatus === 'overdue') {
      return {
        type: 'overdue' as const,
        message: 'Tu pago está en retraso. Tienes 24 horas para regularizar; después el laboratorio quedará inactivo.',
        variant: 'warning' as const,
      }
    }

    if (diffDays > 15) return null
    if (diffDays === 15) {
      return {
        type: '15_days' as const,
        message: `Faltan 15 días para tu próxima fecha de pago (${nextPaymentDate}).${billingAmount != null ? ` Monto: ${Number(billingAmount).toLocaleString('es')}` : ''}`,
        variant: 'info' as const,
      }
    }
    if (diffDays === 7) {
      return {
        type: '7_days' as const,
        message: `Falta 1 semana para tu próxima fecha de pago (${nextPaymentDate}).${billingAmount != null ? ` Monto: ${Number(billingAmount).toLocaleString('es')}` : ''}`,
        variant: 'info' as const,
      }
    }
    if (diffDays === 1) {
      return {
        type: '1_day' as const,
        message: `Tu fecha de pago es mañana (${nextPaymentDate}).${billingAmount != null ? ` Monto: ${Number(billingAmount).toLocaleString('es')}` : ''}`,
        variant: 'warning' as const,
      }
    }
    if (diffDays === 0) {
      return {
        type: 'due_today' as const,
        message: `Tu fecha de pago es hoy (${nextPaymentDate}). Tienes 24 horas para regularizar.${billingAmount != null ? ` Monto: ${Number(billingAmount).toLocaleString('es')}` : ''}`,
        variant: 'warning' as const,
      }
    }
    if (diffDays < 0) {
      return {
        type: 'overdue' as const,
        message: 'Tu pago está en retraso. Regulariza para no perder el acceso.',
        variant: 'warning' as const,
      }
    }

    if (diffDays <= 14 && diffDays >= 2) {
      return {
        type: 'soon' as const,
        message: `Faltan ${diffDays} días para tu próxima fecha de pago (${nextPaymentDate}).${billingAmount != null ? ` Monto: ${Number(billingAmount).toLocaleString('es')}` : ''}`,
        variant: 'info' as const,
      }
    }
    return null
  }, [status, nextPaymentDate, paymentStatus, billingAmount])

  if (!reminder) return null

  const isDestructive = reminder.variant === 'destructive'
  const isWarning = reminder.variant === 'warning'

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border p-4 flex items-start gap-3 shadow-sm',
        isDestructive && 'border-red-500/50 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100',
        isWarning && !isDestructive && 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100',
        !isDestructive && !isWarning && 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100'
      )}
      role="alert"
    >
      {reminder.type === 'inactive' ? (
        <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
      ) : isWarning ? (
        <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Calendar className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
      )}
      <p className="text-sm font-medium leading-relaxed">{reminder.message}</p>
    </div>
  )
}
