import React from 'react'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import { User, MailCheck, Baby, Dog } from 'lucide-react'
import { BranchBadge } from '@shared/components/ui/branch-badge'
import CaseActionsPopover from './CaseActionsPopover'
import { getStatusColor } from './status'
import { formatCurrency } from '@shared/utils/number-utils'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase/config/config'

interface CaseCardProps {
	case_: MedicalCaseWithPatient
	onView: (case_: MedicalCaseWithPatient) => void
	onGenerate: (case_: MedicalCaseWithPatient) => void
	onReactions?: (case_: MedicalCaseWithPatient) => void
	onTriaje?: (case_: MedicalCaseWithPatient) => void
	canRequest: boolean
	userRole?: string
}

const CaseCard: React.FC<CaseCardProps> = ({ case_, onView, onGenerate, onReactions, onTriaje, canRequest, userRole }) => {
	const { laboratory } = useLaboratory()
	const isSpt = laboratory?.slug === 'spt'

	// Obtener tipo de paciente para mostrar badge si es menor o animal
	const { data: patientType } = useQuery({
		queryKey: ['patient-type', case_?.patient_id],
		queryFn: async () => {
			if (!case_?.patient_id) return null
			try {
				const { data: patient } = await supabase
					.from('patients')
					.select('tipo_paciente')
					.eq('id', case_.patient_id)
					.single()
				return (patient as any)?.tipo_paciente || null
			} catch (error) {
				console.error('Error obteniendo tipo de paciente:', error)
				return null
			}
		},
		enabled: !!case_?.patient_id,
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

	const isMenor = patientType === 'menor'
	const isAnimal = patientType === 'animal'
	
	return (
		<div className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md">
			{/* Menú de tres puntos en la esquina superior derecha */}
			<div className="absolute top-2 right-2 z-10">
				<CaseActionsPopover
					case_={case_}
					onView={onView}
					onGenerate={onGenerate}
					onReactions={onReactions}
					onTriaje={onTriaje}
					canRequest={canRequest}
					userRole={userRole}
					isSpt={isSpt}
				/>
			</div>

			<div className="flex flex-wrap gap-1.5 mb-1.5 pr-8">
				{/* Ocultar estado de pago para SPT */}
				{!isSpt && (
					<span
						className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(case_.payment_status)}`}
					>
						{case_.payment_status}
					</span>
				)}
				<div className="flex items-center">
					{case_.code && (
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
							{case_.code}
						</span>
					)}
				</div>
				{/* Badge para menores */}
				{isMenor && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
						<Baby className="w-3 h-3" />
						Menor
					</span>
				)}
				{/* Badge para animales */}
				{isAnimal && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
						<Dog className="w-3 h-3" />
						Animal
					</span>
				)}
				{case_.email_sent && (
					<span
						className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
						title="Email enviado"
					>
						<MailCheck className="w-3 h-3" />
						Enviado
					</span>
				)}
				{/* Ocultar estado "No enviado" para SPT */}
				{!case_.email_sent && !isSpt && (
					<span
						className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
						title="Email enviado"
					>
						<MailCheck className="w-3 h-3" />
						No enviado
					</span>
				)}
			</div>

			<div className="grid grid-cols-1 gap-1.5 mb-1.5">
				<div>
					<div className="flex items-center gap-2">
						<User className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
						<div className="min-w-0">
							<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{case_.nombre}</p>
						</div>
					</div>
				</div>

				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
					<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{case_.exam_type}</p>
				</div>
			</div>

			<div className={`grid ${isSpt ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 mb-1.5`}>
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Sede</p>
					<BranchBadge branch={case_.branch} className="text-xs" />
				</div>

				{!isSpt && (
					<div>
						<p className="text-xs text-gray-500 dark:text-gray-400">Monto</p>
						<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(case_.total_amount)}</p>
					</div>
				)}
			</div>
		</div>
	)
}

export default CaseCard
