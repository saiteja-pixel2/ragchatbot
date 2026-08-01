'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Sparkles, Scale, FileText, CheckCircle2, PhoneCall } from 'lucide-react';

export default function DisciplinePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Campus Rules & Anti-Ragging Cell</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Code of Conduct, Anti-Ragging & Grievance Redressal
          </h1>
          <p className="text-slate-600 text-base mt-2">
            MITS enforces a strict zero-tolerance policy against ragging, 75% minimum attendance discipline, and official grievance redressal procedures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Anti Ragging */}
          <div className="bg-white rounded-3xl p-8 border border-red-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Anti-Ragging Committee & Policy</h3>
                <span className="text-xs text-slate-500">Zero-Tolerance Enforced</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ragging in any form is strictly prohibited inside the campus, hostels, or college buses. Any violation results in immediate suspension and statutory legal action.
            </p>

            <div className="bg-red-50/60 border border-red-200 rounded-2xl p-4 text-xs font-mono space-y-1">
              <div className="font-bold text-red-700">Anti-Ragging Squad Helpline:</div>
              <div className="text-slate-800">[NEEDS INPUT: Add MITS Anti-Ragging Toll-Free Number]</div>
            </div>

            <Link
              href="/chat?q=What is the anti-ragging policy and grievance redressal helpline at MITS?"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI About Anti-Ragging Policy →</span>
            </Link>
          </div>

          {/* Code of Conduct & Attendance */}
          <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Attendance & Grievance Cell</h3>
                <span className="text-xs text-slate-500">Academic Regulations</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Minimum Exam Attendance:</span>
                <span className="font-bold text-purple-700">75% Required</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Medical Condonation:</span>
                <span className="font-bold text-purple-700">65% - 74% with Dean Approval</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Grievances regarding academics, evaluation, or facilities can be submitted directly to the Grievance Redressal Cell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
