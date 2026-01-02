import { useState } from 'react'
import { Send, Sparkles, User, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Indicator } from '@/components/ui/Indicator'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'user',
      content: 'handleCallback 함수를 리팩토링해줘',
    },
    {
      role: 'assistant',
      content: '네, try-catch 블록을 추가하고 에러 처리를 개선하겠습니다. 토큰 검증과 로깅도 함께 추가하면 더 안전한 코드가 될 것 같아요.',
    },
    {
      role: 'user',
      content: '테스트 코드도 추가해줄 수 있어?',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = () => {
    if (!input.trim()) return

    setMessages([...messages, { role: 'user', content: input }])
    setInput('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '물론입니다! Jest를 사용한 단위 테스트와 통합 테스트를 작성하겠습니다.',
          streaming: true,
        }
      ])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="flex h-screen flex-col bg-bg-deep">
      {/* Header */}
      <div className="flex h-[var(--limn-titlebar-height)] items-center justify-between border-b border-border-DEFAULT bg-bg-elevated px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-warm-400 to-warm-500">
            <Sparkles size={16} className="text-bg-deep" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">AI Assistant</div>
            <div className="text-xs text-text-muted">claude-3.5-sonnet</div>
          </div>
        </div>
        <Indicator variant="success" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-4 ${
              message.role === 'assistant' ? 'bg-warm-glow/20 -mx-6 px-6 py-4' : ''
            }`}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {message.role === 'user' ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                  <User size={16} className="text-text-secondary" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-warm-400 to-warm-500">
                  <Sparkles size={16} className="text-bg-deep" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="text-sm text-text-secondary leading-relaxed">
                {message.content}
                {message.streaming && (
                  <span className="ml-1 inline-block h-4 w-1.5 bg-warm-300 animate-blink" />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-4 bg-warm-glow/20 -mx-6 px-6 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-warm-400 to-warm-500">
              <Sparkles size={16} className="text-bg-deep" />
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border-DEFAULT bg-bg-elevated p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask anything..."
                className="pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd className="rounded bg-white/5 px-2 py-1 text-xs text-text-muted">
                  ⏎
                </kbd>
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
            >
              <Send size={16} />
            </Button>
          </div>
          <div className="mt-2 text-center text-xs text-text-muted">
            AI can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </div>
  )
}
