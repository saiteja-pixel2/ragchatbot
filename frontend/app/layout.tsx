import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from './components/Navbar';
import TopHeader from './components/TopHeader';
import AIChatWidget from './components/AIChatWidget';

export const metadata: Metadata = {
  title: 'CampusIQ – AI-Powered Educational Platform & RAG Chatbot',
  description:
    'Verified, context-aware AI assistant for university documents, hostel rules, fee structures, library guidelines, and course catalogs with page citations and memory.',
  keywords: [
    'CampusIQ',
    'College AI Assistant',
    'Educational RAG Chatbot',
    'University Knowledge Hub',
    'Gemini 2.5 Flash',
    'ChromaDB Vector Store'
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-purple-200 selection:text-purple-900 bg-slate-50">
        <div className="min-h-screen flex flex-col md:flex-row">
          <Navbar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopHeader />
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
          <AIChatWidget />
        </div>
      </body>
    </html>
  );
}
