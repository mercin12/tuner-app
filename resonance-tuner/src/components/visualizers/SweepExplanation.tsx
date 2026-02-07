import React from 'react';

interface SweepExplanationProps {
  onBack: () => void;
}

export const SweepExplanation: React.FC<SweepExplanationProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col gap-6 text-slate-300">
      <button 
        onClick={onBack}
        className="text-blue-400 text-xs font-bold flex items-center gap-2 hover:text-blue-300 transition-colors mb-2"
      >
        &larr; BACK TO TUNER
      </button>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">The Science of the Sweep</h2>
        <p className="text-sm leading-relaxed">
          Pianos are unique among instruments because their strings are made of high-tensile steel. These strings are incredibly stiff, which causes a physical phenomenon known as <span className="text-blue-400 font-bold">Inharmonicity</span>.
        </p>
      </section>

      <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-blue-400 font-bold uppercase text-xs tracking-[0.2em]">Why Standard Tuning Fails</h3>
        <p className="text-xs leading-relaxed text-slate-400">
          If you tuned a piano to "perfect" mathematical frequencies (like a guitar or violin), the piano would sound out of tune with itself. The stiff strings cause the overtones (harmonics) to be sharp. To make the piano sound beautiful, we must "stretch" the tuning to match these sharp overtones.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-white font-bold uppercase text-xs tracking-[0.2em]">How the Pre-Sweep Works</h3>
        <p className="text-sm leading-relaxed">
          The <span className="text-blue-400 font-bold text-lg italic">Rapid Pre-Sweep</span> is a 30-second diagnostic tool. Unlike other apps that measure as you go, Resonance gathers all the data upfront to protect your piano's stability and navigate complex patent landscapes.
        </p>
        <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30 italic text-sm text-blue-200">
          "Perform a chromatic glissando by playing every note on the piano, one by one, from bottom to top."
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-white font-bold uppercase text-xs tracking-[0.2em]">What we measure</h3>
        <ul className="list-disc pl-5 space-y-3 text-xs text-slate-400 leading-relaxed">
          <li><b className="text-slate-200">Spectral Entropy:</b> We analyze the "chaos" in the string's sound to find its natural resonance point.</li>
          <li><b className="text-slate-200">String Stiffness:</b> By measuring every note, we map the exact elasticity of your instrument's specific wire set.</li>
          <li><b className="text-slate-200">Custom Stretch Table:</b> We calculate a unique target frequency for all 88 notes, ensuring every chord sounds crystal clear.</li>
        </ul>
      </section>

      <button 
        onClick={onBack}
        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition-all mt-4"
      >
        BACK TO CALIBRATION
      </button>
    </div>
  );
};
