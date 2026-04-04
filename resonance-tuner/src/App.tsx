import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { HelpModal } from './components/visualizers/HelpModal';
import { TermsOfService } from './components/TermsOfService';
import { TermsPage } from './components/TermsPage';
import { saveTuningProfile, GUITAR_TUNINGS } from './services/database';
import type { TuningProfile } from './services/database';

type ViewMode = 'TUNER' | 'LIBRARY' | 'SETTINGS' | 'HELP' | 'TERMS' | 'LONG_EXPLANATION' | 'CALIBRATION' | 'CAPTURE';
type InstrumentMode = 'GENERAL' | 'GUITAR' | 'PIANO';
type PianoLevel = 'NOVICE' | 'PRO' | 'CALIBRATION';

function App() {
  const [view, setView] = useState<ViewMode>('TUNER');
  const [instrument, setInstrument] = useState<InstrumentMode>('GENERAL');
  const [pianoLevel, setPianoLevel] = useState<PianoLevel>('NOVICE');
  
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const [activeProfile, setActiveProfile] = useState<TuningProfile | null>(null);
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

  const handleViewChange = async (newView: ViewMode) => {
    setView(newView);
  };

  const handlePianoLevelChange = (level: PianoLevel) => {
    setPianoLevel(level);
    if (level === 'CALIBRATION') {
      setSweepProgress(0);
      setCapturedData([]);
    }
  };

  const handleSaveProfile = async (type: 'INHARMONICITY' | 'REFERENCE_TUNING') => {
    const name = prompt(type === 'INHARMONICITY' ? "Name this Piano Profile:" : "Name this Reference Tuning:");
    if (name) {
      const newProfile: TuningProfile = {
        name,
        type,
        data: capturedData
      };
      await saveTuningProfile(newProfile);
      alert("Saved to Library!");
      setActiveProfile(newProfile);
      setPianoLevel('PRO');
    }
  };

  const handleCustomTuning = async () => {
    const name = prompt("Name your custom tuning:");
    if (!name) return;
    const hzString = prompt("Enter target frequencies separated by commas:");
    if (!hzString) return;
    const data = hzString.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (data.length > 0) {
      const newProfile: TuningProfile = {
        name,
        type: 'INSTRUMENT_TARGETS',
        instrument: 'OTHER',
        data
      };
      await saveTuningProfile(newProfile);
      setActiveProfile(newProfile);
      setView('TUNER');
    }
  };

  const handleLoadProfile = (profile: TuningProfile) => {
    setActiveProfile(profile);
    if (profile.instrument === 'GUITAR') setInstrument('GUITAR');
    else if (profile.type === 'INHARMONICITY') setInstrument('PIANO');
    setView('TUNER');
  };

  useEffect(() => {
    if (instrument === 'PIANO' && pianoLevel === 'CALIBRATION' && isActive && pitchData && pitchData.frequency > 0 && pitchData.clarity > 0.5) {
      setCapturedData(prev => {
        const isSignificant = !prev.some(f => Math.abs(f - pitchData.frequency) < 1.0);
        if (isSignificant) {
          const newData = [...prev, pitchData.frequency];
          setSweepProgress(Math.min((newData.length / 88) * 100, 100));
          return newData;
        }
        return prev;
      });
    }
  }, [instrument, pianoLevel, isActive, pitchData]);

  if (!hasAcceptedTerms && view !== 'TERMS') {
    return <TermsOfService onAccept={handleAcceptTerms} onViewFullTerms={() => setView('TERMS')} />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-hidden relative">
      {view === 'TERMS' && !hasAcceptedTerms ? (
        <div className="absolute inset-0 z-[60] bg-[#020617] overflow-y-auto">
           <TermsPage onBack={() => setView('TUNER')} />
        </div>
      ) : null}
      
      <HelpModal 
        isOpen={!!helpInfo} 
        onClose={() => setHelpInfo(null)} 
        title={helpInfo?.title || ''} 
        content={helpInfo?.content || ''} 
      />

      {/* Main Header */}
      <header className="p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg">R</div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Resonance Tuner</h1>
        </div>
        <button 
          onClick={() => setHelpInfo({ title: 'About', content: 'Resonance Tuner v1.0.2 - Premium instrument tuning technology.' })}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800/50 border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          ?
        </button>
      </header>

      {/* Top Navigation Bar */}
      <nav className="px-6 mb-8">
        <div className="flex bg-[#0f172a]/80 backdrop-blur-md p-1 rounded-xl border border-slate-800/50 max-w-4xl mx-auto">
          {(['Tuner', 'Library', 'Settings', 'Help'] as const).map((label) => {
            const v = label.toUpperCase() as ViewMode;
            return (
              <button
                key={label}
                onClick={() => handleViewChange(v)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  view === v ? 'bg-slate-700/50 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto relative">
        
        {view === 'TUNER' && (
          <div className="w-full flex flex-col items-center gap-12">
            
            {/* Piano Level & Calibration Toggle */}
            {instrument === 'PIANO' && (
              <div className="flex bg-[#0f172a]/80 p-1 rounded-xl border border-slate-800/50 w-full max-w-md">
                {(['NOVICE', 'PRO', 'CALIBRATION'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handlePianoLevelChange(level)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                      pianoLevel === level ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}

            {/* Note and Frequency Display */}
            <div className="text-center space-y-2">
              {instrument === 'PIANO' && <h2 className="text-2xl font-bold text-slate-200">Piano</h2>}
              {instrument === 'PIANO' && pianoLevel === 'CALIBRATION' ? (
                <div className="space-y-4">
                   <div className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">Recording Profile</div>
                   <div className="text-4xl font-mono text-white">{Math.round(sweepProgress)}%</div>
                </div>
              ) : (
                <>
                  <div className="text-7xl font-mono font-black text-white tracking-tight">
                    {pitchData?.note || 'A4'}
                  </div>
                  <div className="text-blue-400 font-mono text-xl tracking-widest">
                    {pitchData?.frequency.toFixed(1) || '440.0'} Hz
                  </div>
                </>
              )}
            </div>

            {/* Central Gauge */}
            <div className="relative flex items-center justify-center">
              <PhaseRing cents={pitchData?.cents || 0} isActive={isActive} variant={instrument} />
              
              <div className="absolute flex flex-col items-center pointer-events-none">
                <div className="flex items-baseline gap-1">
                  <span className={`text-6xl font-mono font-black ${Math.abs(pitchData?.cents || 0) < 4 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {pitchData?.cents ? (pitchData.cents > 0 ? '+' : '') + pitchData.cents.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xl font-bold text-slate-500">¢</span>
                </div>
                <span className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Deviation</span>
              </div>

              {/* Play Button - Moved for mobile visibility and relative positioning */}
              <div className="absolute -bottom-20 sm:top-1/2 sm:-right-24 sm:-translate-y-1/2 flex justify-center w-full sm:w-auto">
                <button 
                  onClick={isActive ? stopAudio : startAudio}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-30 transition-all transform active:scale-90 ${isActive ? 'bg-rose-500 shadow-rose-900/40' : 'bg-emerald-500 shadow-emerald-900/40'}`}
                >
                  {isActive ? <div className="w-5 h-5 bg-white rounded-sm" /> : <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[18px] border-l-white ml-1" />}
                </button>
              </div>
            </div>

            {/* Instrument Mode Tabs */}
            <div className="flex bg-[#0f172a]/80 p-1 rounded-full border border-slate-800/50 w-full max-sm:max-w-xs max-w-sm mt-8">
              {(['General Tuner', 'Guitar', 'Piano'] as const).map((label) => {
                const mode = label.toUpperCase().split(' ')[0] as InstrumentMode;
                return (
                  <button
                    key={label}
                    onClick={() => setInstrument(mode)}
                    className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${
                      instrument === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Calibration Save Button */}
            {instrument === 'PIANO' && pianoLevel === 'CALIBRATION' && sweepProgress >= 10 && (
              <button 
                onClick={() => handleSaveProfile('INHARMONICITY')}
                className="py-4 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg uppercase tracking-widest animate-pulse"
              >
                Save Piano Profile
              </button>
            )}

            {/* Guitar Presets */}
            {instrument === 'GUITAR' && (
              <div className="w-full max-w-md bg-[#0f172a]/50 p-6 rounded-3xl border border-slate-800/50 space-y-6">
                <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Presets</h3>
                <div className="grid grid-cols-2 gap-3">
                  {GUITAR_TUNINGS.slice(0, 3).map((p) => (
                    <button 
                      key={p.name}
                      onClick={() => handleLoadProfile(p)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${activeProfile?.name === p.name ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                    >
                      {p.name.replace('Guitar: ', '')}
                    </button>
                  ))}
                  <button 
                    onClick={() => handleCustomTuning()}
                    className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 text-xs font-bold hover:border-slate-600 flex items-center justify-center gap-2"
                  >
                    Add Custom <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Footer Area */}
            <div className="w-full max-w-3xl bg-[#0f172a]/30 p-8 rounded-3xl border border-slate-800/30 text-center">
              <p className="text-slate-400 text-sm font-medium">
                {instrument === 'GENERAL' && "General Tuning mode. Keep the needle in the center."}
                {instrument === 'GUITAR' && "Guitar mode: Standard tuning. Tune each string until green."}
                {instrument === 'PIANO' && pianoLevel === 'CALIBRATION' ? "Play every note individually bottom to top to map string stiffness." : (instrument === 'PIANO' ? `Piano mode: ${pianoLevel === 'PRO' ? 'Pro level selected for high-precision tuning.' : 'Novice level selected for easy tuning.'}` : "")}
              </p>
            </div>
          </div>
        )}

        {/* Empty States for Library & Settings */}
        {view === 'LIBRARY' && (
          <div className="w-full max-w-2xl text-center py-20 bg-[#0f172a]/50 rounded-3xl border border-slate-800/50">
             <h2 className="text-2xl font-bold mb-2">Library</h2>
             <p className="text-slate-500">Your saved profiles will appear here.</p>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="w-full max-w-2xl text-center py-20 bg-[#0f172a]/50 rounded-3xl border border-slate-800/50">
             <h2 className="text-2xl font-bold mb-2">Settings</h2>
             <p className="text-slate-500">Global application settings coming soon.</p>
          </div>
        )}

        {view === 'HELP' && (
          <div className="w-full max-w-2xl bg-[#0f172a]/50 p-8 rounded-3xl border border-slate-800/50 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-xl">?</div>
                <h2 className="text-3xl font-black tracking-tight">Help Center</h2>
             </div>
             
             <section className="space-y-4">
                <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">Getting Started</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Select your instrument below the gauge. Click the <span className="text-emerald-400 font-bold">Play</span> button to begin. You must grant microphone access for the tuner to analyze audio signal.</p>
             </section>

             <section className="space-y-4">
                <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">Guitar & Presets</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Switch to Guitar mode to access presets like <span className="text-slate-200">Drop D</span> or <span className="text-slate-200">432 Hz</span>. Our "Sticky" logic ensures the display stays locked to your string even as the note decays.</p>
             </section>

             <section className="space-y-4 border-l-2 border-purple-500/30 pl-6 py-2">
                <h3 className="text-purple-400 font-black text-xs uppercase tracking-[0.3em]">Piano Calibration</h3>
                <p className="text-slate-400 text-sm leading-relaxed italic">"Every piano is physically unique."</p>
                <p className="text-slate-400 text-sm leading-relaxed">For professional piano tuning, select <span className="text-purple-400">Piano &rarr; Calibration</span>. Play every note on the keyboard sequentially. This allows our engine to map string inharmonicity and calculate a custom "Stretched" tuning target for your specific instrument.</p>
             </section>

             <section className="space-y-4 bg-red-950/10 p-6 rounded-2xl border border-red-900/20">
                <h3 className="text-red-500 font-black text-xs uppercase tracking-[0.3em]">Safety Notice</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Tuning instruments under high tension (especially pianos) carries inherent physical risks. Please consult the <span className="text-red-400 font-bold">Terms of Service</span> before attempting mechanical adjustments.</p>
             </section>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="p-6 text-center z-30">
        <p className="text-[10px] text-slate-600 font-medium tracking-tight">
          &copy; 2026 <a href="https://romansolutions.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500/80 hover:text-blue-400 transition-colors font-bold">Roman Digital Solutions LLC</a>. All rights reserved.
        </p>
        <button onClick={() => handleViewChange('TERMS')} className="text-[10px] text-slate-600 hover:text-slate-400 underline decoration-slate-800 underline-offset-4 transition-colors mt-2">Terms of Service</button>
      </footer>
    </div>
  );
}

export default App;
