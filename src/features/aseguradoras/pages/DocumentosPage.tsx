import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@shared/components/ui/card'
import { getPolizas } from '@services/supabase/aseguradoras/polizas-service'
import { getPagosPoliza } from '@services/supabase/aseguradoras/pagos-poliza-service'

const DocumentosPage = () => {
	const { data: polizasData } = useQuery({
		queryKey: ['polizas-documentos'],
		queryFn: () => getPolizas(1, 200),
		staleTime: 1000 * 60 * 5,
	})

	const { data: pagosData } = useQuery({
		queryKey: ['pagos-documentos'],
		queryFn: () => getPagosPoliza(1, 100),
		staleTime: 1000 * 60 * 5,
	})

	const polizas = useMemo(() => polizasData?.data ?? [], [polizasData])
	const pagos = useMemo(() => pagosData?.data ?? [], [pagosData])

	return (
		<div>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold">Documentos</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
			</div>

			<Card className="p-4 mb-6">
				<h2 className="text-lg font-semibold mb-3">Pólizas</h2>
				{polizas.length === 0 && <p className="text-sm text-gray-500">No hay documentos de pólizas.</p>}
				<div className="space-y-3">
					{polizas
						.filter((p) => !!p.pdf_url)
						.map((row) => (
							<div key={row.id} className="flex items-center justify-between border rounded-md p-3">
								<div>
									<p className="font-medium">{row.numero_poliza}</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{row.asegurado?.full_name || 'Asegurado'}
									</p>
								</div>
								<a className="text-sm text-primary underline" href={row.pdf_url || '#'} target="_blank" rel="noreferrer">
									Ver PDF
								</a>
							</div>
						))}
				</div>
			</Card>

			<Card className="p-4">
				<h2 className="text-lg font-semibold mb-3">Recibos de pago</h2>
				{pagos.length === 0 && <p className="text-sm text-gray-500">No hay documentos de pagos.</p>}
				<div className="space-y-3">
					{pagos
						.filter((p) => !!p.documento_pago_url)
						.map((row) => (
							<div key={row.id} className="flex items-center justify-between border rounded-md p-3">
								<div>
									<p className="font-medium">
										{row.poliza?.numero_poliza || 'Póliza'} · {row.monto}
									</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">{row.fecha_pago}</p>
								</div>
								<a
									className="text-sm text-primary underline"
									href={row.documento_pago_url || '#'}
									target="_blank"
									rel="noreferrer"
								>
									Ver recibo
								</a>
							</div>
						))}
				</div>
			</Card>
		</div>
	)
}

export default DocumentosPage
