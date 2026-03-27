import React, { useEffect, useRef, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { FileText, Upload, X } from 'lucide-react'
import { updatePoliza, getNextPaymentDateOnMarkPaidPoliza, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { createPagoPoliza } from '@services/supabase/aseguradoras/pagos-poliza-service'
import { uploadReciboPago, validateReciboFile } from '@services/supabase/storage/pagos-poliza-recibos-service'
import { sendPolizaPaymentEmail } from '@services/supabase/aseguradoras/polizas-payment-email-service'

const METODOS_PAGO = [
	{ value: 'Zelle', label: 'Zelle' },
	{ value: 'Zinli', label: 'Zinli' },
	{ value: 'Transferencia internacional', label: 'Transferencia internacional' },
	{ value: 'Transferencia nacional', label: 'Transferencia nacional' },
	{ value: 'Efectivo', label: 'Efectivo' },
] as const

const PERIODOS_OPCIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const formatDateForDisplay = (dateStr: string) => {
	const d = new Date(dateStr + 'T12:00:00')
	return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface RegistrarPagoPolizaDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	poliza: Poliza | null
	onRegistered?: (payload: { nextPaymentDate: string | null }) => void
}

async function invalidatePolizaPaymentQueries(queryClient: QueryClient, poliza: Poliza) {
	const id = poliza.id
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: ['pagos-by-poliza', id] }),
		queryClient.invalidateQueries({ queryKey: ['pagos-poliza'] }),
		queryClient.invalidateQueries({ queryKey: ['polizas-pagos'] }),
		queryClient.invalidateQueries({ queryKey: ['polizas'] }),
		queryClient.invalidateQueries({ queryKey: ['aseguradoras-stats'] }),
		queryClient.invalidateQueries({ queryKey: ['poliza', id] }),
		queryClient.invalidateQueries({ queryKey: ['poliza-detail-changelog', id] }),
		queryClient.invalidateQueries({ queryKey: ['polizas-by-asegurado', poliza.asegurado_id] }),
		queryClient.invalidateQueries({ queryKey: ['polizas-by-aseguradora', poliza.aseguradora_id] }),
	])
}

