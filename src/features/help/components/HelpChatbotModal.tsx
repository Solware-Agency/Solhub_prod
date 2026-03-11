import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { 
  getBotDecisionTree, 
  handleBotResponse, 
  handleOptionClick,
  type Message,
  type UserRole 
} from '@services/chatbot/chatbot-tree'
import { Send, X } from 'lucide-react'
import EyeTrackingComponent from '@features/dashboard/components/RobotTraking'
import { Button } from '@shared/components/ui/button'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'

interface HelpChatbotModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpChatbotModal = ({ isOpen, onClose }: HelpChatbotModalProps) => {
  const { profile } = useUserProfile()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useBodyScrollLock(isOpen)
  useGlobalOverlayOpen(isOpen)

  // Inicializar chat con mensaje de bienvenida cuando se abre el modal
  useEffect(() => {
    if (isOpen && profile?.role) {
      const decisionTree = getBotDecisionTree(profile.role as UserRole)
      setMessages([decisionTree.initial])
    }
  }, [isOpen, profile?.role])

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleClose = () => {
    setMessages([])
    setInputValue('')
    onClose()
  }

  const WHATSAPP_REPORT_NUMBER = '584129974533'
  const OPTION_REPORTAR_FALLA = 'Reportar una falla'

  const handleOptionButtonClick = (option: string) => {
    if (!profile?.role) return

    if (option === OPTION_REPORTAR_FALLA) {
      setMessages(prev => [
        ...prev,
        { id: prev.length + 1, text: option, isBot: false, timestamp: new Date() },
        {
          id: prev.length + 2,
          text: 'Redirigiendo a WhatsApp para reportar la falla...',
          isBot: true,
          timestamp: new Date(),
        },
      ])
      window.open(`https://wa.me/${WHATSAPP_REPORT_NUMBER}`, '_blank', 'noopener,noreferrer')
      return
    }

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

    const text = inputValue.trim()
    setInputValue('')

    const userMessage: Message = {
      id: messages.length + 1,
      text,
      isBot: false,
      timestamp: new Date()
    }

    if (text === OPTION_REPORTAR_FALLA) {
      const botReply: Message = {
        id: messages.length + 2,
        text: 'Redirigiendo a WhatsApp para reportar la falla...',
        isBot: true,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage, botReply])
      window.open(`https://wa.me/${WHATSAPP_REPORT_NUMBER}`, '_blank', 'noopener,noreferrer')
      return
    }

    setMessages(prev => [...prev, userMessage])
    const botMessage = handleBotResponse(text, messages.length, profile.role as UserRole)
    setMessages(prev => [...prev, botMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Render modal when isOpen even if profile is still loading (so the modal opens and shows loading)
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[99999999999999999]"
          />

          {/* Main Modal */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999999999999] overflow-y-auto border-l border-input flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center overflow-hidden">
                    <EyeTrackingComponent headOnly className="w-12 h-12 min-w-12 min-h-12 [&_.cls-1]:fill-labPrimary [&_.cls-2]:fill-labPrimary [&_.cls-8]:fill-labPrimary [&_.cls-11]:fill-labPrimary [&_.cls-5]:fill-labPrimary [&_.cls-14]:fill-labPrimary [&_.cls-9]:fill-labPrimary [&_.cls-12]:fill-labPrimary [&_.cls-3]:fill-labPrimary/90 [&_.cls-10]:fill-labPrimary/80 [&_.cls-13]:fill-labPrimary/90 [&_.cls-4]:fill-labPrimary/70 [&_.cls-7]:fill-labPrimary" />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Solwy
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
              {!profile ? (
                <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  Cargando...
                </div>
              ) : (
              <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] min-w-0 rounded-2xl px-4 py-3 ${
                      message.isBot
                        ? 'bg-card border border-border/50 text-foreground'
                        : 'bg-labPrimary text-white'
                    }`}
                  >
                    {/* Message Text */}
                    <div className="whitespace-pre-wrap wrap-break-word">
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
                      <div className="flex flex-col gap-2.5 mt-3 min-w-0">
                        {message.options.map((option, idx) => (
                          <Button
                            key={idx}
                            onClick={() => handleOptionButtonClick(option)}
                            className="w-full justify-start text-left whitespace-normal wrap-break-word hyphens-auto min-h-13 py-3 px-4 leading-relaxed text-[0.9375rem] bg-background hover:bg-accent text-foreground border border-border/30 hover:border-labPrimary/50 transition-all duration-200"
                            variant="outline"
                            size="sm"
                          >
                            <span className="text-left wrap-break-word leading-relaxed">{option}</span>
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
              </>
              )}
            </div>

            {/* Input Area - only when profile is loaded */}
            {profile && (
            <div className="sticky bottom-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-t border-input p-3 sm:p-4">
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
            </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
