'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, X, Send, Sparkles, Maximize2, Mic, Paperclip, FileText, CheckCircle2, ChevronRight, RefreshCw, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Citation, getCurrentUser } from '@/lib/publicApi';
import { streamChatMessage } from '@/lib/chatApi';
import { buildLoginRedirectUrl } from '@/lib/redirectUtils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  timestamp: string;
  isStreaming?: boolean;
}

export default function AIChatWidget() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: '👋 Hello! I am CampusIQ AI. Ask me anything about course syllabus, hostel fees, library hours, exam schedules, or campus rules!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: []
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'administrator')) {
    return null;
  }

  const quickPills = [
    'B.Tech Fee Structure?',
    'Hostel Room Facilities & Rent',
    'Library Mon-Sat Hours',
    'Attendance Criteria'
  ];

  const handleOpenWidget = () => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = buildLoginRedirectUrl('/chat');
      return;
    }
    setIsOpen(true);
  };

  const handleSend = async (queryText?: string) => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = buildLoginRedirectUrl('/chat');
      return;
    }

    const textToSend = queryText || input;
    if (!textToSend.trim() || isGenerating || isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      await streamChatMessage(
        textToSend,
        (chunkText: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, text: msg.text + chunkText } : msg
            )
          );
        },
        (citations: Citation[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, citations } : msg
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
            )
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        },
        (errorMsg: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    text: `⚠️ ${errorMsg}`,
                    isStreaming: false
                  }
                : msg
            )
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        }
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, text: '⚠️ Something went wrong while processing your question. Please try again, or contact campusiq@gmail.com if this keeps happening.', isStreaming: false }
            : msg
        )
      );
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={handleOpenWidget}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3.5 rounded-full gradient-accent-bg text-white shadow-xl shadow-purple-500/25 hover:scale-105 transition-all duration-200 group"
          title="Ask CampusIQ AI"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-pink-200" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="font-semibold text-sm">Ask CampusIQ</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium hidden sm:inline">RAG</span>
        </button>
      )}

      {/* Widget Popover Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[420px] h-[580px] bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="gradient-bg p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="w-5 h-5 text-pink-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base leading-tight">CampusIQ Assistant</h3>
                  <span className="text-[10px] bg-green-400/20 text-green-300 border border-green-400/30 px-1.5 py-0.2 rounded font-semibold">Online</span>
                </div>
                <p className="text-xs text-purple-200">Grounded Document RAG Memory</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="p-1.5 rounded-lg hover:bg-white/10 text-purple-100 hover:text-white transition-colors"
                title="Expand to Full Workspace"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-purple-100 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Pill Prompts */}
          <div className="bg-purple-50/60 border-b border-purple-100 p-2 overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pill)}
                disabled={isGenerating}
                className="text-[11px] font-medium bg-white text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors shadow-2xs"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-br-xs shadow-sm'
                      : 'bg-white border border-purple-100 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <div className="leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0" {...props} />,
                        strong: ({ node, ...props }) => <strong className={msg.sender === 'user' ? 'font-bold text-white' : 'font-bold text-purple-900'} {...props} />,
                        h3: ({ node, ...props }) => <h3 className="font-extrabold text-xs text-purple-900 mb-1" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-1" {...props} />,
                        li: ({ node, ...props }) => <li className="text-xs" {...props} />
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>


                  {/* Citations List */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-purple-100 space-y-1">
                      <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-purple-600" />
                        Verified Document Sources:
                      </span>
                      {msg.citations.map((c, i) => {
                        const docName = c.document_name || (c as any).filename || 'Document';
                        const pageNum = c.page_number || (c as any).page || 1;
                        const rawScore = typeof c.similarity_score === 'number' && !isNaN(c.similarity_score)
                          ? c.similarity_score
                          : (typeof (c as any).score === 'number' && !isNaN((c as any).score) ? (c as any).score : null);
                        const scorePct = rawScore !== null ? Math.round(rawScore * 100) : null;

                        return (
                          <div
                            key={i}
                            className="text-[10px] bg-purple-50 text-purple-900 border border-purple-200 rounded px-2 py-1 flex items-center justify-between"
                          >
                            <span className="font-semibold truncate max-w-[180px]">{docName}</span>
                            <span className="text-purple-600 font-mono">
                              Pg {pageNum} {scorePct !== null ? `(${scorePct}%)` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 align-middle"></span>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-purple-100 flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors ${
                  isListening ? 'text-red-500 bg-red-50 animate-pulse' : ''
                }`}
                title="Voice Search"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about fees, hostel, syllabus..."
                disabled={isGenerating}
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />

              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="p-2 rounded-xl gradient-bg text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-sm"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Powered by Gemini 2.5 & ChromaDB</span>
              <Link href="/chat" className="text-purple-600 hover:underline font-semibold">
                Open Full Workspace →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
