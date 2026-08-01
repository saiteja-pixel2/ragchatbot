'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HelpCircle, Search, Sparkles, BookOpen, ChevronDown, FileText, CheckCircle2 } from 'lucide-react';
import { getPublicFaqs, FaqItem } from '@/lib/publicApi';

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublicFaqs();
        setFaqs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ['All', 'Admissions', 'Fees & Tuition', 'Hostels & Mess', 'Library & Compute', 'Exams & Attendance'];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]);
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Verified Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Campus Questions
          </h1>
          <p className="text-slate-600 text-base mt-2">
            Search official answers verified directly from campus policy manuals, hostel handbooks, and examination regulations.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 max-w-2xl mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search FAQs by keyword (e.g. attendance, hostel fees, library)..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-purple-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 shadow-xs"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
            <p className="text-slate-500 text-sm">No FAQs found matching your search term.</p>
            <Link
              href={`/chat?q=${encodeURIComponent(searchTerm)}`}
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white gradient-accent-bg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask CampusIQ AI Directly</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={faq.id || idx}
                  className={`border rounded-2xl transition-all ${
                    isOpen
                      ? 'border-purple-300 bg-purple-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-purple-200'
                  }`}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 text-base"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        {faq.category}
                      </span>
                      <span>{faq.question}</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-purple-600 transition-transform shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-slate-700 text-sm border-t border-purple-100/80 space-y-3">
                      <p className="leading-relaxed">{faq.answer}</p>
                      <div className="flex items-center justify-between bg-white border border-purple-100 rounded-xl p-2.5 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-slate-700">{faq.source_document}</span>
                        </div>
                        <span className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Page {faq.page_number}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
