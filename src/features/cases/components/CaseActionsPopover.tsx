import React from 'react'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import {
	Eye,
	// FileText,
	FlaskConical,
} from 'lucide-react'
import {
	PopoverBody,
	PopoverButton,
	PopoverContent,
	PopoverRoot,
	PopoverTrigger,
} from '@shared/components/ui/PopoverInput'

interface CaseActionsPopoverProps {
	case_: MedicalCaseWithPatient
	onView: (case_: MedicalCaseWithPatient) => void
	// onGenerate: (case_: MedicalCaseWithPatient) => void
	onReactions?: (case_: MedicalCaseWithPatient) => void
	canRequest: boolean
}

const CaseActionsPopover: React.FC<CaseActionsPopoverProps> = ({
	case_,
	onView,
	// onGenerate,
	onReactions,
	canRequest,
}) => {
	const examType = case_.exam_type?.toLowerCase().trim() || ''
	const isRequestableCase = examType.includes('inmuno')

	return (
		<PopoverRoot>
			<PopoverTrigger className="px-3 py-1 text-xs">Acciones</PopoverTrigger>
			<PopoverContent className="w-30 h-auto">
				<PopoverBody className="p-1">
					<PopoverButton onClick={() => onView(case_)}>
						<Eye className="w-4 h-4" />
						<span>Ver</span>
					</PopoverButton>

					{/* <PopoverButton onClick={() => onGenerate(case_)}>
						<FileText className="w-4 h-4" />
						<span>Generar</span>
					</PopoverButton> */}

					{canRequest && isRequestableCase && onReactions && (
						<PopoverButton onClick={() => onReactions(case_)}>
							<FlaskConical className="w-4 h-4" />
							<span>Reacciones</span>
						</PopoverButton>
					)}
				</PopoverBody>
			</PopoverContent>
		</PopoverRoot>
	)
}

export default CaseActionsPopover
