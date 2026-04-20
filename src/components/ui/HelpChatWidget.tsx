import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronDown } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! I'm your RentDesk assistant. Ask me anything about how to use the system — recording payments, creating leases, managing rooms, and more.",
};

const SUGGESTIONS = [
  'How do I record a payment?',
  'How do I create a lease?',
  'What does a Locked room mean?',
];

const helpChatFn = httpsCallable<
  { message: string; history: Array<{ role: 'user' | 'model'; content: string }> },
  { reply: string }
>(functions, 'helpChat');

// Typing indicator dots
function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages
        .slice(1, -1)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          content: m.content,
        }));

      const result = await helpChatFn({ message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col w-80 sm:w-[360px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
            {/* Subtle yellow glow behind icon */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-500/20 blur-md pointer-events-none" />
            <div className="flex items-center gap-3 relative">
              <div className="w-8 h-8 rounded-full bg-gray-900 border border-primary-500/40 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-primary-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">RentDesk AI</p>
                <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Ask me anything
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-700"
              aria-label="Close chat"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ minHeight: 0, maxHeight: '340px' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <Sparkles size={10} className="text-primary-500" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-gray-900 font-medium rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Sparkles size={10} className="text-primary-500" />
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions — only when no user message yet */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full hover:border-primary-500/60 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-gray-700 bg-gray-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={loading}
              className="flex-1 text-sm bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60 disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 flex-shrink-0"
              aria-label="Send"
            >
              <Send size={13} className="text-gray-900" />
            </button>
          </div>
        </div>
      )}

      {/* Floating trigger button — hidden while panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 rounded-full bg-primary-500 hover:bg-primary-600 active:scale-95 shadow-lg hover:shadow-primary-500/40 flex items-center justify-center transition-all"
          style={{ width: 52, height: 52 }}
          aria-label="Open help chat"
        >
          <Sparkles size={20} className="text-gray-900" />
        </button>
      )}
    </>
  );
}
