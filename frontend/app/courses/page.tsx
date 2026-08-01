'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Filter, IndianRupee, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getPublicCourses, Course } from '@/lib/publicApi';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublicCourses();
        setCourses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const departments = ['All', 'Computer Science', 'AI & Machine Learning', 'Design', 'Management'];

  const filteredCourses = selectedDept === 'All'
    ? courses
    : courses.filter(c => c.department.toLowerCase() === selectedDept.toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academic Programs 2026-27</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Degree Programs & Specializations
          </h1>
          <p className="text-slate-600 text-base mt-2">
            Browse course details, annual tuition fee breakdowns in Indian Currency (₹), duration, and AI-assisted eligibility verification.
          </p>
        </div>

        {/* Department Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                selectedDept === dept
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-72 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-purple-100 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                      {course.department}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{course.code}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-slate-600 text-xs mt-2 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-600" /> Duration:
                      </span>
                      <span className="font-bold">{course.duration_years} Years ({course.semesters} Semesters)</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Users className="w-3.5 h-3.5 text-purple-600" /> Total Seats:
                      </span>
                      <span className="font-bold">{course.seats} Intake Seats</span>
                    </div>

                    <div className="flex items-center justify-between bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 mt-2">
                      <span className="text-xs text-purple-900 font-semibold flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-purple-600" /> Annual Tuition Fee:
                      </span>
                      <span className="font-extrabold text-purple-700 text-sm">
                        ₹{course.annual_fee_inr.toLocaleString('en-IN')} / yr
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 truncate">
                    Eligibility: <span className="font-semibold text-slate-700">{course.eligibility}</span>
                  </div>

                  <Link
                    href={`/chat?q=${encodeURIComponent(`Tell me about the course structure, syllabus, and career scope for ${course.title}`)}`}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white gradient-accent-bg hover:opacity-95 transition-opacity flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3 h-3 text-pink-200" />
                    <span>Ask AI</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
