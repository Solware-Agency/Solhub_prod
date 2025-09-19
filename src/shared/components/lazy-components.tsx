import { lazy } from 'react'

// Components that use heavy libraries - lazy loaded
export const PatientHistoryModal = lazy(() => import('./patients/PatientHistoryModal'))
export const UnifiedCaseModal = lazy(() => import('./cases/UnifiedCaseModal'))
// export const CaseDetailPanel = lazy(() => import('./cases/CaseDetailPanel'))
export const RequestCaseModal = lazy(() => import('./cases/RequestCaseModal'))
export const StepsCaseModal = lazy(() => import('./cases/StepsCaseModal'))
export const StatDetailPanel = lazy(() => import('./ui/stat-detail-panel'))
export const Changelog = lazy(() => import('@features/dashboard/changelog/ChangelogPage'))

// Dashboard components that use heavy libraries
export const ExamTypePieChart = lazy(() => import('@features/dashboard/components/ExamTypePieChart'))
export const DoctorRevenueReport = lazy(() => import('@features/dashboard/components/DoctorRevenueReport'))
export const OriginRevenueReport = lazy(() => import('@features/dashboard/components/OriginRevenueReport'))
export const RemainingAmount = lazy(() => import('@features/dashboard/components/RemainingAmount'))
export const ReactionsTable = lazy(() => import('@features/dashboard/components/ReactionsTable'))

// Form components that use heavy libraries
export const MedicalForm = lazy(() => import('@features/form/components/MedicalForm'))
export const MedicalFormContainer = lazy(() =>
	import('@features/form/components/MedicalFormContainer').then((module) => ({ default: module.MedicalFormContainer })),
)
export const PaymentSection = lazy(() =>
	import('@features/form/components/PaymentSection').then((module) => ({ default: module.PaymentSection })),
)
export const CommentsSection = lazy(() =>
	import('@features/form/components/CommentsSection').then((module) => ({ default: module.CommentsSection })),
)
export const RecordsSection = lazy(() =>
	import('@features/form/components/RecordsSection').then((module) => ({ default: module.RecordsSection })),
)
export const ServiceSection = lazy(() =>
	import('@features/form/components/ServiceSection').then((module) => ({ default: module.ServiceSection })),
)
export const SettingsSection = lazy(() =>
	import('@features/form/components/SettingsSection').then((module) => ({ default: module.SettingsSection })),
)
export const PatientDataSection = lazy(() =>
	import('@features/form/components/PatientDataSection').then((module) => ({ default: module.PatientDataSection })),
)

// Additional components that need lazy loading
export const DoctorsSection = lazy(() =>
	import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
)
export const PatientsPage = lazy(() => import('@features/dashboard/patients/PatientsPage'))
