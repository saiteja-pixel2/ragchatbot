'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildLoginRedirectUrl } from '@/lib/redirectUtils';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Users,
  MessageSquare,
  Bell,
  FileText,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Briefcase,
  Search,
  Upload,
  RefreshCw,
  Edit3,
  Save,
  PieChart,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileCode,
  Sliders,
  Check
} from 'lucide-react';
import { getCurrentUser, UserProfile } from '@/lib/publicApi';

// Initial Document Roster Meta Data
const INITIAL_DOCUMENTS = [
  { id: 'doc_01', filename: '01_admissions.md', title: 'Admissions & EAPCET Criteria', chunks: 12, size: '2.2 KB', updated: 'Today, 02:15 PM' },
  { id: 'doc_02', filename: '02_fees_and_scholarships.md', title: 'Tuition Fees & JVD Scheme', chunks: 16, size: '3.2 KB', updated: 'Today, 01:10 PM' },
  { id: 'doc_03', filename: '03_hostel.md', title: 'Hostel Fees, Rules & Curfew', chunks: 9, size: '1.7 KB', updated: 'Yesterday' },
  { id: 'doc_04', filename: '04_placements.md', title: 'Placement Stats & Top Recruiters', chunks: 8, size: '1.5 KB', updated: '3 days ago' },
  { id: 'doc_05', filename: '05_academics.md', title: 'Academic Curriculum & Credits', chunks: 10, size: '1.7 KB', updated: '3 days ago' },
  { id: 'doc_06', filename: '06_examinations.md', title: 'Exam Regulations & Revaluation', chunks: 9, size: '1.6 KB', updated: '4 days ago' },
  { id: 'doc_07', filename: '07_campus_facilities.md', title: 'Library, Labs & GPU Cluster', chunks: 7, size: '1.3 KB', updated: '5 days ago' },
  { id: 'doc_08', filename: '08_clubs_and_activities.md', title: 'Student Clubs & Campus Fests', chunks: 6, size: '1.1 KB', updated: '5 days ago' },
  { id: 'doc_09', filename: '09_rules_and_discipline.md', title: 'Anti-Ragging & Discipline Code', chunks: 8, size: '1.4 KB', updated: '1 week ago' },
  { id: 'doc_10', filename: '10_contacts_and_administration.md', title: 'Administration & Helplines', chunks: 11, size: '1.9 KB', updated: '1 week ago' }
];

// Sample Document Content Preloads
const SAMPLE_DOC_CONTENTS: Record<string, string> = {
  '01_admissions.md': `# MITS College Admissions Guide & Application Guidelines (2026-27)
> **Context Summary:** Official admission eligibility, AP EAPCET entrance exam criteria, Category-B management quota guidelines, required certificates, and Admissions Office contact information for Madanapalle Institute of Technology & Science (MITS).

## Section 1: Admission Overview & Branch Offerings
Madanapalle Institute of Technology & Science (MITS) offers undergraduate B.Tech programs in CSE (AI & ML), CSE (Data Science), CSE, ECE, EEE, Civil, and Mechanical Engineering, along with postgraduate MCA, MBA, and M.Tech degrees.

## Section 2: Entrance Examinations Accepted
- **B.Tech Convener Quota**: AP EAPCET. Counseling Code: \`MITS\`.
- **MCA / MBA Convener Quota**: AP ICET.
- **B.Tech Lateral Entry**: AP ECET.

## Section 3: Admissions Office Contact Details
- **Admissions Cell Location**: Near Circular Block, MITS Campus
- **Admissions Helpline Phone**: +91-9123456789
- **Admissions Inquiry Email**: campusiq@gmail.com`,

  '02_fees_and_scholarships.md': `# MITS Academic Fee Structure & Fee Reimbursement Policy (2026-27)
> **Context Summary:** Comprehensive B.Tech, M.Tech, MCA, and MBA tuition fees, Andhra Pradesh Jagananna Vidya Deevena (JVD) state scholarship guidelines, payment schedules, and refund rules for MITS Madanapalle.

## Section 1: Tuition Fee Structure (Annual)
- **B.Tech Computer Science & Engineering (CSE / AI & ML / Data Science)**: ₹2,50,000 per academic year.
- **B.Tech Electrical & Electronics Engineering (EEE)**: ₹1,00,000 per academic year.
- **B.Tech Electronics & Communication Engineering (ECE)**: ₹1,50,000 per academic year.

## Section 2: Jagananna Vidya Deevena (JVD) Scheme
- **Eligibility**: Students with eligible income certificates under AP Government JVD scheme receive 100% tuition fee coverage deposited into mother's account in 4 installments.
- **Hostel Fee Coverage**: JVD does NOT cover hostel or mess fees.`
};

