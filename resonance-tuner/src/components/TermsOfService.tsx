import React from 'react';

interface TermsOfServiceProps {
  onAccept: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-red-900/50 rounded-2xl max-w-md w-full p-8 shadow-2xl shadow-red-900/20">
        <div className="flex items-center gap-3 mb-6 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-black uppercase tracking-widest">Risk Warning</h2>
        </div>
        
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed mb-8">
          <p>
            <strong className="text-white">Piano tuning involves inherent risks.</strong>
          </p>
          <p>
            Piano strings are under immense tension (up to 20 tons total per instrument). Old, rusty, or fatigued strings <strong className="text-red-400">can and will snap</strong> without warning, potentially causing injury or damage to the instrument.
          </p>
          <p>
            By using <span className="text-blue-400 font-bold">Resonance Piano Tuner</span>, you acknowledge that:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>You assume full responsibility for any damage to your piano.</li>
            <li>You assume full responsibility for any personal injury.</li>
            <li>Resonance Tuner provides measurement data only and cannot physically prevent string breakage.</li>
          </ul>
        </div>

        <button 
          onClick={onAccept}
          className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg transition-all transform active:scale-95 uppercase tracking-widest text-xs"
        >
          I Accept the Risk
        </button>
      </div>
    </div>
  );
};
