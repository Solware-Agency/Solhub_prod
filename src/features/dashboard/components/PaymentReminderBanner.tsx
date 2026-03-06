import React, { useMemo, useState, useEffect } from 'react'
import { AlertTriangle, Calendar, AlertCircle } from 'lucide-react'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useExchangeRateEuro } from '@shared/hooks/useExchangeRateEuro'
import { convertUSDtoVES } from '@shared/utils/number-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { cn } from '@shared/lib/cn'

const STORAGE_KEY = 'payment-reminder-modal-dismissed'

const DEFAULT_TIMEZONE = 'America/Caracas'

/** Diferencia en días naturales entre dos fechas YYYY-MM-DD (sin usar hora ni UTC). */
function calendarDayDiff(dateStrA: string, dateStrB: string): number {
  const [ya, ma, da] = dateStrA.split('-').map(Number)
  const [yb, mb, db] = dateStrB.split('-').map(Number)
  const ta = new Date(ya, ma - 1, da).getTime()
  const tb = new Date(yb, mb - 1, db).getTime()
  return Math.round((tb - ta) / (24 * 60 * 60 * 1000))
}

/**
 * Fecha "hoy" en la zona horaria del lab (YYYY-MM-DD) para que "vence hoy" sea correcto.
 */
function getTodayInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE })
  }
}

/**
 * Modal de recordatorio de pago para owners.
 * Muestra: 15 días, 7 días, 1 día antes, "vence hoy", o "en retraso" (overdue).
 * Monto en USD y en Bs con tasa del día (BCV/dolarapi). Centrado en pantalla.
 */
export function PaymentReminderBanner() {
  const { laboratory } = useLaboratory()
  const { profile } = useUserProfile()
  const { data: rateEuro, isLoading: isLoadingRate } = useExchangeRateEuro()
  const [open, setOpen] = useState(false)
  const [dismissedToday, setDismissedToday] = useState(false)

  const isOwner = profile?.role === 'owner' || profile?.role === 'prueba'
  if (!isOwner || !laboratory) return null

  const nextPaymentDate = laboratory.next_payment_date
  const paymentStatus = laboratory.payment_status
  const status = laboratory.status
  const billingAmount = laboratory.billing_amount ?? null
  const configRate = (laboratory.config as { defaultExchangeRate?: number })?.defaultExchangeRate ?? 0
  const exchangeRate = rateEuro && rateEuro > 0 ? rateEuro : configRate
  const amountVES = billingAmount != null && exchangeRate > 0 ? convertUSDtoVES(billingAmount, exchangeRate) : null

  const reminder = useMemo(() => {
    if (status === 'inactive') {
      return {
        type: 'inactive' as const,
        title: 'Sistema desactivado temporalmente',
        message: 'Tu laboratorio está inactivo por falta de pago. Contacta a soporte para reactivar el servicio.',
        variant: 'destructive' as const,
      }
    }

    if (!nextPaymentDate) return null

    const labTz = (laboratory.config as { timezone?: string })?.timezone ?? DEFAULT_TIMEZONE
    const todayInTz = getTodayInTimezone(labTz)
    const nextDateStr = nextPaymentDate.slice(0, 10)
    const diffDays = calendarDayDiff(todayInTz, nextDateStr)

    if (paymentStatus === 'overdue') {
      return {
        type: 'overdue' as const,
        title: 'Pago en retraso',
        message: 'Tu pago está en retraso. Tienes 24 horas para regularizar; después el laboratorio quedará inactivo.',
        variant: 'warning' as const,
      }
    }

    if (diffDays > 15) return null
    if (diffDays === 15) {
      return {
        type: '15_days' as const,
        title: 'Recordatorio de pago – 15 días',
        message: `Faltan 15 días para tu próxima fecha de pago (${nextPaymentDate}).`,
        variant: 'info' as const,
      }
    }
    if (diffDays === 7) {
      return {
        type: '7_days' as const,
        title: 'Recordatorio de pago – 1 semana',
        message: `Falta 1 semana para tu próxima fecha de pago (${nextPaymentDate}).`,
        variant: 'info' as const,
      }
    }
    if (diffDays === 1) {
      return {
        type: '1_day' as const,
        title: 'Mañana vence tu pago',
        message: `Tu fecha de pago es mañana (${nextPaymentDate}).`,
        variant: 'warning' as const,
      }
    }
    if (diffDays === 0) {
      return {
        type: 'due_today' as const,
        title: 'Tu pago vence hoy',
        message: `Tu fecha de pago es hoy (${nextPaymentDate}). Tienes 24 horas para regularizar.`,
        variant: 'warning' as const,
      }
    }
    if (diffDays < 0) {
      return {
        type: 'overdue' as const,
        title: 'Pago en retraso',
        message: 'Tu pago está en retraso. Regulariza para no perder el acceso.',
        variant: 'warning' as const,
      }
    }

    if (diffDays <= 14 && diffDays >= 2) {
      return {
        type: 'soon' as const,
        title: 'Recordatorio de pago',
        message: `Faltan ${diffDays} días para tu próxima fecha de pago (${nextPaymentDate}).`,
        variant: 'info' as const,
      }
    }
    return null
  }, [status, nextPaymentDate, paymentStatus, laboratory?.config])

  const wasDismissedToday = () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const { date } = JSON.parse(raw)
      return date === new Date().toDateString()
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!reminder) return
    setDismissedToday(wasDismissedToday())
  }, [reminder])

  useEffect(() => {
    if (reminder && !dismissedToday) setOpen(true)
  }, [reminder, dismissedToday])

  const handleClose = () => {
    setOpen(false)
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: new Date().toDateString() })
      )
    } catch {
      // ignore
    }
  }

  if (!reminder) return null

  const isDestructive = reminder.variant === 'destructive'
  const isWarning = reminder.variant === 'warning'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          'max-w-md sm:max-w-lg',
          isDestructive && 'border-red-500/50',
          isWarning && !isDestructive && 'border-amber-500/50',
          !isDestructive && !isWarning && 'border-blue-500/50'
        )}
        hideCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {reminder.type === 'inactive' ? (
              <AlertCircle className="h-10 w-10 shrink-0 text-red-600 dark:text-red-400" />
            ) : isWarning ? (
              <AlertTriangle className="h-10 w-10 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <Calendar className="h-10 w-10 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <DialogTitle
              className={cn(
                isDestructive && 'text-red-700 dark:text-red-300',
                isWarning && !isDestructive && 'text-amber-700 dark:text-amber-300',
                !isDestructive && !isWarning && 'text-blue-700 dark:text-blue-300'
              )}
            >
              {reminder.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{reminder.message}</p>
          {billingAmount != null && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-foreground">Monto a pagar</p>
              <p className="mt-1 text-lg font-semibold">
                {Number(billingAmount).toLocaleString('es')} USD
                {amountVES != null && exchangeRate > 0 && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    · {amountVES.toLocaleString('es')} Bs
                    {isLoadingRate ? ' (cargando tasa…)' : ` (tasa BCV euro ${exchangeRate.toLocaleString('es')} Bs/EUR)`}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
