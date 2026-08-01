'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Cpu, BookOpen, Layers, CheckCircle } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-purple-50/60 via-white to-purple-50/30">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-pink-300/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/80 text-purple-700 text-xs font-bold tracking-wide uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
            <span>Enterprise Educational RAG Engine v2.5</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Verified Campus Answers directly from <span className="gradient-text">Official Documents</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
            Eliminate conflicting information. CampusIQ uses vector similarity retrieval and multi-turn conversational memory to deliver precise answers with page citations from handbooks, hostel rules, and syllabus PDFs.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/chat"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold text-white gradient-accent-bg shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
            >
              <Sparkles className="w-5 h-5 text-pink-200" />
              <span>Launch AI Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/courses"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-bold text-slate-800 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Browse Course Catalog</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="pt-8 border-t border-purple-100/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 border border-purple-100 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Page-Level Citations</span>
                <span className="text-slate-500">Every response source-verified</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 border border-purple-100 shadow-2xs">
              <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Gemini 2.5 & Chroma</span>
                <span className="text-slate-500">Fast 384-dim embedding search</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 border border-purple-100 shadow-2xs">
              <Layers className="w-5 h-5 text-pink-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">5-Turn Coreference</span>
                <span className="text-slate-500">Remembers chat context</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 border border-purple-100 shadow-2xs">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Cutoff Guard Protection</span>
                <span className="text-slate-500">Score &ge; 0.75 strict verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
