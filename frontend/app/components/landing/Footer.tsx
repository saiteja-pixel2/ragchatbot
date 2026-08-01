'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Sparkles, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-white">Campus<span className="text-purple-400">IQ</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise AI Educational Platform powered by Gemini 2.5 Flash, BAAI Embeddings, and ChromaDB Vector Store.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-purple-400 font-semibold bg-purple-950/60 border border-purple-800/60 px-3 py-1.5 rounded-lg w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Version 2.5 Flash Grounded</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/courses" className="hover:text-purple-400 transition-colors">Courses Catalog (₹)</Link></li>
              <li><Link href="/campus" className="hover:text-purple-400 transition-colors">Hostel & Campus Facilities</Link></li>
              <li><Link href="/faqs" className="hover:text-purple-400 transition-colors">FAQ Knowledge Hub</Link></li>
              <li><Link href="/chat" className="hover:text-purple-400 transition-colors">AI Workspace (/chat)</Link></li>
              <li><Link href="/dashboard" className="hover:text-purple-400 transition-colors">Admin Control Tower</Link></li>
            </ul>
          </div>

          {/* Governance & Policies */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">AI Governance</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-300 font-medium">Cutoff Guard:</span> Score &ge; 0.75</li>
              <li><span className="text-slate-300 font-medium">Embedding Dim:</span> 384-Dim BGE</li>
              <li><span className="text-slate-300 font-medium">Chunk Size:</span> 800 Chars / 150 Overlap</li>
              <li><span className="text-slate-300 font-medium">Memory Horizon:</span> 5-Turn Coreference</li>
            </ul>
          </div>

          {/* System Health Status */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Subsystem Health</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-slate-300">FastAPI Backend</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Operational
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-slate-300">ChromaDB Store</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CampusIQ Platform. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Built with Next.js 15, FastAPI & Gemini 2.5 Flash
          </p>
        </div>
      </div>
    </footer>
  );
}
