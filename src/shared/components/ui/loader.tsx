import { motion } from 'motion/react'

export const LoaderOne = ({ size }: { size?: string }) => {
	const transition = (x: number) => {
		return {
			duration: 1,
			repeat: Infinity,
			repeatType: 'loop' as const,
			delay: x * 0.2,
			ease: 'easeInOut' as const,
		}
	}
	return (
		<div className={`flex items-center gap-1 mb-2`}>
			<motion.div
				initial={{
					y: 0,
				}}
				animate={{
					y: [0, 10, 0],
				}}
				transition={transition(0)}
				className={`${size} rounded-full bg-[#b5b5b5] dark:bg-[#696969]`}
			/>
			<motion.div
				initial={{
					y: 0,
				}}
				animate={{
					y: [0, 10, 0],
				}}
				transition={transition(1)}
				className={`${size} rounded-full bg-[#b5b5b5] dark:bg-[#696969]`}
			/>
			<motion.div
				initial={{
					y: 0,
				}}
				animate={{
					y: [0, 10, 0],
				}}
				transition={transition(2)}
				className={`${size} rounded-full bg-[#b5b5b5] dark:bg-[#696969]`}
			/>
		</div>
	)
}
