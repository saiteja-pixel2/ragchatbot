'use client';

import React from 'react';
import { Upload, Database, Cpu, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ArchitecturePipeline() {
  const steps = [
    {
      step: '01',
      title: 'Document Ingestion & Chunking',
      icon: Upload,
      desc: 'PDF, DOCX, and TXT policy documents are extracted and split using sentence-aware chunking (800 chars, 150 overlap).',
      tag: 'Text Extraction'
    },
    {
      step: '02',
      title: 'Vector Embedding Generation',
      icon: Database,
      desc: 'BAAI/bge-small-en-v1.5 converts chunks into 384-dimensional vector embeddings stored inside indexed ChromaDB collections.',
      tag: 'ChromaDB'
    },
    {
      step: '03',
      title: 'Cosine Similarity Search',
      icon: Cpu,
      desc: 'Queries execute top-5 cosine similarity search against vector indices with strict minimum score cutoff guard verification (Score ≥ 0.75).',
      tag: 'Similarity Guard'
    },
    {
      step: '04',
      title: 'Gemini 2.5 Grounded Response',
      icon: Sparkles,
      desc: 'Retrieved context is injected into structured system prompts, streaming verified answers with page citations to user UI.',
      tag: 'Gemini 2.5 Flash'
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100/80 px-3 py-1 rounded-full border border-purple-200">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            End-to-End Grounded RAG Pipeline
          </h2>
          <p className="text-slate-600 text-base mt-3">
            Designed for enterprise campus environments to eliminate halluncinations and guarantee document-verified responses.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black font-mono text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                      STAGE {s.step}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {s.tag}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{s.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs text-purple-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Subsystem Ready</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
