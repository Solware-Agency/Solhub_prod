import React from 'react'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import { User, MailCheck } from 'lucide-react'
import { BranchBadge } from '@shared/components/ui/branch-badge'
import CaseActionsPopover from './CaseActionsPopover'
import { getStatusColor } from './status'
import { formatCurrency } from '@shared/utils/number-utils'
import { useLaboratory } from '@/app/providers/LaboratoryContext'

interface CaseCardProps {
	case_: MedicalCaseWithPatient
	onView: (case_: MedicalCaseWithPatient) => void
	onGenerate: (case_: MedicalCaseWithPatient) => void
	onReactions?: (case_: MedicalCaseWithPatient) => void
	onTriaje?: (case_: MedicalCaseWithPatient) => void
	canRequest: boolean
}

const CaseCard: React.FC<CaseCardProps> = ({ case_, onView, onGenerate, onReactions, onTriaje, canRequest }) => {
	const { laboratory } = useLaboratory()
	const isSpt = laboratory?.slug === 'spt'
	
	return (
		<div className="bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md">
			<div className="flex flex-wrap gap-1.5 mb-1.5">
				{/* Ocultar estado "Incompleto" para SPT */}
				{!(isSpt && case_.payment_status === 'Incompleto') && (
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

			<div className="flex justify-center mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
				<CaseActionsPopover
					case_={case_}
					onView={onView}
					onGenerate={onGenerate}
					onReactions={onReactions}
					onTriaje={onTriaje}
					canRequest={canRequest}
				/>
			</div>
		</div>
	)
}

export default CaseCard
