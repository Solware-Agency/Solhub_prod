import { lazy } from 'react'

// Components that use heavy libraries - lazy loaded
export const PatientHistoryModal = lazy(() => import('@features/patients/components/PatientHistoryModal'))
export const UnifiedCaseModal = lazy(() => import('../../features/cases/components/UnifiedCaseModal'))
export const RequestCaseModal = lazy(() => import('../../features/cases/components/RequestCaseModal'))
export const StepsCaseModal = lazy(() => import('../../features/cases/components/StepsCaseModal'))
export const StatDetailPanel = lazy(() => import('./ui/stat-detail-panel'))
export const Changelog = lazy(() => import('@features/changelog/pages/ChangelogPage'))

// Dashboard components that use heavy libraries
export const ExamTypePieChart = lazy(() => import('@features/stats/components/ExamTypePieChart'))
export const DoctorRevenueReport = lazy(() => import('@features/stats/components/DoctorRevenueReport'))
export const OriginRevenueReport = lazy(() => import('@features/stats/components/OriginRevenueReport'))
export const RemainingAmount = lazy(() => import('@features/stats/components/RemainingAmount'))
export const ReactionsTable = lazy(() => import('@features/stats/components/ReactionsTable'))

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
	import('@features/cases/components/RecordsSection').then((module) => ({ default: module.RecordsSection })),
)
export const ServiceSection = lazy(() =>
	import('@features/form/components/ServiceSection').then((module) => ({ default: module.ServiceSection })),
)
export const PatientDataSection = lazy(() =>
	import('@features/form/components/PatientDataSection').then((module) => ({ default: module.PatientDataSection })),
)

// Additional components that need lazy loading
export const DoctorsSection = lazy(() =>
	import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
)
export const PatientsPage = lazy(() => import('@features/patients/pages/PatientsPage'))
