import React from 'react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <div className="bg-[#020617] text-slate-300 p-8 max-w-2xl mx-auto min-h-screen">
      <button 
        onClick={onBack}
        className="mb-6 text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-blue-300 flex items-center gap-2"
      >
        &larr; Back to App
      </button>

      <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Terms of Service</h1>
      <p className="text-[10px] font-mono text-slate-500 mb-8">VERSION 1.0.2 - FEB 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-3 opacity-50">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Resonance Tuner application ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use the Service. This Service is provided by <strong>Roman Digital Solutions LLC</strong>.
          </p>
        </section>

        <section className="p-6 bg-red-900/5 border border-red-900/20 rounded-2xl">
          <h2 className="text-red-400 font-bold uppercase text-[10px] tracking-widest mb-3">2. Assumption of Risk & Liability Disclaimer</h2>
          <p className="mb-3 text-red-200/80 font-medium">
            YOU ACKNOWLEDGE THAT TUNING INSTRUMENTS UNDER HIGH TENSION IS AN INHERENTLY RISKY ACTIVITY.
          </p>
          <p className="text-slate-400">
            Strings are under extreme tension. Adjusting tuning pins can cause strings to snap, which may result in:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-500">
            <li>Severe personal injury (especially to eyes and hands).</li>
            <li>Permanent damage to the instrument (broken strings, structural failure).</li>
            <li>Financial loss due to repair costs.</li>
          </ul>
          <p className="mt-4 text-slate-400">
            <strong>Roman Digital Solutions LLC</strong> provides Resonance Tuner solely as a measurement tool. We do not control your physical actions. We shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from your use of this application.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-3 opacity-50">3. No Professional Warranty</h2>
          <p>
            This Service is intended for educational and DIY assistance purposes only. It is not a substitute for a professional technician. We do not guarantee that using this app will result in a perfect tuning.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-3 opacity-50">4. Intellectual Property</h2>
          <p>
            The "Resonance" name, the visualizer designs, the calibration algorithms, and all underlying code are the exclusive property of Roman Digital Solutions LLC.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-[10px] tracking-widest mb-3 opacity-50">5. Contact</h2>
          <p>
            For support or legal inquiries, please contact us at: <a href="https://romansolutions.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">romansolutions.app</a>
          </p>
        </section>
      </div>
      
      <div className="mt-12 pt-8 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono">
        &copy; 2026 ROMAN DIGITAL SOLUTIONS LLC. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
};