// Recent Student Inquiries Sample Log
const INITIAL_STUDENT_QUERIES = [
  { id: 'q_01', query: 'What is the tuition fee for B.Tech CSE AI & ML?', status: 'Grounded', score: 0.98, doc: '02_fees_and_scholarships.md', time: '10 mins ago' },
  { id: 'q_02', query: 'What is the hostel curfew time for hostellers?', status: 'Grounded', score: 0.94, doc: '03_hostel.md', time: '25 mins ago' },
  { id: 'q_03', query: 'Is there a robotics or drone club on campus?', status: 'Fallback', score: 0.42, doc: 'Unanswered', time: '42 mins ago' },
  { id: 'q_04', query: 'How to apply for fee refund after seat cancellation?', status: 'Fallback', score: 0.38, doc: 'Unanswered', time: '1 hour ago' },
  { id: 'q_05', query: 'What is the library borrowing limit?', status: 'Grounded', score: 0.96, doc: '07_campus_facilities.md', time: '2 hours ago' },
  { id: 'q_06', query: 'What is the EAPCET counseling code for MITS?', status: 'Grounded', score: 0.99, doc: '01_admissions.md', time: '3 hours ago' }
];

// Top Fallback Questions Tracking
const TOP_FALLBACK_QUESTIONS = [
  { id: 'fb_1', question: 'How to request fee refund after seat cancellation?', occurrences: 18, category: 'Fees & Refund' },
  { id: 'fb_2', question: 'Is there a robotics or drone research club on campus?', occurrences: 14, category: 'Clubs & Labs' },
  { id: 'fb_3', question: 'What are the hostel guest room overnight charges?', occurrences: 11, category: 'Hostel Facilities' },
  { id: 'fb_4', question: 'How to apply for duplicate TC or Marks Memorandum?', occurrences: 8, category: 'Academic Admin' },
  { id: 'fb_5', question: 'What is the campus bus transport fee for Madanapalle route?', occurrences: 7, category: 'Transport' }
];

