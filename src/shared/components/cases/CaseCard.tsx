import React from 'react'
import type { MedicalCaseWithPatient } from '@lib/medical-cases-service'
import { User } from 'lucide-react'
import { BranchBadge } from '@shared/components/ui/branch-badge'
import CaseActionsPopover from './CaseActionsPopover'
import { getStatusColor } from './status'
import { formatCurrency } from '@shared/utils/number-utils'

interface CaseCardProps {
	case_: MedicalCaseWithPatient
	onView: (case_: MedicalCaseWithPatient) => void
	onGenerate: (case_: MedicalCaseWithPatient) => void
	onReactions?: (case_: MedicalCaseWithPatient) => void
	canRequest: boolean
}

const CaseCard: React.FC<CaseCardProps> = ({ case_, onView, onGenerate, onReactions, canRequest }) => {
	return (
		<div className="bg-white dark:bg-background rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md">
			<div className="flex flex-wrap gap-1.5 mb-2">
				<span
					className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(case_.payment_status)}`}
				>
					{case_.payment_status}
				</span>
				<div className="flex items-center">
					{case_.code && (
						<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
							{case_.code}
						</span>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 mb-2">
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

			<div className="grid grid-cols-2 gap-2 mb-2">
				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Sede</p>
					<BranchBadge branch={case_.branch} className="text-xs" />
				</div>

				<div>
					<p className="text-xs text-gray-500 dark:text-gray-400">Monto</p>
					<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(case_.total_amount)}</p>
				</div>
			</div>

			<div className="flex justify-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
				<CaseActionsPopover
					case_={case_}
					onView={onView}
					onGenerate={onGenerate}
					onReactions={onReactions}
					canRequest={canRequest}
				/>
			</div>
		</div>
	)
}

export default CaseCard