export const RegistrarPagoPolizaDialog: React.FC<RegistrarPagoPolizaDialogProps> = ({
	open,
	onOpenChange,
	poliza,
	onRegistered,
}) => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [form, setForm] = useState({
		fecha_pago: '',
		monto: '',
		metodo_pago: '',
		referencia: '',
		documento_pago_url: '',
		notas: '',
		periodosAPagar: 1,
	})
	const [saving, setSaving] = useState(false)
	const [uploadingRecibo, setUploadingRecibo] = useState(false)
	const [reciboFileName, setReciboFileName] = useState<string | null>(null)
	const [nextPaymentDateAlert, setNextPaymentDateAlert] = useState<string | null>(null)

	useEffect(() => {
		if (!open || !poliza) return
		setForm({
			fecha_pago: new Date().toLocaleDateString('en-CA'),
			monto: '',
			metodo_pago: '',
			referencia: '',
			documento_pago_url: '',
			notas: '',
			periodosAPagar: 1,
		})
		setReciboFileName(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
		setNextPaymentDateAlert(null)
	}, [open, poliza?.id])

	const handleReciboFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !poliza) return
		const validation = validateReciboFile(file)
		if (!validation.valid) {
			toast({ title: 'Archivo inválido', description: validation.error, variant: 'destructive' })
			return
		}
		setUploadingRecibo(true)
		try {
			const { data, error } = await uploadReciboPago(file, poliza.id)
			if (error) throw error
			if (data) {
				setForm((prev) => ({ ...prev, documento_pago_url: data }))
				setReciboFileName(file.name)
				toast({ title: 'Archivo adjuntado' })
			}
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al subir archivo', variant: 'destructive' })
		} finally {
			setUploadingRecibo(false)
			if (fileInputRef.current) fileInputRef.current.value = ''
		}
	}

	const handleRemoveRecibo = () => {
		setForm((prev) => ({ ...prev, documento_pago_url: '' }))
		setReciboFileName(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleSave = async () => {
		if (!poliza) return
		const periodos = Math.max(1, Math.min(12, Number(form.periodosAPagar) || 1))
		if (!form.fecha_pago || !form.monto) {
			toast({ title: 'Completa fecha y monto', variant: 'destructive' })
			return
		}
		setSaving(true)
		let nextDate: string | null = null
		try {
			await createPagoPoliza({
				poliza_id: poliza.id,
				fecha_pago: form.fecha_pago,
				monto: Number(form.monto),
				metodo_pago: form.metodo_pago || null,
				referencia: form.referencia || null,
				documento_pago_url: form.documento_pago_url || null,
				notas: form.notas || null,
			})

			for (let i = 0; i < periodos; i++) {
				nextDate = await getNextPaymentDateOnMarkPaidPoliza(poliza.id)
				if (!nextDate) break
				await updatePoliza(poliza.id, {
					next_payment_date: nextDate,
					payment_status: 'current',
					fecha_prox_vencimiento: nextDate,
					estatus_pago: 'Pagado',
				})
			}

			await invalidatePolizaPaymentQueries(queryClient, poliza)

			const emailResult = await sendPolizaPaymentEmail({
				poliza_id: poliza.id,
				fecha_pago: form.fecha_pago,
				monto: Number(form.monto),
				metodo_pago: form.metodo_pago || null,
				referencia: form.referencia || null,
				notas: form.notas || null,
				documento_pago_url: form.documento_pago_url || null,
				attachment_filename: reciboFileName || null,
			})

			if (emailResult.success && !emailResult.emailSent && emailResult.reason === 'no_email') {
				toast({
					title: 'Pago registrado',
					description: emailResult.message,
					variant: 'destructive',
				})
			} else if (emailResult.success && emailResult.emailSent) {
				const who =
					emailResult.recipients && emailResult.recipients.length > 0
						? ` Enviado a: ${emailResult.recipients.join(', ')}.`
						: ''
				toast({ title: 'Pago registrado', description: `Se envió el comprobante por correo.${who}` })
			} else if (!emailResult.success) {
				toast({
					title: 'Pago registrado',
					description: `El pago quedó guardado, pero el correo falló: ${emailResult.error}`,
					variant: 'destructive',
				})
			} else {
				toast({ title: 'Pago registrado' })
			}

			onOpenChange(false)
			onRegistered?.({ nextPaymentDate: nextDate })
			if (nextDate) setNextPaymentDateAlert(nextDate)
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al registrar pago', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	const effectiveOpen = open && !!poliza

	return (
		<>
			<Dialog open={effectiveOpen} onOpenChange={onOpenChange}>
				<DialogContent
					className="max-w-lg bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader>
						<DialogTitle>
							Registrar pago
							{poliza?.numero_poliza ? (
								<span className="block text-sm font-normal text-muted-foreground mt-1">{poliza.numero_poliza}</span>
							) : null}
						</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Fecha</Label>
							<Input type="date" value={form.fecha_pago} onChange={(e) => setForm((prev) => ({ ...prev, fecha_pago: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Monto</Label>
							<Input
								type="number"
								placeholder="Ej. 150"
								value={form.monto}
								onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Periodos a pagar</Label>
							<Select value={String(form.periodosAPagar)} onValueChange={(v) => setForm((prev) => ({ ...prev, periodosAPagar: Number(v) || 1 }))}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PERIODOS_OPCIONES.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n} {n === 1 ? 'período' : 'períodos'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Cada período avanza la próxima fecha (ej. 1 mes). Si eliges 2, se sumarán 2 períodos.
							</p>
						</div>
						<div className="space-y-2">
							<Label>Método</Label>
							<Select value={form.metodo_pago || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, metodo_pago: value }))}>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione método" />
								</SelectTrigger>
								<SelectContent>
									{METODOS_PAGO.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Referencia</Label>
							<Input placeholder="Ej. REF-001" value={form.referencia} onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.target.value }))} />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Adjuntar comprobante</Label>
							<input ref={fileInputRef} type="file" onChange={handleReciboFileChange} className="hidden" />
							{form.documento_pago_url ? (
								<div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
									<FileText className="h-5 w-5 text-primary shrink-0" />
									<span className="text-sm truncate flex-1">{reciboFileName || 'Archivo adjunto'}</span>
									<Button type="button" variant="ghost" size="sm" onClick={handleRemoveRecibo} disabled={uploadingRecibo} className="shrink-0">
										<X className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingRecibo || !poliza}>
									{uploadingRecibo ? (
										'Subiendo...'
									) : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											Cualquier archivo (máx. 25 MB)
										</>
									)}
								</Button>
							)}
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Notas</Label>
							<Input placeholder="Opcional" value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} />
						</div>
					</div>
					<DialogFooter className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? 'Guardando...' : 'Guardar pago'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!nextPaymentDateAlert} onOpenChange={(o) => !o && setNextPaymentDateAlert(null)}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Pago registrado</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						La <strong>próxima fecha de pago</strong> de esta póliza será:{' '}
						<strong className="text-primary">{nextPaymentDateAlert ? formatDateForDisplay(nextPaymentDateAlert) : ''}</strong>.
					</p>
					<p className="text-xs text-gray-500 mt-2">Si marcas como pagado otra vez por error, se sumará otro período a la próxima fecha.</p>
					<DialogFooter>
						<Button onClick={() => setNextPaymentDateAlert(null)}>Entendido</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
