'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Sparkles, Building2, BookOpen, Cpu, ShieldCheck, IndianRupee, Clock, Wifi, Coffee } from 'lucide-react';

export default function CampusPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Campus Infrastructure & Amenities</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hostels, Library, and High-Performance Compute Labs
          </h1>
          <p className="text-slate-600 text-base mt-2">
            Detailed information on residential accommodations, central library operating hours, mess menus, and NVIDIA GPU compute hardware.
          </p>
        </div>

        {/* Section 1: Hostels & Accommodation */}
        <div className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Student Hostels & Residential Policy</h2>
              <p className="text-slate-500 text-xs">Verified from Hostel_Accommodation_Policy_2026.pdf</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Single Room */}
            <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  Single Occupancy (AC)
                </span>
                <span className="text-xs text-slate-500 font-mono">Blocks A & B</span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900">₹1,80,000</span>
                <span className="text-slate-500 text-xs font-medium"> / academic year</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> Attached Private Bathroom & Balcony
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> High-Speed Wi-Fi 6 (1 Gbps symmetric)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> 4-Meal Daily Mess (Breakfast, Lunch, Snacks, Dinner)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> Bi-weekly Housekeeping & Laundry Access
                </li>
              </ul>
              <Link
                href="/chat?q=What are the curfew hours and guest policies for Single AC Hostels?"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline pt-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI about Hostel Curfew & Guest Rules →</span>
              </Link>
            </div>

            {/* Double Room */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 bg-slate-200 px-3 py-1 rounded-full">
                  Double Occupancy (Non-AC / AC)
                </span>
                <span className="text-xs text-slate-500 font-mono">Blocks C & D</span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900">₹1,20,000</span>
                <span className="text-slate-500 text-xs font-medium"> / academic year</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> Twin Study Desks & Storage Wardrobes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> High-Speed Wi-Fi & LAN Ports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> 4-Meal Daily Mess Included
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon /> 24/7 Security & CCTV Monitoring
                </li>
              </ul>
              <Link
                href="/chat?q=How do I apply for hostel room allocation and mess refund?"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline pt-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI about Room Allocation Process →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section 2: Central Library & HPC Compute Lab */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Library Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Central Knowledge Library</h3>
                <span className="text-xs text-slate-500">Verified from Central_Library_Policy_2026.pdf</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Mon - Sat Hours:</span>
                <span className="font-bold text-purple-700">8:00 AM - 11:00 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Sunday Hours:</span>
                <span className="font-bold text-purple-700">10:00 AM - 6:00 PM</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-600">UG Borrowing Limit:</span>
                <span className="font-bold">4 Books (14 Days)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">PG/PhD Borrowing Limit:</span>
                <span className="font-bold">8 Books (30 Days)</span>
              </div>
            </div>

            <Link
              href="/chat?q=What are the overdue book fine charges and digital journal access links?"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI about Library Fine Fees & IEEE Access →</span>
            </Link>
          </div>

          {/* HPC GPU Lab Card */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">HPC NVIDIA H100 AI Lab</h3>
                <span className="text-xs text-slate-500">Verified from HPC_Lab_Guidelines.pdf</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Hardware Nodes:</span>
                <span className="font-bold text-purple-700">8x NVIDIA H100 SXM5 80GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Cluster Storage:</span>
                <span className="font-bold text-purple-700">500 TB NVMe Ultra Flash Storage</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-600">Allocation Criteria:</span>
                <span className="font-bold">Approved Capstone / Research Project</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Scheduler Engine:</span>
                <span className="font-bold font-mono">Slurm Workload Manager</span>
              </div>
            </div>

            <Link
              href="/chat?q=How do B.Tech CS students request Slurm GPU job execution time?"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI about GPU Cluster Job Submission →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></div>;
}
