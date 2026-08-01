'use client';

import React, { useState } from 'react';
import { ChevronDown, BookOpen, ShieldCheck, FileText } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
  sourceDoc: string;
  pageNumber: number;
}

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      category: 'Fees & Payment',
      question: 'What is the annual tuition fee structure for B.Tech Computer Science?',
      answer: 'The annual tuition fee for B.Tech Computer Science is ₹2,20,000 per academic year, payable in two semester installments of ₹1,10,000 each. Additional laboratory and compute lab fees total ₹15,000 per year.',
      sourceDoc: 'Academic_Fee_Structure_2026.pdf',
      pageNumber: 3
    },
    {
      category: 'Hostels',
      question: 'What are the room rates and occupancy options for campus hostels?',
      answer: 'Campus hostels offer Single Occupancy Air-Conditioned Rooms at ₹1,80,000 / year and Double Occupancy Rooms at ₹1,20,000 / year. Both options include high-speed Wi-Fi, 4-time daily mess meals, and 24/7 laundry access.',
      sourceDoc: 'Hostel_Accommodation_Policy_2026.pdf',
      pageNumber: 7
    },
    {
      category: 'Library Rules',
      question: 'What are the library operating hours and borrowing privileges?',
      answer: 'The Central Library is open Monday through Saturday from 8:00 AM to 11:00 PM and Sundays from 10:00 AM to 6:00 PM. Undergraduates can borrow up to 4 books for 14 days; Postgraduates can borrow 8 books for 30 days.',
      sourceDoc: 'Central_Library_Policy_2026.pdf',
      pageNumber: 14
    },
    {
      category: 'Exams & Attendance',
      question: 'What is the minimum attendance requirement to appear for semester exams?',
      answer: 'Students must maintain a minimum of 75% attendance in both lectures and practical sessions. Students with attendance between 65% and 74% may apply for medical condonation subject to Dean approval.',
      sourceDoc: 'Examination_Regulations_Manual.pdf',
      pageNumber: 22
    },
    {
      category: 'Compute & Research',
      question: 'Who can request access to the High-Performance Computing (HPC) NVIDIA GPU Lab?',
      answer: 'Students enrolled in B.Tech CS, M.Tech AI, or Research programs with approved AI/ML capstone projects can apply for direct GPU compute allocation through their faculty advisor.',
      sourceDoc: 'HPC_Lab_Guidelines.pdf',
      pageNumber: 5
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Verified Knowledge Hub
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-3">
            Frequently Asked Campus Questions
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Every answer is verified against official institute policy manuals and regulation handbooks.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
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
                    className={`w-5 h-5 text-purple-600 transition-transform ${
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
                        <span className="font-medium text-slate-700">{faq.sourceDoc}</span>
                      </div>
                      <span className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Page {faq.pageNumber}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
