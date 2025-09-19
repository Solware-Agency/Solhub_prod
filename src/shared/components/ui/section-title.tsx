import React from 'react'

interface SectionTitleProps {
	children: React.ReactNode
	className?: string
	underlineClassName?: string
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ 
	children, 
	className = "text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100",
	underlineClassName = "w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"
}) => {
	return (
		<div>
			<h2 className={className}>
				{children}
			</h2>
			<div className={underlineClassName} />
		</div>
	)
} 