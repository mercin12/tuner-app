import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { TensionSafety } from './components/novice/TensionSafety';
import { HelpModal } from './components/visualizers/HelpModal';
import { SweepExplanation } from './components/visualizers/SweepExplanation';
import { savePianoProfile, fetchPianoProfiles } from './services/database';
import type { PianoProfile } from './services/database';

type UserMode = 'NOVICE' | 'VIRTUOSO' | 'SWEEP' | 'HELP' | 'LONG_EXPLANATION' | 'LIBRARY' | 'CAPTURE';

function App() {
  const [mode, setMode] = useState<UserMode>('NOVICE');
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const [activeProfile, setActiveProfile] = useState<PianoProfile | null>(null);
  const [profiles, setProfiles] = useState<PianoProfile[]>([]);
  
  const { isActive, pitchData, startAudio, stopAudio } = useAudio(activeProfile);
  
  // Modal State
  const [helpInfo, setHelpInfo] = useState<{title: string, content: string, long?: boolean} | null>(null);

  // Mock settings
  const [targetFreq] = useState(440.00); 
  const [speakingLength] = useState(380); 

  const handleModeChange = async (newMode: UserMode) => {
    setMode(newMode);
    if (newMode === 'SWEEP' || newMode === 'CAPTURE') {
      setSweepProgress(0);
      setCapturedData([]);
    }
    if (newMode === 'LIBRARY') {
      const data = await fetchPianoProfiles();
      setProfiles(data);
    }
  };

  const showHelp = (title: string, content: string, long = false) => {
    setHelpInfo({ title, content, long });
  };

  const handleSaveProfile = async (type: 'INHARMONICITY' | 'REFERENCE_TUNING') => {
    const name = prompt(type === 'INHARMONICITY' ? "Name this Piano Profile (e.g. 'Yamaha C3'):" : "Name this Reference Tuning (e.g. 'Concert Pitch 2024'):");
    if (name) {
      const newProfile: PianoProfile = {
        name,
        type,
        speakingLength,
        data: capturedData
      };
      await savePianoProfile(newProfile);
      alert("Saved to Library!");
      setActiveProfile(newProfile);
      setMode('VIRTUOSO');
    }
  };

  const handleLoadProfile = (profile: PianoProfile) => {
    setActiveProfile(profile);
    setMode('VIRTUOSO');
  };

  // Capture frequency data during SWEEP/CAPTURE
  useEffect(() => {
    if ((mode === 'SWEEP' || mode === 'CAPTURE') && isActive && pitchData && pitchData.frequency > 0) {
      setCapturedData(prev => [...prev, pitchData.frequency]);
    }
  }, [mode, isActive, pitchData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <HelpModal 
        isOpen={!!helpInfo} 
        onClose={() => setHelpInfo(null)} 
        title={helpInfo?.title || ''} 
        content={helpInfo?.content || ''} 
        onLearnMore={helpInfo?.long ? () => setMode('LONG_EXPLANATION') : undefined}
      />

      {/* Header */}
      <header className="p-6 flex flex-col gap-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">R</div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Resonance Piano Tuner</h1>
          </div>
          <button 
            onClick={() => handleModeChange('HELP')}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
              mode === 'HELP' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'
            }`}
          >
            ?
          </button>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-full overflow-x-auto no-scrollbar">
          {(['HELP', 'SWEEP', 'NOVICE', 'VIRTUOSO'] as UserMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`flex-1 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${
                mode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto">
        
        {mode === 'LIBRARY' ? (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              Piano Library
              <button onClick={() => setMode('CAPTURE')} className="ml-auto text-[10px] bg-blue-600 px-3 py-1 rounded-full hover:bg-blue-500 transition-colors uppercase tracking-wider">+ Capture Ref</button>
            </h2>
            {profiles.length === 0 ? (
              <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <p>No saved profiles yet.</p>
                <p className="text-xs mt-2">Run a Sweep or Capture to save one.</p>
              </div>
            ) : (
              profiles.map((p, i) => (
                <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center hover:border-blue-500/50 transition-colors group">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{p.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.type === 'REFERENCE_TUNING' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {p.type === 'REFERENCE_TUNING' ? 'REF TUNING' : 'PROFILE'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleLoadProfile(p)}
                    className="px-4 py-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    LOAD
                  </button>
                </div>
              ))
            )}
          </div>
        ) : mode === 'LONG_EXPLANATION' ? (
          <div className="max-w-md w-full">
            <SweepExplanation onBack={() => setMode('SWEEP')} />
          </div>
        ) : mode === 'HELP' ? (
          <div className="max-w-md w-full space-y-6">
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-400 font-bold mb-3 uppercase text-xs tracking-widest">1. PRE-SWEEP (Mandatory)</h2>
              <p className="text-sm text-slate-400 leading-relaxed italic">"Play every note by itself in sequence like a chromatic scale."</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">Start with a 30-second SWEEP from bottom to top. This maps your strings' stiffness to create a custom <b>Piano Profile</b>.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-emerald-400 font-bold mb-3 uppercase text-xs tracking-widest">2. NOVICE MODE</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Safety-first interface. Includes the <b>Tension Gradient</b> tool to prevent you from breaking strings.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-500 font-bold mb-3 uppercase text-xs tracking-widest">3. VIRTUOSO MODE</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Advanced controls. Fine-tune your <b>Interval Weighting</b> preferences using our Entropy Engine.</p>
            </section>
          </div>
        ) : mode === 'SWEEP' ? (
          <div className="text-center w-full max-w-md space-y-8">
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
              Rapid Pre-Sweep
              <button onClick={() => showHelp('Pre-Sweep', 'By playing a slow glissando—each note individually in a chromatic scale sequence—Resonance calculates a custom "Stretch Curve" unique to your instrument.', true)} className="w-5 h-5 rounded-full border border-slate-600 text-[10px] text-slate-500 hover:border-blue-400">?</button>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4 italic">"Play each note individually bottom to top like a chromatic scale."</p>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Calibration Progress</span>
                <span className="font-mono text-blue-400">{Math.round(sweepProgress)}%</span>
              </div>
              <div className="overflow-hidden h-3 mb-4 flex rounded-full bg-slate-800 border border-slate-700 p-0.5">
                <div style={{ width: `${sweepProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 rounded-full transition-all duration-300"></div>
              </div>
            </div>

            {sweepProgress >= 100 && (
              <button 
                onClick={() => handleSaveProfile((mode as any) === 'CAPTURE' ? 'REFERENCE_TUNING' : 'INHARMONICITY')}
                className={`w-full py-4 ${(mode as any) === 'CAPTURE' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'} text-white font-black rounded-xl shadow-lg transition-all transform active:scale-95`}
              >
                {(mode as any) === 'CAPTURE' ? 'SAVE REFERENCE TUNING' : 'SAVE PIANO PROFILE'}
              </button>
            )}

            <div className="text-4xl font-mono text-white opacity-50">
              {pitchData?.note || '--'}
            </div>
          </div>
        ) : (
          <>
            {/* Note Display */}
            <div className="text-center">
              <div className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                {pitchData?.note || '--'}
              </div>
              <div className="text-blue-400 font-mono mt-2 tracking-widest text-lg">
                {pitchData?.frequency.toFixed(2) || '000.00'} Hz
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="relative flex items-center justify-center">
              <PhaseRing cents={pitchData?.cents || 0} isActive={isActive} />
              
              <div className="absolute flex flex-col items-center">
                <span className={`text-2xl font-mono font-bold transition-colors ${
                  Math.abs(pitchData?.cents || 0) < 1 ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {pitchData?.cents ? (pitchData.cents > 0 ? '+' : '') + pitchData.cents.toFixed(1) : '0.0'}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Cents</span>
              </div>
            </div>
          </>
        )}

        {/* Dynamic Controls */}
        <div className="w-full max-w-md space-y-4">
          {mode === 'NOVICE' && (
            <div className="relative">
              <button onClick={() => showHelp('Tension Gradient', 'This uses Hooke’s Law to estimate how close your strings are to their breaking point. It accounts for "Elasticity Compensation" to ensure a safe tuning.')} className="absolute right-4 top-4 z-10 w-5 h-5 rounded-full border border-slate-600 text-[10px] text-slate-500 hover:border-blue-400">?</button>
              <TensionSafety 
                speakingLength={speakingLength} 
                frequency={targetFreq} 
                currentFrequency={pitchData?.frequency || 0}
              />
            </div>
          )}
          
          {mode === 'VIRTUOSO' && (
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 relative shadow-xl">
              <button onClick={() => showHelp('Interval Weighting', 'Choose how the app calculates "Stretch." Pushing toward Octave Purity makes simple intervals cleaner, while Twelfths Purity prioritizes larger spanning intervals.')} className="absolute right-4 top-4 z-10 w-5 h-5 rounded-full border border-slate-600 text-[10px] text-slate-500 hover:border-blue-400">?</button>
              <h3 className="text-slate-400 text-xs font-black mb-6 uppercase tracking-[0.2em]">Interval Weighting</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-3 text-slate-500">
                    <span>OCTAVE PURITY</span>
                    <span className="text-blue-400 font-mono">75%</span>
                  </div>
                  <input type="range" className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-3 text-slate-500">
                    <span>TWELFTHS PURITY</span>
                    <span className="text-blue-400 font-mono">40%</span>
                  </div>
                  <input type="range" className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Controls */}
      {mode !== 'HELP' && (
        <footer className="p-8 flex flex-col items-center border-t border-slate-900 bg-slate-950">
          <button
            onClick={isActive ? stopAudio : startAudio}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl ${
              isActive 
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' 
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
            }`}
          >
            {isActive ? (
              <div className="w-6 h-6 bg-white rounded-sm" />
            ) : (
              <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-white ml-1" />
            )}
          </button>
          <p className="mt-4 text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
            {isActive ? 'Listening' : 'Ready'}
          </p>
        </footer>
      )}

      {/* Copyright Footer */}
      <footer className="p-4 text-center border-t border-slate-900 bg-slate-950">
        <p className="text-[9px] text-slate-500 leading-relaxed">
          &copy; 2026 <a href="https://romansolutions.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">Roman Digital Solutions LLC</a>. All rights reserved.<br/>
          Resonance Piano Tuner is a product of Roman Digital Solutions.
        </p>
      </footer>
    </div>
  );
}

export default App;