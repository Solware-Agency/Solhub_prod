import { useState } from 'react'
import { Bot } from 'lucide-react'
import ChatModal from './ChatModal'

function ChatButton() {
	const [isOpen, setIsOpen] = useState(false)

	const openModal = () => {
		setIsOpen(true)
	}

	const closeModal = () => {
		setIsOpen(false)
	}

	return (
		<>
			{!isOpen && (
				<button
					onClick={openModal}
					className="flex items-center justify-center fixed bottom-4 right-4 bg-background border p-3 z-100 rounded-lg cursor-pointer shadow-lg hover:shadow-xl group"
				>
					<Bot className="size-6 group-hover:rotate-12 group-hover:scale-110 group-hover:text-Conspat transition-all duration-200" />
				</button>
			)}
			<ChatModal isOpen={isOpen} onClose={closeModal} />
		</>
	)
}

export default ChatButton