export default function FacultyDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active View Tab State: 'overview' | 'queries' | 'knowledge-base' | 'analytics' | 'notices'
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'knowledge-base' | 'analytics' | 'notices'>('overview');

  // Knowledge Base Editor State
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc_01');
  const [editorText, setEditorText] = useState<string>('');
  const [isReingesting, setIsReingesting] = useState<boolean>(false);
  const [ingestStatusMessage, setIngestStatusMessage] = useState<string | null>(null);

  // Query Filter State
  const [querySearchTerm, setQuerySearchTerm] = useState('');
  const [queryStatusFilter, setQueryStatusFilter] = useState<'all' | 'Grounded' | 'Fallback'>('all');

  const authCheckedRef = useRef(false);

  useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    const currentUser = getCurrentUser();
    const hasToken = Boolean(typeof window !== 'undefined' && (localStorage.getItem('campusiq_token') || document.cookie.includes('campusiq_token')));
    if (!currentUser && !hasToken) {
      router.push(buildLoginRedirectUrl('/faculty/dashboard'));
      return;
    }
    if (currentUser) {
      if (currentUser.role === 'student') {
        router.push('/chat');
        return;
      }
      setUser(currentUser);
    }

    // Parse URL hash e.g. #knowledge-base, #analytics
    const hash = window.location.hash.replace('#', '');
    if (hash === 'knowledge-base' || hash === 'analytics' || hash === 'queries' || hash === 'notices') {
      setActiveTab(hash as any);
    }

    setLoading(false);
  }, [router]);

  // Load document text when selected document changes
  useEffect(() => {
    const currentDoc = documents.find((d) => d.id === selectedDocId);
    if (currentDoc) {
      setEditorText(SAMPLE_DOC_CONTENTS[currentDoc.filename] || `# ${currentDoc.title}\n\nContent for ${currentDoc.filename} is loaded and ready for faculty review and vector indexing.`);
    }
  }, [selectedDocId, documents]);

  const handleReingestDoc = (docId: string) => {
    const currentDoc = documents.find((d) => d.id === docId);
    if (!currentDoc) return;

    setIsReingesting(true);
    setIngestStatusMessage(null);

    // Simulate single-file vector re-ingestion
    setTimeout(() => {
      setIsReingesting(false);
      setIngestStatusMessage(`✓ Successfully re-indexed "${currentDoc.filename}" into ChromaDB! Generated ${currentDoc.chunks + 2} vector chunks in 140ms.`);
      
      // Update doc timestamp
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, updated: 'Just now', chunks: d.chunks + 2 } : d))
      );

      setTimeout(() => setIngestStatusMessage(null), 5000);
    }, 1200);
  };

  const filteredQueries = INITIAL_STUDENT_QUERIES.filter((q) => {
    const matchesSearch = q.query.toLowerCase().includes(querySearchTerm.toLowerCase());
    const matchesStatus = queryStatusFilter === 'all' || q.status === queryStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-purple-400 font-bold text-sm">
        Loading Faculty Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-900/50 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Faculty Resource & Academic Control Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 text-xs font-bold capitalize">
                  {user?.role || 'Faculty'}
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Manage campus knowledge base documents, inspect student RAG queries, and track fallback analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2.5 rounded-xl gradient-bg text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4 text-pink-300" />
              <span>Ask AI Chatbot (Test Engine)</span>
            </Link>
            <Link
              href="/settings"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <Sliders className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'gradient-bg text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge-base')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'knowledge-base'
                ? 'gradient-bg text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Knowledge Base Manager</span>
            <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 text-[10px]">10 Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'gradient-bg text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Chatbot Analytics</span>
            <span className="px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-700 text-[10px]">Live</span>
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'queries'
                ? 'gradient-bg text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Student RAG Queries</span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notices'
                ? 'gradient-bg text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Department Notices</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW METRICS & QUICK SUMMARY                      */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Department Affiliation</span>
                <span className="text-xl font-extrabold text-purple-400 block">CSE & AI/ML</span>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Indexed Knowledge Files</span>
                <span className="text-xl font-extrabold text-purple-400 block">10 Campus Documents</span>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Answer Accuracy Rate</span>
                <span className="text-xl font-extrabold text-emerald-400 block">92.4% Grounded</span>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Top Unanswered Topic</span>
                <span className="text-xl font-extrabold text-pink-400 block">Fee Refund Policy</span>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Student Queries Preview */}
              <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="font-bold text-base text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <span>Recent Student RAG Inquiries</span>
                  </h2>
                  <button onClick={() => setActiveTab('queries')} className="text-xs text-purple-400 font-bold hover:underline">
                    View All &rarr;
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {INITIAL_STUDENT_QUERIES.slice(0, 4).map((q) => (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span>"{q.query}"</span>
                        <span className={q.status === 'Grounded' ? 'text-emerald-400 font-mono' : 'text-pink-400 font-mono'}>
                          {q.status === 'Grounded' ? `Grounded (${Math.round(q.score * 100)}%)` : 'Fallback Triggered'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {q.status === 'Grounded' ? `Answered via ${q.doc}` : 'Dispatched campusiq@gmail.com fallback message.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Circulars */}
              <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="font-bold text-base text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    <span>Department Circulars & Guidelines</span>
                  </h2>
                  <span className="text-xs text-purple-400 font-bold">Updated Today</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-900/60 space-y-1">
                    <span className="font-bold text-purple-200 block">Mid-Semester Exam Evaluation Guidelines</span>
                    <p className="text-slate-300 leading-relaxed">
                      All answer sheets for B.Tech III Year CSE must be evaluated and marks updated by Saturday, 5:00 PM.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-200 block">AI & Compute Lab Timings Update</span>
                    <p className="text-slate-400 leading-relaxed">
                      NVIDIA GPU cluster access is reserved for M.Tech/B.Tech AI project labs from 2:00 PM to 5:00 PM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: KNOWLEDGE BASE MANAGER (View, Edit, Upload & Re-Ingest) */}
        {/* ============================================================ */}
        {activeTab === 'knowledge-base' && (
          <div className="space-y-6 animate-fadeIn">
            {ingestStatusMessage && (
              <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-xl animate-fadeIn">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{ingestStatusMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Document Roster Sidebar */}
              <div className="lg:col-span-1 bg-slate-900/80 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Campus Knowledge Files</span>
                  </h3>
                  <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800 font-bold">
                    {documents.length} Files
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                  {documents.map((doc) => {
                    const isSelected = doc.id === selectedDocId;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-600 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className="truncate">{doc.filename}</span>
                          <span className="text-[10px] font-mono text-purple-400">{doc.chunks} Chunks</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 truncate">{doc.title}</span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
                          <span>Size: {doc.size}</span>
                          <span>Updated: {doc.updated}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Text Editor & Re-Ingest Panel */}
              <div className="lg:col-span-2 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block">Selected Document</span>
                      <h3 className="font-extrabold text-base text-white">
                        {documents.find((d) => d.id === selectedDocId)?.filename}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleReingestDoc(selectedDocId)}
                      disabled={isReingesting}
                      className="px-4 py-2.5 rounded-xl gradient-bg text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isReingesting ? 'animate-spin' : ''}`} />
                      <span>{isReingesting ? 'Re-Indexing Vector Store...' : 'Save & Re-Ingest File'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Direct Markdown Text Editor</label>
                    <textarea
                      value={editorText}
                      onChange={(e) => setEditorText(e.target.value)}
                      rows={14}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Changes will automatically re-chunk and index into ChromaDB.
                  </span>
                  <span className="font-mono text-purple-300">UTF-8 / Markdown</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: CHATBOT ANALYTICS (Query Logs, Fallback Tracking, Stats) */}
        {/* ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Stat Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Total Queries (Last 30 Days)</span>
                <span className="text-2xl font-extrabold text-white block">1,248 Questions</span>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Grounded Answer Rate</span>
                <span className="text-2xl font-extrabold text-emerald-400 block">92.4% Success</span>
              </div>
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400">Fallback Trigger Rate</span>
                <span className="text-2xl font-extrabold text-pink-400 block">7.6% Unanswered</span>
              </div>
            </div>

            {/* Top Fallback-Triggering Questions Card */}
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-pink-400" />
                    <span>Top Unanswered Questions (Missing Knowledge Tracker)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Questions asked by students that triggered the fallback message — add these topics to `campus_documents` to improve AI coverage!
                  </p>
                </div>
                <span className="text-xs font-mono bg-pink-950 text-pink-300 border border-pink-800 px-3 py-1 rounded-full font-bold">
                  Top 5 Missing Topics
                </span>
              </div>

              <div className="space-y-3">
                {TOP_FALLBACK_QUESTIONS.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">"{fb.question}"</span>
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                          {fb.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Triggered fallback <strong className="text-pink-400">{fb.occurrences} times</strong> over the last 30 days.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('knowledge-base');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 font-bold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Add Section to Doc</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: STUDENT RAG QUERIES SEARCHABLE LOG                    */}
        {/* ============================================================ */}
        {(activeTab === 'queries' || activeTab === 'notices') && (
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <span>Student RAG Inquiries Log</span>
              </h3>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search queries..."
                    value={querySearchTerm}
                    onChange={(e) => setQuerySearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  value={queryStatusFilter}
                  onChange={(e) => setQueryStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="Grounded">Grounded Answers</option>
                  <option value="Fallback">Fallback Triggered</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredQueries.map((q) => (
                <div key={q.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-200">"{q.query}"</span>
                    <span className={q.status === 'Grounded' ? 'text-emerald-400 font-mono font-bold' : 'text-pink-400 font-mono font-bold'}>
                      {q.status === 'Grounded' ? `Grounded (${Math.round(q.score * 100)}%)` : 'Fallback Dispatched'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>Source Doc: {q.doc}</span>
                    <span>Asked {q.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
