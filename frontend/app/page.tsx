import React from 'react';
import Hero from './components/landing/Hero';
import DemoSandbox from './components/landing/DemoSandbox';
import ArchitecturePipeline from './components/landing/ArchitecturePipeline';
import FaqAccordion from './components/landing/FaqAccordion';
import Footer from './components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Hero />
      <DemoSandbox />
      <ArchitecturePipeline />
      <FaqAccordion />
      <Footer />
    </div>
  );
}
