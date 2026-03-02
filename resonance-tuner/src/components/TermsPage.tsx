import React from 'react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <div className="bg-[#020617] text-slate-300 p-8 max-w-3xl mx-auto min-h-screen">
      <button 
        onClick={onBack}
        className="mb-8 text-blue-400 font-bold text-xs uppercase tracking-[0.2em] hover:text-blue-300 flex items-center gap-2 transition-colors"
      >
        &larr; Back to Tuner
      </button>

      <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">Terms of Service</h1>
      <p className="text-[10px] font-mono text-slate-500 mb-12 tracking-widest">RESONANCE TUNER | VERSION 1.0.3 | MARCH 2026</p>

      <div className="space-y-12 text-sm leading-relaxed pb-20">
        <section>
          <h2 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-4 opacity-50">1. Agreement to Terms</h2>
          <p>
            By accessing or using the Resonance Tuner application ("the App"), provided by <strong>Roman Digital Solutions LLC</strong> ("we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.
          </p>
        </section>

        <section className="p-8 bg-red-950/20 border border-red-900/40 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
          <h2 className="text-red-500 font-black uppercase text-xs tracking-[0.3em] mb-6">2. DANGER: HIGH TENSION WARNING & LIABILITY</h2>
          <div className="space-y-4">
            <p className="text-red-100 font-bold">
              PLEASE READ THIS SECTION CAREFULLY. TUNING A PIANO IS AN INHERENTLY DANGEROUS MECHANICAL PROCESS.
            </p>
            <p className="text-slate-300">
              A standard piano contains approximately 230 strings, each under 160 to 200 pounds of tension. The total tension on the iron plate can exceed 20 tons. By using this App to assist in tuning, you acknowledge and assume the following risks:
            </p>
            <ul className="list-disc pl-5 space-y-3 text-slate-400">
              <li>
                <strong className="text-slate-200">Physical Injury:</strong> If a string snaps during tuning, it can whip out at high velocity, potentially causing severe lacerations, permanent eye damage, or blindness.
              </li>
              <li>
                <strong className="text-slate-200">Instrument Damage:</strong> Improper technique can result in broken strings, cracked pinblocks, collapsed bridges, or catastrophic failure of the cast-iron plate.
              </li>
              <li>
                <strong className="text-slate-200">Structural Stress:</strong> Adjusting pitch significantly (pitch raising) changes the load on the instrument's structure and should only be performed by a professional.
              </li>
            </ul>
            <p className="mt-6 text-red-200/80 font-medium italic">
              Roman Digital Solutions LLC provides Resonance Tuner solely as a frequency measurement tool. We do not provide mechanical instruction. We shall NOT be held liable for any personal injury, death, or property damage resulting from your use of the App or your attempts to tune an instrument.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-4 opacity-50">3. NO PROFESSIONAL ADVICE</h2>
          <p>
            The App is intended for educational and DIY assistance. It is not a substitute for the services of a Registered Piano Technician (RPT). We make no guarantees regarding the final musical quality of your tuning or the mechanical stability of your instrument.
          </p>
        </section>

        <section>
          <h2 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-4 opacity-50">4. INTELLECTUAL PROPERTY</h2>
          <p>
            The visual designs (including the Phase-Ring and Precision Arc visualizers), the underlying Autocorrelation algorithms, and the "Resonance" branding are the exclusive property of Roman Digital Solutions LLC. You may not reverse engineer, copy, or redistribute the App's code or design patterns.
          </p>
        </section>

        <section>
          <h2 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-4 opacity-50">5. PRIVACY & DATA</h2>
          <p>
            We may collect anonymous calibration data (Inharmonicity coefficients) to improve our tuning models. We do not sell your personal information.
          </p>
        </section>

        <section className="pt-8 border-t border-slate-900">
          <h2 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-4 opacity-50">6. CONTACT</h2>
          <p>
            For legal inquiries or support, visit <a href="https://romansolutions.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-900 transition-colors">romansolutions.app</a>.
          </p>
        </section>
      </div>
      
      <div className="text-center text-[10px] text-slate-600 font-mono tracking-widest uppercase">
        &copy; 2026 ROMAN DIGITAL SOLUTIONS LLC. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
};
