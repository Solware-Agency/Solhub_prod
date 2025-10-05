/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/button'
import { Input } from '../components/input'
import { Send, User, Bot, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

const StandaloneChatPage = () => {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const navigate = useNavigate()

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const clearChat = () => {
		setMessages([])
		setInput('')
	}

	if (input.trim() === ':cls') {
		clearChat()
		return
	}

	const handleBackToDashboard = () => {
		navigate('/dashboard/home')
	}

	const sendMessage = async () => {
		if (!input.trim() || isLoading) return

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
		} catch (error: any) {
			if (error.name !== 'AbortError') {
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
		<div className="flex flex-col h-screen w-full bg-background">
			{/* Header con botón de regresar */}
			<div className="shrink-0 bg-card/50 backdrop-blur-sm border-b border-border/50 px-4 py-3">
				<div className="flex items-center gap-3 max-w-4xl mx-auto">
					{/* Botón de regresar */}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBackToDashboard}
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="w-4 h-4" />
						<span className="hidden sm:inline">Regresar al Panel</span>
						<span className="sm:hidden">Regresar</span>
					</Button>

					{/* Separador visual */}
					<div className="w-px h-6 bg-border"></div>

					{/* Título del chat */}
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-Conspat to-Conspat/80 flex items-center justify-center shadow-lg shadow-Conspat/20">
						<Sparkles className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-foreground">Chat IA</h1>
						<p className="text-sm text-muted-foreground">Tu asistente inteligente</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-8">
				<div className="max-w-4xl mx-auto">
					{messages.length === 0 && (
						<div className="text-center text-muted-foreground mt-32">
							<div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-Conspat/10 to-Conspat/5 flex items-center justify-center border border-Conspat/20">
								<MessageCircle className="w-8 h-8 text-Conspat" />
							</div>
							<h3 className="text-lg font-medium text-foreground mb-2">¡Hola! Soy tu asistente IA</h3>
							<p className="text-muted-foreground max-w-md mx-auto">
								¿En qué puedo ayudarte hoy? Puedes preguntarme cualquier cosa.
							</p>
						</div>
					)}

					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex gap-4 mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							{message.role === 'assistant' && (
								<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-Conspat to-Conspat/80 flex items-center justify-center text-white shadow-lg shadow-Conspat/20 shrink-0 mt-1">
									<Bot className="w-4 h-4" />
								</div>
							)}

							<div
								className={`max-w-[75%] rounded-2xl px-4 py-4 shadow-sm ${
									message.role === 'user'
										? 'bg-Conspat text-white shadow-Conspat/20'
										: 'bg-card border border-border/50 text-card-foreground'
								}`}
							>
								{message.role === 'assistant' ? (
									<div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
									</div>
								) : (
									<div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
								)}
								{message.isStreaming && <LoaderOne size="size-2" />}
							</div>

							{message.role === 'user' && (
								<div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground shadow-sm shrink-0 mt-1">
									<User className="w-4 h-4" />
								</div>
							)}
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Input */}
			<div className="shrink-0 bg-card/30 backdrop-blur-sm border-t border-border/50 p-4">
				<div className="max-w-4xl mx-auto">
					<div className="flex gap-3 items-end">
						<div className="flex-1">
							<Input
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder="Escribe tu mensaje..."
								disabled={isLoading}
								className="resize-none min-h-[44px] bg-background/80 border-border/50 focus:border-Conspat/50 focus:ring-Conspat/20 placeholder:text-muted-foreground/60"
							/>
						</div>
						<Button
							onClick={sendMessage}
							disabled={isLoading || !input.trim()}
							size="default"
							className="bg-Conspat hover:bg-Conspat/90 text-white shadow-lg shadow-Conspat/20 min-h-[44px] px-6"
						>
							<Send className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default StandaloneChatPage
