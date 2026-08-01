'use client';

import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, CheckCircle2, FileText, ArrowUpRight, Zap } from 'lucide-react';
import { getPublicDemoQuery, PublicDemoResponse } from '@/lib/publicApi';

export default function DemoSandbox() {
  const [query, setQuery] = useState('What are the central library opening hours and book checkout limits?');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicDemoResponse | null>({
    answer: "According to Section 4.2 of the Central Library Policy (2026 Edition), the library is open Monday through Saturday from 8:00 AM to 11:00 PM, and Sundays from 10:00 AM to 6:00 PM. Undergraduate students can borrow up to 4 books for 14 days, while Postgraduate & Research Scholars can borrow up to 8 books for 30 days.",
    citations: [
      { document_name: "Central_Library_Policy_2026.pdf", page_number: 14, similarity_score: 0.92 },
      { document_name: "Student_Handbook_Section4.pdf", page_number: 8, similarity_score: 0.86 }
    ],
    confidence_score: 0.92,
    latency_ms: 142
  });

  const sampleQueries = [
    'What are the central library opening hours and book checkout limits?',
    'What is the annual fee for B.Tech Computer Science and Single Hostel Room?',
    'What are the attendance requirements to sit for semester examinations?',
    'What compute hardware is available in the NVIDIA GPU AI Research Lab?'
  ];

  const handleRunDemo = async (customText?: string) => {
    const q = customText || query;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await getPublicDemoQuery(q);
      setResult(res);
    } catch (err) {
      console.error('Demo query failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-white border-y border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Interactive RAG Sandbox
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-3">
            Test Vector Retrieval & Grounding in Real Time
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Click any sample question below or type your custom query to watch how CampusIQ searches indexed PDF embeddings.
          </p>
        </div>

        {/* Sandbox Container */}
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
          {/* Sample Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sq);
                  handleRunDemo(sq);
                }}
                disabled={loading}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  query === sq
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-purple-500 hover:text-white'
                }`}
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunDemo();
            }}
            className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-2xl p-2 mb-6 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20"
          >
            <Search className="w-5 h-5 text-slate-400 ml-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any question about campus regulations..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none px-2"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 rounded-xl gradient-bg text-xs font-bold text-white hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <span>Searching Vectors...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-pink-300" />
                  <span>Execute RAG Query</span>
                </>
              )}
            </button>
          </form>

          {/* Output Card */}
          {result && (
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Grounded AI Response
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">
                    Score: {Math.round(result.confidence_score * 100)}%
                  </span>
                  <span>|</span>
                  <span>Latency: {result.latency_ms}ms</span>
                </div>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {result.answer}
              </p>

              {/* Citations */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Extracted Document Citations ({result.citations.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.citations.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-slate-300 font-medium truncate">{c.document_name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-purple-400 font-bold shrink-0 ml-2">
                        Pg {c.page_number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
