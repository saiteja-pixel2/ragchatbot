'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Send, Mic, Paperclip, Plus, MessageSquare, BookOpen, Download, Bug, ChevronDown, ChevronRight, FileText, CheckCircle2, RefreshCw, Filter, ShieldAlert, Loader2 } from 'lucide-react';
import { streamChatMessage, Citation, getChatSessions, createChatSession, getSessionMessages, ChatSession, ChatMessageItem, DebugTelemetry } from '@/lib/chatApi';
import { getCurrentUser } from '@/lib/publicApi';
import ReactMarkdown from 'react-markdown';


import { normalizeRedirectUrl, buildLoginRedirectUrl } from '@/lib/redirectUtils';

interface UIStateMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  debug?: DebugTelemetry;
  timestamp: string;
  isStreaming?: boolean;
}

function ChatContent() {
  console.log("[DEBUG CHAT] Chat page mounted / rendered");
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Strict Auth Guard — executes on mount, prevents rendering Chat UI to guests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUser = getCurrentUser();
      const token = localStorage.getItem('campusiq_token');
      const roleCookie = document.cookie.includes('campusiq_role=');

      if (!currentUser || !token || !roleCookie) {
        const fullRequestedUrl = window.location.pathname + window.location.search;
        window.location.href = buildLoginRedirectUrl(fullRequestedUrl);
        return;
      }

      setUser(currentUser);
      setIsAuthChecking(false);
    }
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default-session');
  const [showDebugMode, setShowDebugMode] = useState<boolean>(true);
  const [messages, setMessages] = useState<UIStateMessage[]>([
    {
      id: 'welcome-workspace',
      sender: 'assistant',
      text: '🎓 Welcome to the CampusIQ AI Tutor Workspace. I can resolve queries regarding hostel fees, B.Tech/M.Tech syllabus, library hours, examination rules, or compute lab access. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("[DEBUG CHAT useEffect 1] Mount & loading sessions...");
    async function loadSessions() {
      try {
        const fetchedSessions = await getChatSessions();
        if (fetchedSessions.length > 0) {
          setSessions(fetchedSessions);
          setCurrentSessionId(fetchedSessions[0].id);
        }
      } catch (err) {
        console.error("[DEBUG CHAT] Session load error:", err);
      }
    }
    loadSessions();
  }, []);

  const hasHandledInitialQueryRef = useRef(false);

  useEffect(() => {
    if (hasHandledInitialQueryRef.current) return;
    if (initialQuery && initialQuery.trim()) {
      hasHandledInitialQueryRef.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    console.log("[DEBUG CHAT useEffect 3] Scroll to bottom on message update");
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isGeneratingRef = useRef(false);

  const handleNewSession = async () => {
    try {
      const newSess = await createChatSession('New Campus IQ Session');
      setSessions((prev) => [newSess, ...prev]);
      setCurrentSessionId(newSess.id);
      setMessages([
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: 'New session started. Ask any question about campus regulations or course details!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isGenerating || isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);

    const userMsg: UIStateMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend + (attachedFile ? ` [Attached: ${attachedFile.name}]` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setAttachedFile(null);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: UIStateMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await streamChatMessage(
        textToSend,
        (chunkText: string) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text + chunkText } : m))
          );
        },
        (citations: Citation[]) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, citations } : m))
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        },
        (errorMsg: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, text: `⚠️ ${errorMsg}`, isStreaming: false } : m
            )
          );
          isGeneratingRef.current = false;
          setIsGenerating(false);
        },
        currentSessionId,
        (debug: DebugTelemetry) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, debug } : m))
          );
        }
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, text: '⚠️ Something went wrong while processing your question. Please try again, or contact campusiq@gmail.com if this keeps happening.', isStreaming: false }
            : m
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

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleExportMarkdown = () => {
    const content = messages
      .map((m) => `### ${m.sender.toUpperCase()} [${m.timestamp}]\n${m.text}\n`)
      .join('\n---\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CampusIQ_Chat_Transcript_${Date.now()}.md`;
    a.click();
  };

  if (isAuthChecking || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Verifying session...</p>
          <p className="text-xs text-slate-500">Redirecting to login if unauthenticated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 overflow-hidden">
      {/* Left History Drawer Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 hidden md:flex flex-col justify-between">
        <div className="space-y-4">
          <button
            onClick={handleNewSession}
            className="w-full py-2.5 px-3 rounded-xl gradient-bg text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 px-1">
              Conversational Memory
            </span>
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {sessions.length === 0 ? (
                <div className="text-xs text-slate-500 p-2">No past sessions</div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                      currentSessionId === s.id
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-800'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Gemini 2.5 Flash</span>
          <span className="text-emerald-400 font-bold">5-Turn Coref</span>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
        {/* Workspace Header */}
        <header className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-pink-200" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">CampusIQ RAG Workspace</h2>
              <span className="text-[10px] font-mono text-purple-400">Score Cutoff ≥ 0.75 | 384-Dim BGE</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebugMode(!showDebugMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                showDebugMode
                  ? 'bg-purple-900/60 text-purple-300 border-purple-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Step 4 Retrieval Debug Inspector"
            >
              <Bug className="w-3.5 h-3.5 text-pink-400" />
              <span>Debug Inspector ({showDebugMode ? 'ON' : 'OFF'})</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Export formatted Markdown transcript"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export Chat</span>
            </button>
          </div>
        </header>

        {/* Messages Stream Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-xs shadow-md'
                    : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-bl-xs shadow-md'
                }`}
              >
                <div className="leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0" {...props} />,
                      strong: ({ node, ...props }) => <strong className={m.sender === 'user' ? 'font-bold text-white' : 'font-bold text-purple-300'} {...props} />,
                      h3: ({ node, ...props }) => <h3 className="font-extrabold text-sm text-purple-300 mb-1.5" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-1.5" {...props} />,
                      li: ({ node, ...props }) => <li className="text-xs sm:text-sm text-slate-200" {...props} />
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>


                {/* Citations List */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-1.5">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Verified Citations ({m.citations.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.citations.map((c, idx) => {
                        const docName = c.document_name || (c as any).filename || 'Document';
                        const pageNum = c.page_number || (c as any).page || 1;
                        const rawScore = typeof c.similarity_score === 'number' && !isNaN(c.similarity_score)
                          ? c.similarity_score
                          : (typeof (c as any).score === 'number' && !isNaN((c as any).score) ? (c as any).score : null);
                        const scorePct = rawScore !== null ? Math.round(rawScore * 100) : null;

                        return (
                          <div
                            key={idx}
                            className="bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="text-slate-300 font-medium truncate">{docName}</span>
                            </div>
                            <span className="text-[10px] font-mono text-purple-400 font-bold shrink-0 ml-2">
                              Pg {pageNum} {scorePct !== null ? `(${scorePct}%)` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 4: Retrieval Debug Telemetry Inspector Box */}
                {showDebugMode && m.debug && (
                  <div className="mt-4 p-3 bg-slate-950/90 rounded-xl border border-purple-900/60 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-purple-300 border-b border-slate-800 pb-2">
                      <span className="font-bold flex items-center gap-1">
                        <Bug className="w-3 h-3 text-pink-400" /> STEP 4 RAG TELEMETRY INSPECTOR
                      </span>
                      <span className="bg-purple-900/40 px-2 py-0.5 rounded text-purple-300 border border-purple-700">
                        Category: {(m.debug.category_filter_applied || 'GENERAL').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div>Top Chunks: <span className="text-white font-bold">{m.debug.top_candidates_count ?? 0}</span></div>
                      <div>Passed (&ge;0.75): <span className="text-emerald-400 font-bold">{m.debug.passed_chunks_count ?? 0}</span></div>
                      <div>Max Score: <span className="text-pink-400 font-bold">{m.debug.max_similarity_score ?? 0}</span></div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Top 5 Vector Match Candidates:</span>
                      {(m.debug.top_5_chunks_summary || []).map((cand, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded border text-[10px] flex items-center justify-between ${
                            cand.passed_threshold
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                              : 'bg-red-950/30 border-red-900/60 text-red-300'
                          }`}
                        >
                          <div className="truncate max-w-[240px]">
                            <span className="font-bold">[{cand.category || 'general'}]</span> {cand.filename || 'Doc'} (Pg {cand.page || 1})
                          </div>
                          <div className="font-bold">
                            Score: {cand.score} {cand.passed_threshold ? '✅ PASSED' : '❌ DISCARDED'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {m.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1 align-middle"></span>
                )}
              </div>

              <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          {attachedFile && (
            <div className="mb-2 px-3 py-1 bg-purple-900/40 border border-purple-800 rounded-lg text-xs text-purple-300 flex items-center justify-between">
              <span className="truncate">Attached File: {attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.[0]) setAttachedFile(e.target.files[0]);
              }}
              className="hidden"
              accept=".pdf,.docx,.txt,image/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-colors"
              title="Attach PDF/DOCX Document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-2.5 rounded-xl bg-slate-800 transition-colors ${
                isListening ? 'text-red-500 bg-red-900/30 animate-pulse' : 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
              }`}
              title="Voice Speech-to-Text"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about campus documents..."
              disabled={isGenerating}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="p-2.5 rounded-xl gradient-bg text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-sm"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-purple-400 flex items-center justify-center font-bold">Loading CampusIQ Workspace...</div>}>
      <ChatContent />
    </Suspense>
  );
}
