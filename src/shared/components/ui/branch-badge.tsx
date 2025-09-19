import { cn } from '@shared/lib/cn'

interface BranchBadgeProps {
	branch: string
	className?: string
}

export function BranchBadge({ branch, className }: BranchBadgeProps) {
	const getBranchColor = (branchCode: string) => {
		switch (branchCode) {
			case 'STX':
				return 'bg-pink-600 text-white' // pink
			case 'PMG':
				return 'bg-purple-600 text-white' // purple
			case 'MCY':
				return 'bg-green-500 text-white' // green
			case 'CPC':
				return 'bg-yellow-500 text-white' // yellow
			case 'CNX':
				return 'bg-blue-500 text-white' // blue
			default:
				return 'bg-gray-200 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100'
		}
	}

	return (
		<div
			className={cn(
				'inline-flex w-fit items-center border border-gray-500/30 dark:border-gray-700/50 rounded-lg px-4 py-1 text-xs font-medium',
				getBranchColor(branch),
				className,
			)}
		>
			{branch}
		</div>
	)
}
