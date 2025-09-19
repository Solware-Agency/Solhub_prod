import { MedicalFormContainer } from './MedicalFormContainer'
import { forwardRef, useImperativeHandle } from 'react'

export interface MedicalFormRef {
	clearForm: () => void
}

const MedicalForm = forwardRef<MedicalFormRef>((_, ref) => {
	useImperativeHandle(
		ref,
		() => ({
			clearForm: () => {
				// Call the clear function in MedicalFormContainer
				// We'll use a custom event to communicate
				window.dispatchEvent(new CustomEvent('clearForm'))
			},
		}),
		[],
	)

	return <MedicalFormContainer />
})

export default MedicalForm