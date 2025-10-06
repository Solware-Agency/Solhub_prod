import { useState, useRef, useEffect } from 'react'
import { Input } from './input'
import { Button } from './button'
import { Send, User, Bot, MessageCircle } from 'lucide-react'
import { LoaderOne } from '@shared/components/ui/loader'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
	isStreaming?: boolean
}

function ChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}
	useEffect(() => {
		scrollToBottom()
	}, [messages])
	// Función secreta para limpiar el chat 😉
	const clearChat = () => {
		setMessages([])
		setInput('')
	}

	const sendMessage = async () => {
		if (!input.trim() || isLoading) return

		// Comando secreto para limpiar el chat
		if (input.trim() === ':cls') {
			clearChat()
			return
		}

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: input.trim(),
			timestamp: new Date(),
		}

		setMessages((prev) => [...prev, userMessage])
		setInput('')
		setIsLoading(true)

		// Crear mensaje del asistente que se irá actualizando
		const assistantMessage: Message = {
			id: crypto.randomUUID(),
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isStreaming: true,
		}

		setMessages((prev) => [...prev, assistantMessage])

		try {
			// Cancelar cualquier request anterior
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			abortControllerRef.current = new AbortController()

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							content: userMessage.content,
						},
					],
				}),
				signal: abortControllerRef.current.signal,
			})

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const reader = response.body?.getReader()
			const decoder = new TextDecoder()

			if (!reader) {
				throw new Error('No reader available')
			}

			let accumulatedContent = ''

			while (true) {
				const { done, value } = await reader.read()

				if (done) break

				const chunk = decoder.decode(value, { stream: true })
				const lines = chunk.split('\n')

				for (const line of lines) {
					if (line.startsWith('0:')) {
						try {
							const data = JSON.parse(line.slice(2))
							if (data.type === 'text-delta' && data.textDelta) {
								accumulatedContent += data.textDelta

								// Actualizar el mensaje del asistente y ocultar el indicador de carga cuando hay contenido
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent, isStreaming: false } : msg,
									),
								)
							}
						} catch (e) {
							console.warn('Error parsing line:', line, e)
						}
					} else if (line.startsWith('d:')) {
						// Streaming terminado
						setMessages((prev) =>
							prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, isStreaming: false } : msg)),
						)
					}
				}
			}
		} catch (error: unknown) {
			if ((error as Error).name !== 'AbortError') {
				console.error('Error sending message:', error)
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === assistantMessage.id
							? {
									...msg,
									content: 'Error: No se pudo obtener respuesta del asistente',
									isStreaming: false,
							  }
							: msg,
					),
				)
			}
		} finally {
			setIsLoading(false)
			abortControllerRef.current = null
		}
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	return (
		<>
			{/* Overlay para cerrar al hacer clic fuera */}
			{isOpen && <div className="fixed inset-0 z-40" onClick={onClose} />}

			{/* Modal */}
			<div
				className={`fixed bottom-4 right-4 w-96 h-[580px] bg-background border rounded-lg shadow-2xl z-50 flex flex-col transition-[translate,opacity,scale] duration-500 ease-in-out ${
					!isOpen
						? 'translate-x-[500px] translate-y-[600px] opacity-0 scale-75 pointer-events-none'
						: 'translate-x-0 translate-y-0 opacity-100 scale-100'
				}`}
			>
				{/* Header */}
				<header className="flex items-center justify-between p-4 border-b">
					<h1 className="text-lg font-bold">SolPat IA</h1>
					<button
						onClick={onClose}
						className="text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm border px-2 py-1 rounded-md"
					>
						✕
					</button>
				</header>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto p-4 space-y-6">
					{messages.length === 0 && (
						<div className="text-center text-muted-foreground mt-16">
							<div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-Conspat/10 to-Conspat/5 flex items-center justify-center border border-Conspat/20">
								<MessageCircle className="w-6 h-6 text-Conspat" />
							</div>
							<h3 className="text-sm font-medium text-foreground mb-1">¡Hola! Soy tu asistente IA</h3>
							<p className="text-xs text-muted-foreground">¿En qué puedo ayudarte hoy?</p>
						</div>
					)}

					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex gap-3 mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							{message.role === 'assistant' && (
								<div className="w-6 h-6 rounded-lg bg-gradient-to-br from-Conspat to-Conspat/80 flex items-center justify-center text-white shadow-sm shrink-0 mt-1">
									<Bot className="w-3 h-3" />
								</div>
							)}

							<div
								className={`max-w-[80%] rounded-xl px-3 py-3 text-xs ${
									message.role === 'user'
										? 'bg-Conspat text-white shadow-sm'
										: 'bg-card border border-border/50 text-card-foreground'
								}`}
							>
								{message.role === 'assistant' ? (
									<div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-li:text-foreground">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
									</div>
								) : (
									message.content
								)}
								{message.isStreaming && <LoaderOne size="size-2" />}
							</div>

							{message.role === 'user' && (
								<div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shadow-sm shrink-0 mt-1">
									<User className="w-3 h-3" />
								</div>
							)}
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>

				{/* Input */}
				<div className="border-t p-3">
					<div className="flex gap-2">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Escribe tu mensaje..."
							disabled={isLoading}
							className="flex-1 text-sm"
						/>
						<Button
							onClick={sendMessage}
							disabled={isLoading || !input.trim()}
							size="sm"
							className="bg-Conspat hover:bg-Conspat/90 text-white shadow-sm"
						>
							<Send className="w-3 h-3" />
						</Button>
					</div>
				</div>
			</div>
		</>
	)
}

export default ChatModal
