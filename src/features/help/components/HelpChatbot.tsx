import { useState, useEffect, useRef } from 'react'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { 
  getBotDecisionTree, 
  handleBotResponse, 
  handleOptionClick,
  type Message,
  type UserRole 
} from '@services/chatbot/chatbot-tree'
import { HelpCircle, Send } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

export const HelpChatbot = () => {
  const { profile } = useUserProfile()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Inicializar chat con mensaje de bienvenida
  useEffect(() => {
    if (profile?.role) {
      const decisionTree = getBotDecisionTree(profile.role as UserRole)
      setMessages([decisionTree.initialMessage])
    }
  }, [profile?.role])

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleOptionButtonClick = (option: string) => {
    if (!profile?.role) return

    // Agregar mensaje del usuario
    const userMessage = handleOptionClick(option, messages.length, profile.role as UserRole)
    if (userMessage) {
      setMessages(prev => [...prev, userMessage])
    }

    // Obtener y agregar respuesta del bot
    const botMessage = handleBotResponse(option, messages.length, profile.role as UserRole)
    setMessages(prev => [...prev, botMessage])
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || !profile?.role) return

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Obtener y agregar respuesta del bot
    const botMessage = handleBotResponse(inputValue, messages.length, profile.role as UserRole)
    setMessages(prev => [...prev, botMessage])

    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 bg-card/50 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-labPrimary to-labPrimary/80 flex items-center justify-center shadow-lg shadow-labPrimary/20">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Centro de Ayuda</h2>
            <p className="text-sm text-muted-foreground">Tu asistente SolHub</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex  ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.isBot
                  ? 'bg-card border border-border/50 text-foreground'
                  : 'bg-labPrimary text-white'
              }`}
            >
              {/* Message Text */}
              <div className="whitespace-pre-wrap break-words">
                {message.text.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.startsWith('**') && line.endsWith('**') ? (
                      <strong>{line.slice(2, -2)}</strong>
                    ) : (
                      line
                    )}
                    {i < message.text.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>

              {/* Option Buttons */}
              {message.options && message.options.length > 0 && (
                <div className="flex flex-col gap-2 mt-3">
                  {message.options.map((option, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handleOptionButtonClick(option)}
                      className="w-full justify-start text-left bg-background hover:bg-accent text-foreground border border-border/30 hover:border-labPrimary/50 transition-all duration-200"
                      variant="outline"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className={`text-xs mt-2 ${message.isBot ? 'text-muted-foreground' : 'text-white/70'}`}>
                {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-card/50 backdrop-blur-sm border-t border-border/50 px-4 py-3">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-3 rounded-xl border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-labPrimary/50 focus:border-labPrimary transition-all duration-200"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-6 py-3 rounded-xl bg-labPrimary hover:bg-labPrimary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Usa las opciones del menú para una navegación más rápida
        </p>
      </div>
    </div>
  )
}
