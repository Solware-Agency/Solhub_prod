import React, { useRef } from 'react'
import ExportSection from './ExportSection'
import ReactionsTable from '../components/ReactionsTable'
// import { Card } from '@shared/components/ui/card'

const ReportsPage: React.FC = () => {
	const reportRef = useRef<HTMLDivElement>(null)

	return (
		<div className="overflow-x-hidden max-w-full" ref={reportRef}>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reportes</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
					Genera y exporta reportes detallados del sistema médico
				</p>
			</div>
			{/* Export Section */}
			<ExportSection />
			<ReactionsTable />
		</div>
	)
}

export default ReportsPage
