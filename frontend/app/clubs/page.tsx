'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Sparkles, Award, Music, Code2, Trophy } from 'lucide-react';

export default function ClubsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>Student Life & Extra-Curricular Societies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Technical Societies, Cultural Clubs & Student Council
          </h1>
          <p className="text-slate-600 text-base mt-2">
            Join active campus clubs including IEEE, ACM, CSI, Music, Dance, Drama, and Sports societies by registering in person via Google Form.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tech Societies */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Technical Societies</h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="font-semibold text-purple-700">• IEEE Student Branch</li>
              <li className="font-semibold text-purple-700">• ACM Student Chapter</li>
              <li className="font-semibold text-purple-700">• Computer Society of India (CSI)</li>
            </ul>
            <p className="text-[11px] text-slate-500">Conducts hackathons, coding practice drives, and AI workshops.</p>
          </div>

          {/* Cultural Clubs */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Cultural & Arts Clubs</h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="font-semibold text-pink-700">• Music & Vocal Club</li>
              <li className="font-semibold text-pink-700">• Choreography & Dance Club</li>
              <li className="font-semibold text-pink-700">• Drama & Fine Arts Society</li>
            </ul>
            <p className="text-[11px] text-slate-500">Organizes annual cultural fests and inter-college competitions.</p>
          </div>

          {/* Sports Clubs */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Sports & Athletics</h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="font-semibold text-indigo-700">• MITS Cricket Team</li>
              <li className="font-semibold text-indigo-700">• MITS Football Club</li>
              <li className="font-semibold text-indigo-700">• Basketball & Volleyball Teams</li>
            </ul>
            <p className="text-[11px] text-slate-500">Participates in state-level university sports tournaments.</p>
          </div>
        </div>

        {/* How to Join */}
        <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">How to Join a Student Club</h3>
            <p className="text-xs text-slate-600 mt-1">
              Visit the respective club coordinator in person on campus and complete the official registration **Google Form**.
            </p>
          </div>
          <Link
            href="/chat?q=How do I join the IEEE student chapter or cultural music club at MITS?"
            className="px-5 py-3 rounded-xl text-xs font-bold text-white gradient-accent-bg shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI About Joining Clubs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
