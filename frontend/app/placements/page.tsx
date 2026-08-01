'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, Sparkles, TrendingUp, Award, CheckCircle2, Building2, Users } from 'lucide-react';

export default function PlacementsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Career Opportunities & Campus Selections</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Placements, Recruiters & Placement Readiness
          </h1>
          <p className="text-slate-600 text-base mt-2">
            MITS Placement Cell connects students with top multinational companies, offering soft-skills training, mock interviews, and drive eligibility criteria.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Highest Package</span>
              <span className="text-3xl font-extrabold text-purple-700">₹28 LPA</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Average Package</span>
              <span className="text-3xl font-extrabold text-slate-900">₹6 LPA</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Top Recruiters</span>
              <span className="text-lg font-bold text-slate-800">TCS, Wipro, Amazon</span>
            </div>
          </div>
        </div>

        {/* Eligibility & Backlog Rules */}
        <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Placement Drive Eligibility Rules</h2>
              <p className="text-slate-500 text-xs">Verified from MITS Placement Cell Handbook</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-2">
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                CGPA Cutoff Criteria
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">7.0 Minimum CGPA</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Students must maintain a minimum Cumulative Grade Point Average of 7.0 across all completed semesters to register for drive applications.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-200 px-3 py-1 rounded-full">
                Backlog Allowance Rule
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">Maximum 15 Backlogs</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A maximum allowance of up to 15 backlogs is permitted. Students with more than 15 active/cleared backlogs are ineligible to participate.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Link
              href="/chat?q=What are the placement drive eligibility rules and CGPA cutoff at MITS?"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white gradient-accent-bg flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI About Placement Drives</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
