import { lazy } from 'react'

/**
 * Utility para retry en lazy loading
 * Reintenta cargar un módulo si falla (útil para errores de red o chunks)
 */
const lazyRetry = (
  componentImport: () => Promise<any>,
  name: string,
  retries = 3,
  interval = 1000
) => {
  return new Promise<any>((resolve, reject) => {
    const attemptLoad = (attemptsLeft: number) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          console.warn(`⚠️ Failed to load ${name}, attempts left: ${attemptsLeft}`, error)
          
          if (attemptsLeft === 0) {
            reject(error)
            return
          }

          setTimeout(() => {
            attemptLoad(attemptsLeft - 1)
          }, interval)
        })
    }

    attemptLoad(retries)
  })
}

// Components that use heavy libraries - lazy loaded
export const PatientHistoryModal = lazy(() => 
  lazyRetry(
    () => import('@features/patients/components/PatientHistoryModal'),
    'PatientHistoryModal'
  )
)
export const UnifiedCaseModal = lazy(() => 
  lazyRetry(
    () => import('../../features/cases/components/UnifiedCaseModal'),
    'UnifiedCaseModal'
  )
)
export const RequestCaseModal = lazy(() => 
  lazyRetry(
    () => import('../../features/cases/components/RequestCaseModal'),
    'RequestCaseModal'
  )
)
export const StepsCaseModal = lazy(() => 
  lazyRetry(
    () => import('../../features/cases/components/StepsCaseModal'),
    'StepsCaseModal'
  )
)
export const StatDetailPanel = lazy(() => 
  lazyRetry(
    () => import('./ui/stat-detail-panel'),
    'StatDetailPanel'
  )
)
export const Changelog = lazy(() => 
  lazyRetry(
    () => import('@features/changelog/pages/ChangelogPage'),
    'Changelog'
  )
)

// Dashboard components that use heavy libraries
export const ExamTypePieChart = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/ExamTypePieChart'),
    'ExamTypePieChart'
  )
)
export const DoctorRevenueReport = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/DoctorRevenueReport'),
    'DoctorRevenueReport'
  )
)
export const OriginRevenueReport = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/OriginRevenueReport'),
    'OriginRevenueReport'
  )
)
export const RemainingAmount = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/RemainingAmount'),
    'RemainingAmount'
  )
)
export const ReactionsTable = lazy(() => 
  lazyRetry(
    () => import('@features/stats/components/ReactionsTable'),
    'ReactionsTable'
  )
)

// Form components that use heavy libraries
export const MedicalForm = lazy(() => 
  lazyRetry(
    () => import('@features/form/components/MedicalForm'),
    'MedicalForm'
  )
)
export const MedicalFormContainer = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/MedicalFormContainer').then((module) => ({ default: module.MedicalFormContainer })),
    'MedicalFormContainer'
  )
)
export const PaymentSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/PaymentSection').then((module) => ({ default: module.PaymentSection })),
    'PaymentSection'
  )
)
export const CommentsSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/CommentsSection').then((module) => ({ default: module.CommentsSection })),
    'CommentsSection'
  )
)
export const RecordsSection = lazy(() =>
  lazyRetry(
    () => import('@features/cases/components/RecordsSection').then((module) => ({ default: module.RecordsSection })),
    'RecordsSection'
  )
)
export const ServiceSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/ServiceSection').then((module) => ({ default: module.ServiceSection })),
    'ServiceSection'
  )
)
export const PatientDataSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/PatientDataSection').then((module) => ({ default: module.PatientDataSection })),
    'PatientDataSection'
  )
)

// Additional components that need lazy loading
export const DoctorsSection = lazy(() =>
  lazyRetry(
    () => import('@features/form/components/DoctorsSection').then((module) => ({ default: module.DoctorsSection })),
    'DoctorsSection'
  )
)
export const PatientsPage = lazy(() => 
  lazyRetry(
    () => import('@features/patients/pages/PatientsPage'),
    'PatientsPage'
  )
)
