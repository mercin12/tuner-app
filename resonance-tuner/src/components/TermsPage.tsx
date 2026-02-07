import React from 'react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  return (
    <div className="bg-slate-950 text-slate-300 p-8 max-w-2xl mx-auto min-h-screen overflow-y-auto">
      <button 
        onClick={onBack}
        className="mb-6 text-blue-400 font-bold text-xs uppercase tracking-widest hover:text-blue-300 flex items-center gap-2"
      >
        &larr; Back to App
      </button>

      <h1 className="text-2xl font-black text-white mb-2">Terms of Service</h1>
      <p className="text-xs text-slate-500 mb-8">Last Updated: February 2026</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold uppercase text-xs tracking-widest mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Resonance Piano Tuner application ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use the Service. This Service is provided by <strong>Roman Digital Solutions LLC</strong>.
          </p>
        </section>

        <section className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
          <h2 className="text-red-400 font-bold uppercase text-xs tracking-widest mb-2">2. Assumption of Risk & Liability Disclaimer</h2>
          <p className="mb-2">
            <strong>YOU ACKNOWLEDGE THAT PIANO TUNING IS AN INHERENTLY RISKY ACTIVITY.</strong>
          </p>
          <p>
            Piano strings are under extreme tension (often exceeding 150 lbs per string). Adjusting tuning pins can cause strings to snap, which may result in:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
            <li>Severe personal injury (especially to eyes and hands).</li>
            <li>Permanent damage to the instrument (broken strings, cracked pinblocks, plate failure).</li>
            <li>Financial loss due to repair costs.</li>
          </ul>
          <p className="mt-4">
            <strong>Roman Digital Solutions LLC</strong> provides Resonance Tuner solely as a measurement tool. We do not control your physical actions. We shall not be held liable for any direct, indirect, incidental, or consequential damages, including but not limited to broken strings, structural damage to instruments, or personal injury resulting from your use of this application.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-xs tracking-widest mb-2">3. No Professional Warranty</h2>
          <p>
            This Service is intended for educational and DIY assistance purposes only. It is not a substitute for a professional Registered Piano Technician (RPT). We do not guarantee that using this app will result in a concert-quality tuning or that your instrument is capable of holding a tune.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-xs tracking-widest mb-2">4. User Accounts & Data</h2>
          <p>
            We may collect tuning profiles and calibration data to improve your experience. By using the Library features, you grant Roman Digital Solutions LLC a license to store and process this technical data. We respect your privacy and will not sell your personal identifiable information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-xs tracking-widest mb-2">5. Intellectual Property</h2>
          <p>
            The "Resonance" name, the "Phase-Ring" visualizer design, the "Spectral Entropy" calibration algorithms, and all underlying code are the exclusive property of Roman Digital Solutions LLC. You may not reverse engineer, decompile, or attempt to derive the source code of the app.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold uppercase text-xs tracking-widest mb-2">6. Contact</h2>
          <p>
            For support or legal inquiries, please contact us at: <a href="https://romansolutions.app" className="text-blue-400 hover:underline">romansolutions.app</a>
          </p>
        </section>
      </div>
      
      <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
        &copy; 2026 Roman Digital Solutions LLC. All rights reserved.
      </div>
    </div>
  );
};
