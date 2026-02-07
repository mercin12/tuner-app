import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { HelpModal } from './components/visualizers/HelpModal';
import { SweepExplanation } from './components/visualizers/SweepExplanation';
import { TermsOfService } from './components/TermsOfService';
import { savePianoProfile, fetchPianoProfiles } from './services/database';
import type { PianoProfile } from './services/database';

type UserMode = 'NOVICE' | 'VIRTUOSO' | 'CALIBRATION' | 'HELP' | 'LONG_EXPLANATION' | 'LIBRARY' | 'CAPTURE';

function App() {
  const [mode, setMode] = useState<UserMode>('NOVICE');
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const [activeProfile, setActiveProfile] = useState<PianoProfile | null>(null);
  const [profiles, setProfiles] = useState<PianoProfile[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  
  const { isActive, pitchData, startAudio, stopAudio } = useAudio(activeProfile);
  
  // Modal State
  const [helpInfo, setHelpInfo] = useState<{title: string, content: string, long?: boolean} | null>(null);

  // Check for terms acceptance on load
  useEffect(() => {
    const accepted = localStorage.getItem('resonance_terms_accepted');
    if (accepted) setHasAcceptedTerms(true);
  }, []);

  const handleAcceptTerms = () => {
    localStorage.setItem('resonance_terms_accepted', 'true');
    setHasAcceptedTerms(true);
  };

  // Auto-hide menu when tuning starts
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setIsMenuVisible(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsMenuVisible(true);
    }
  }, [isActive]);

  const handleModeChange = async (newMode: UserMode) => {
    setMode(newMode);
    if (newMode === 'CALIBRATION' || newMode === 'CAPTURE') {
      setSweepProgress(0);
      setCapturedData([]);
    }
    if (newMode === 'LIBRARY') {
      try {
        const data = await fetchPianoProfiles();
        setProfiles(data);
      } catch (e) {
        console.error(e);
      }
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
        speakingLength: 0,
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

  // Capture frequency data during CALIBRATION/CAPTURE and update progress
  useEffect(() => {
    if ((mode === 'CALIBRATION' || mode === 'CAPTURE') && isActive && pitchData && pitchData.frequency > 0) {
      setCapturedData(prev => {
        const isSignificant = !prev.some(f => Math.abs(f - pitchData.frequency) < 1.0);
        if (isSignificant) {
          const newData = [...prev, pitchData.frequency];
          setSweepProgress(Math.min((newData.length / 50) * 100, 100));
          return newData;
        }
        return prev;
      });
    }
  }, [mode, isActive, pitchData]);

  if (!hasAcceptedTerms) {
    return <TermsOfService onAccept={handleAcceptTerms} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden relative" onClick={() => !isMenuVisible && setIsMenuVisible(true)}>
      <HelpModal 
        isOpen={!!helpInfo} 
        onClose={() => setHelpInfo(null)} 
        title={helpInfo?.title || ''} 
        content={helpInfo?.content || ''} 
        onLearnMore={helpInfo?.long ? () => setMode('LONG_EXPLANATION') : undefined}
      />

      {/* Header (Auto-Hides) */}
      <header className={`absolute top-0 left-0 right-0 p-6 flex flex-col gap-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md z-20 transition-transform duration-500 ${isMenuVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">R</div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Resonance Tuner</h1>
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
          {(['HELP', 'LIBRARY', 'CALIBRATION', 'NOVICE', 'VIRTUOSO'] as UserMode[]).map((m) => (
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
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4 w-full max-w-lg mx-auto mt-16">
        
        {mode === 'LIBRARY' ? (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              Piano Library
              <button onClick={() => handleModeChange('CAPTURE')} className="ml-auto text-[10px] bg-blue-600 px-3 py-1 rounded-full hover:bg-blue-500 transition-colors uppercase tracking-wider">+ Capture Ref</button>
            </h2>
            {profiles.length === 0 ? (
              <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <p>No saved profiles yet.</p>
                <p className="text-xs mt-2">Run a Calibration or Capture to save one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((p, i) => (
                  <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center hover:border-blue-500/50 transition-colors group">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors text-sm">{p.name}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                        p.type === 'REFERENCE_TUNING' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {p.type === 'REFERENCE_TUNING' ? 'REF TUNING' : 'PROFILE'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleLoadProfile(p)}
                      className="px-4 py-2 bg-slate-800 hover:bg-blue-600 rounded-lg text-[10px] font-black transition-colors"
                    >
                      LOAD
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : mode === 'LONG_EXPLANATION' ? (
          <div className="max-w-md w-full">
            <SweepExplanation onBack={() => setMode('CALIBRATION')} />
          </div>
        ) : mode === 'HELP' ? (
          <div className="max-w-md w-full space-y-6 overflow-y-auto max-h-[70vh] pr-2">
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-400 font-bold mb-3 uppercase text-xs tracking-widest">1. CALIBRATION (Mandatory)</h2>
              <p className="text-sm text-slate-400 leading-relaxed italic">"Play every note by itself in sequence like a chromatic scale."</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">Start with a 30-second Calibration from bottom to top. This maps your strings' stiffness to create a custom <b>Piano Profile</b>.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-purple-400 font-bold mb-3 uppercase text-xs tracking-widest">2. LIBRARY & CAPTURE</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Save your Calibrations. Use <b>Capture Ref</b> to record a "Golden Master" tuning from a perfectly tuned piano to use as a future target.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-emerald-400 font-bold mb-3 uppercase text-xs tracking-widest">3. NOVICE MODE</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Safety-first interface.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-500 font-bold mb-3 uppercase text-xs tracking-widest">4. VIRTUOSO MODE</h2>
              <p className="text-sm text-slate-400 leading-relaxed">Advanced controls. Fine-tune your <b>Interval Weighting</b> preferences using our Entropy Engine.</p>
            </section>
          </div>
        ) : (mode === 'CALIBRATION' || mode === 'CAPTURE') ? (
          <div className="text-center w-full max-w-md space-y-8 relative">
            
            {/* Start/Stop Controls for Calibration/Capture */}
            <div className="flex justify-center">
              <button 
                onClick={isActive ? stopAudio : startAudio}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-90 ${isActive ? 'bg-rose-600 shadow-rose-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}
              >
                {isActive ? <div className="w-6 h-6 bg-white rounded-sm" /> : <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-white ml-1" />}
              </button>
            </div>

            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
              {mode === 'CALIBRATION' ? 'Rapid Calibration' : 'Capture Reference'}
              <button onClick={() => showHelp(mode === 'CALIBRATION' ? 'Calibration' : 'Reference Capture', mode === 'CALIBRATION' ? 'By playing a slow glissando...' : 'Record the exact frequencies of a tuned piano to use as a target for future tunings.', true)} className="w-5 h-5 rounded-full border border-slate-600 text-[10px] text-slate-500 hover:border-blue-400 transition-colors">?</button>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4 italic">"Play each note individually bottom to top like a chromatic scale."</p>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                <span>{mode === 'CALIBRATION' ? 'Calibration' : 'Capture'} Progress</span>
                <span className="font-mono text-blue-400">{Math.round(sweepProgress)}%</span>
              </div>
              <div className="overflow-hidden h-3 mb-4 flex rounded-full bg-slate-800 border border-slate-700 p-0.5 shadow-inner">
                <div style={{ width: `${sweepProgress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${mode === 'CAPTURE' ? 'bg-purple-500' : 'bg-blue-500'} rounded-full transition-all duration-300`}></div>
              </div>
            </div>

            {sweepProgress >= 100 && (
              <button 
                onClick={() => handleSaveProfile(mode === 'CALIBRATION' ? 'INHARMONICITY' : 'REFERENCE_TUNING')}
                className={`w-full py-4 ${mode === 'CAPTURE' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'} text-white font-black rounded-xl shadow-lg transition-all transform active:scale-95 uppercase tracking-widest`}
              >
                {mode === 'CALIBRATION' ? 'SAVE PIANO PROFILE' : 'SAVE REFERENCE TUNING'}
              </button>
            )}

            <div className="text-4xl font-mono text-white opacity-50">
              {pitchData?.note || '--'}
            </div>
          </div>
        ) : (
          /* Main Tuner View - Compact & Centered */
          <div className="relative w-full flex flex-col items-center">
            
            {/* Note Display */}
            <div className="text-center relative mb-4">
              {activeProfile && (
                <div className="absolute -top-12 left-0 right-0 flex justify-center">
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    activeProfile.type === 'REFERENCE_TUNING' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-900/10' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-900/10'
                  }`}>
                    Active: {activeProfile.name}
                  </span>
                </div>
              )}
              <div className="text-8xl font-black tracking-tighter text-white drop-shadow-lg">
                {pitchData?.note || '--'}
              </div>
              <div className="text-blue-400 font-mono text-sm tracking-widest mt-1">
                {pitchData?.frequency.toFixed(1) || '0.0'} Hz
              </div>
            </div>

            {/* Visualizer Area with Embedded Controls */}
            <div className="relative flex items-center justify-center">
              
              {/* Play/Stop Controls (Top Right Overlay) */}
              <button 
                onClick={isActive ? stopAudio : startAudio}
                className={`absolute -top-4 -right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-30 transition-all transform active:scale-90 ${isActive ? 'bg-rose-600 shadow-rose-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}
              >
                {isActive ? <div className="w-4 h-4 bg-white rounded-sm" /> : <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white ml-1" />}
              </button>

              {/* Smaller Phase Ring */}
              <div className="transform scale-[0.85]">
                <PhaseRing cents={pitchData?.cents || 0} isActive={isActive} />
              </div>
              
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className={`text-3xl font-mono font-black ${Math.abs(pitchData?.cents || 0) < 1 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {pitchData?.cents ? (pitchData.cents > 0 ? '+' : '') + pitchData.cents.toFixed(1) : '0.0'}
                </span>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Cents</span>
              </div>
            </div>

            {/* Dynamic Controls (Below Ring) */}
            <div className="w-full mt-10">
              {mode === 'NOVICE' && (
                <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                  <p className="text-sm text-slate-400">Basic tuning mode. Focus on the green zone!</p>
                </div>
              )}
              {mode === 'VIRTUOSO' && (
                <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 relative shadow-2xl overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                   <button onClick={() => showHelp('Interval Weighting', 'Choose how the app calculates "Stretch." Pushing toward Octave Purity makes simple intervals cleaner, while Twelfths Purity prioritizes larger spanning intervals.')} className="absolute right-4 top-4 z-10 w-6 h-6 rounded-full border border-slate-700 text-[10px] text-slate-500 hover:border-blue-400 transition-colors">?</button>
                   <h3 className="text-slate-400 text-[10px] font-black mb-6 uppercase tracking-[0.3em]">Interval Weighting</h3>
                   <div className="space-y-8">
                     <div>
                        <div className="flex justify-between text-[10px] font-bold mb-3 text-slate-500 tracking-widest">
                           <span>OCTAVE PURITY</span>
                           <span className="text-blue-400 font-mono">75%</span>
                        </div>
                        <input type="range" className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     </div>
                     <div>
                        <div className="flex justify-between text-[10px] font-bold mb-3 text-slate-500 tracking-widest">
                           <span>TWELFTHS PURITY</span>
                           <span className="text-blue-400 font-mono">40%</span>
                        </div>
                        <input type="range" className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Copyright Footer */}
      <footer className="p-4 text-center border-t border-slate-900 bg-slate-950 z-30">
        <p className="text-[9px] text-slate-500 leading-relaxed">
          &copy; 2026 <a href="https://romansolutions.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors font-bold">Roman Digital Solutions LLC</a>. All rights reserved.<br/>
          Resonance Tuner is a product of Roman Digital Solutions.
        </p>
      </footer>
    </div>
  );
}

export default App;
