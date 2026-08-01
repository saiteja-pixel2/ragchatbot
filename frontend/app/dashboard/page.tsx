'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Upload, Database, BarChart3, Sliders, ShieldAlert, CheckCircle2, RefreshCw, FileText, Trash2, Zap } from 'lucide-react';
import { getKnowledgeStats, getKnowledgeChunks, KnowledgeStats, KnowledgeChunk } from '@/lib/knowledgeApi';
import { uploadDocument, IngestionProgress } from '@/lib/ingestionApi';
import { getAnalyticsSummary, getUnansweredLogs, AnalyticsSummary, UnansweredLog } from '@/lib/analyticsApi';
import { useRouter } from 'next/navigation';
import { getCurrentUser, UserProfile } from '@/lib/publicApi';
import { sessionManager, AuthDiagnostics } from '@/lib/SessionManager';
import { AdminConfig, getAdminConfig, updateRAGConfig } from '@/lib/adminApi';
import { buildLoginRedirectUrl } from '@/lib/redirectUtils';


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'ingestion' | 'inspector' | 'analytics' | 'governance' | 'diagnostics'>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.toLowerCase().replace('#', '');
      if (hash === 'inspector' || hash === 'knowledge' || hash === 'knowledge-base') return 'inspector';
      if (hash === 'upload' || hash === 'ingestion' || hash === 'document-upload') return 'ingestion';
      if (hash === 'analytics' || hash === 'system-analytics') return 'analytics';
      if (hash === 'governance' || hash === 'aiconfig' || hash === 'ai-config') return 'governance';
      if (hash === 'diagnostics' || hash === 'users' || hash === 'user-management') return 'diagnostics';
    }
    return 'ingestion';
  });
  const [authDiagnostics, setAuthDiagnostics] = useState<AuthDiagnostics | null>(null);

  const authCheckedRef = useRef(false);

  useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    const currentUser = getCurrentUser();
    const hasToken = Boolean(typeof window !== 'undefined' && (localStorage.getItem('campusiq_token') || document.cookie.includes('campusiq_token')));
    if (!currentUser && !hasToken) {
      router.push(buildLoginRedirectUrl('/dashboard'));
      return;
    }
    if (currentUser) {
      if (currentUser.role === 'student') {
        router.push('/chat');
        return;
      }
      if (currentUser.role === 'faculty') {
        router.push('/faculty/dashboard');
        return;
      }
      setUser(currentUser);
      setAuthDiagnostics(sessionManager.getAuthDiagnostics());
    }
  }, [router]);


  // Stats
  const [stats, setStats] = useState<KnowledgeStats>({
    total_documents: 6,
    total_chunks: 142,
    vector_store_memory_mb: 28.4,
    last_indexed_at: '2026-07-28 14:30:00'
  });

  // Ingestion State
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestProgress, setIngestProgress] = useState<IngestionProgress | null>(null);

  // Chunks State
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);

  // Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    total_queries: 1240,
    avg_latency_ms: 185,
    successful_rag_rate: 94.2,
    unanswered_queries_count: 14
  });
  const [unanswered, setUnanswered] = useState<UnansweredLog[]>([]);

  // Governance State
  const [config, setConfig] = useState<AdminConfig>({
    min_similarity_score: 0.75,
    top_k: 5,
    self_demotion_protection: true
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const kStats = await getKnowledgeStats();
        setStats(kStats);
        const cData = await getKnowledgeChunks();
        setChunks(cData);
        const aSum = await getAnalyticsSummary();
        setAnalytics(aSum);
        const uLogs = await getUnansweredLogs();
        setUnanswered(uLogs);
        const cfg = await getAdminConfig();
        setConfig(cfg);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      }
    }
    loadData();
  }, []);

  // Synchronize active tab with URL hash fragment from sidebar clicks
  useEffect(() => {
    const syncTabFromHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.toLowerCase().replace('#', '');
      if (hash === 'inspector' || hash === 'knowledge' || hash === 'knowledge-base') {
        setActiveTab('inspector');
      } else if (hash === 'upload' || hash === 'ingestion' || hash === 'document-upload') {
        setActiveTab('ingestion');
      } else if (hash === 'analytics' || hash === 'system-analytics') {
        setActiveTab('analytics');
      } else if (hash === 'governance' || hash === 'aiconfig' || hash === 'ai-config' || hash === 'users' || hash === 'user-management') {
        setActiveTab('governance');
      } else if (hash === 'diagnostics') {
        setActiveTab('diagnostics');
      }
    };

    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);


  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestFile) return;

    await uploadDocument(ingestFile, (stageProgress) => {
      setIngestProgress(stageProgress);
      if (stageProgress.status === 'completed') {
        setTimeout(() => {
          setIngestProgress(null);
          setIngestFile(null);
          alert('Document indexed into ChromaDB successfully!');
        }, 1500);
      }
    });
  };

  const handleSaveGovernance = async () => {
    setSavingConfig(true);
    try {
      await updateRAGConfig(config.min_similarity_score, config.top_k);
      alert('RAG Governance settings updated successfully!');
    } catch (err) {
      alert('Failed to update governance settings');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Dashboard Title & KPIs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Control Tower</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Knowledge Base Governance & System Operations
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Last Indexing Ping:</span>
            <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {stats.last_indexed_at}
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Documents</span>
            <span className="text-2xl font-extrabold text-purple-700 mt-1 block">{stats.total_documents} PDFs</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Indexed Vector Chunks</span>
            <span className="text-2xl font-extrabold text-purple-700 mt-1 block">{stats.total_chunks} Chunks</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">RAG Success Accuracy</span>
            <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{analytics.successful_rag_rate}%</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Min Similarity Cutoff</span>
            <span className="text-2xl font-extrabold text-pink-600 mt-1 block">{config.min_similarity_score}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-white border-b border-purple-100 p-1.5 rounded-2xl flex gap-2">
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ingestion'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <Upload className="w-4 h-4" /> Document Ingestion Portal
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inspector'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <Database className="w-4 h-4" /> Knowledge Base Inspector
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> System Analytics & Gaps
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'governance'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <Sliders className="w-4 h-4" /> RAG Governance & Cutoff
          </button>
          <button
            onClick={() => {
              setAuthDiagnostics(sessionManager.getAuthDiagnostics());
              setActiveTab('diagnostics');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Auth Health Diagnostics
          </button>
        </div>

        {/* TAB 5: Auth Health Monitoring Panel */}
        {activeTab === 'diagnostics' && authDiagnostics && (
          <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
                  Administrator Diagnostic Panel
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1">Authentication Health Monitor</h2>
                <p className="text-xs text-slate-400">Real-time session state, token verification, and granular permissions inspector</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-800">
                Last Ping: {authDiagnostics.lastPing}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px]">Active Authenticated User</span>
                <span className="text-purple-300 font-bold block truncate">{authDiagnostics.user?.full_name || authDiagnostics.user?.email}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px]">Active Role Level</span>
                <span className="text-emerald-400 font-bold block uppercase">{authDiagnostics.role}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px]">Cookie / LocalStorage Sync</span>
                <span className="text-pink-400 font-bold block">{authDiagnostics.cookiePresent && authDiagnostics.localStoragePresent ? 'SYNCHRONIZED (200 OK)' : 'DESYNC'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[10px]">Remember Me Persistence</span>
                <span className="text-indigo-400 font-bold block">{authDiagnostics.rememberMeActive ? 'ACTIVE (30 Days)' : 'NORMAL (24 Hours)'}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">Granular Granted Permissions ({authDiagnostics.permissions.length}):</span>
              <div className="flex flex-wrap gap-2">
                {authDiagnostics.permissions.map((perm) => (
                  <span key={perm} className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-200 font-mono text-[11px] font-bold">
                    ✓ {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* TAB 1: Document Ingestion */}
        {activeTab === 'ingestion' && (
          <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Upload & Vectorize Campus Manuals</h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload PDF, DOCX, or TXT documents. Files will be extracted, sentence-chunked (800 chars / 150 overlap), and indexed into ChromaDB.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 max-w-xl">
              <div className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center bg-purple-50/40 hover:bg-purple-50 transition-colors">
                <Upload className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <input
                  type="file"
                  onChange={(e) => setIngestFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  id="doc-upload-input"
                />
                <label
                  htmlFor="doc-upload-input"
                  className="cursor-pointer text-sm font-bold text-purple-700 hover:underline block"
                >
                  {ingestFile ? ingestFile.name : 'Click to select PDF or DOCX file'}
                </label>
                <span className="text-[11px] text-slate-400 mt-1 block">Maximum file size 25MB</span>
              </div>

              <button
                type="submit"
                disabled={!ingestFile || ingestProgress?.status === 'processing'}
                className="w-full py-3 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-pink-300" />
                <span>Start Ingestion & Embedding Pipeline</span>
              </button>
            </form>

            {/* Ingestion Visual Progress Stepper */}
            {ingestProgress && (
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 max-w-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                  <span>Pipeline Stage: {ingestProgress.stage}</span>
                  <span>{ingestProgress.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${ingestProgress.progress_percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-300">{ingestProgress.current_step_description}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Knowledge Base Inspector */}
        {activeTab === 'inspector' && (
          <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Knowledge Base Chunks & Inspection</h2>
              <p className="text-xs text-slate-500 mt-1">
                Inspect extracted text chunks, page numbers, and vector embeddings stored in ChromaDB.
              </p>
            </div>

            <div className="space-y-3">
              {chunks.map((chk) => (
                <div key={chk.chunk_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-purple-700">{chk.document_name}</span>
                    <span className="text-slate-500">Chunk #{chk.chunk_index} | Page {chk.page_number}</span>
                  </div>
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-mono">
                    "{chk.text_content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: System Analytics */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Unanswered Query Log (Knowledge Gaps)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Queries where similarity score fell below minimum cutoff threshold ($0.75$). Use these logs to upload missing campus documents.
              </p>
            </div>

            <div className="space-y-2">
              {unanswered.map((u) => (
                <div key={u.id} className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{u.query_text}</span>
                    <span className="text-slate-500 text-[10px]">{u.timestamp}</span>
                  </div>
                  <span className="font-mono text-red-600 font-bold bg-white px-2.5 py-1 rounded-lg border border-red-200">
                    Max Score: {u.highest_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RAG Governance */}
        {activeTab === 'governance' && (
          <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold text-slate-900">RAG Engine Governance Parameters</h2>
              <p className="text-xs text-slate-500 mt-1">
                Adjust vector similarity cutoff guards and Top-K retrieval parameters in real time.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Minimum Similarity Cutoff Score</label>
                  <span className="font-mono font-bold text-purple-700 text-sm">{config.min_similarity_score}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={config?.min_similarity_score ?? 0.75}
                  onChange={(e) => setConfig({ ...config, min_similarity_score: parseFloat(e.target.value) || 0.75 })}
                  className="w-full accent-purple-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Queries with scores below this cutoff output a graceful refusal. Recommended: 0.75.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Top-K Vector Retrieval Count</label>
                  <span className="font-mono font-bold text-purple-700 text-sm">{config?.top_k ?? 5} Chunks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={config?.top_k ?? 5}
                  onChange={(e) => setConfig({ ...config, top_k: parseInt(e.target.value, 10) || 5 })}
                  className="w-full accent-purple-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Number of chunk contexts injected into Gemini prompt. Recommended: 5.
                </span>
              </div>

              <button
                onClick={handleSaveGovernance}
                disabled={savingConfig}
                className="w-full py-3 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-sm"
              >
                {savingConfig ? 'Saving Settings...' : 'Save RAG Governance Rules'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
