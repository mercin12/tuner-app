import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { HelpModal } from './components/visualizers/HelpModal';
import { TermsOfService } from './components/TermsOfService';
import { TermsPage } from './components/TermsPage';
import { saveTuningProfile, fetchTuningProfiles, GUITAR_TUNINGS } from './services/database';
import type { TuningProfile } from './services/database';

type ViewMode = 'TUNER' | 'CALIBRATION' | 'HELP' | 'LIBRARY' | 'SETTINGS' | 'TERMS' | 'LONG_EXPLANATION' | 'CAPTURE';
type InstrumentMode = 'GENERAL' | 'GUITAR' | 'PIANO';
type PianoLevel = 'NOVICE' | 'PRO';

function App() {
  const [view, setView] = useState<ViewMode>('TUNER');
  const [instrument, setInstrument] = useState<InstrumentMode>('GENERAL');
  const [pianoLevel, setPianoLevel] = useState<PianoLevel>('NOVICE');
  
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const [activeProfile, setActiveProfile] = useState<TuningProfile | null>(null);
  const [profiles, setProfiles] = useState<TuningProfile[]>([]);
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
    if (newView === 'CALIBRATION' || newView === 'CAPTURE') {
      setSweepProgress(0);
      setCapturedData([]);
    }
    if (newView === 'LIBRARY') {
      try {
        const data = await fetchTuningProfiles();
        setProfiles(data);
      } catch (e) {
        console.error(e);
      }
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
      setView('TUNER');
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
      setProfiles(prev => [...prev, newProfile]);
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
    if ((view === 'CALIBRATION' || view === 'CAPTURE') && isActive && pitchData && pitchData.frequency > 0 && pitchData.clarity > 0.5) {
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
  }, [view, isActive, pitchData]);

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
          onClick={() => setHelpInfo({ title: 'Help', content: 'Detailed help information will go here.' })}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800/50 border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          ?
        </button>
      </header>

      {/* Top Navigation Bar */}
      <nav className="px-6 mb-8">
        <div className="flex bg-[#0f172a]/80 backdrop-blur-md p-1 rounded-xl border border-slate-800/50 max-w-4xl mx-auto">
          {(['Help', 'Library', 'Calibration', 'Settings'] as const).map((label) => {
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
            
            {/* Piano Level Toggle (Only in Piano mode) */}
            {instrument === 'PIANO' && (
              <div className="flex bg-[#0f172a]/80 p-1 rounded-xl border border-slate-800/50 w-full max-w-md">
                {(['NOVICE', 'PRO'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setPianoLevel(level)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
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
              <div className="text-blue-400 font-mono text-xl tracking-widest">
                {pitchData?.frequency.toFixed(1) || '440.0'} Hz
              </div>
              {instrument === 'PIANO' && (
                <div className="inline-block px-6 py-1.5 bg-slate-800/50 rounded-full border border-slate-700 text-slate-300 font-bold text-sm">
                  {pitchData?.note || 'C4'}
                </div>
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

              {/* Play Button */}
              <button 
                onClick={isActive ? stopAudio : startAudio}
                className={`absolute top-1/2 -right-24 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-30 transition-all transform active:scale-90 ${isActive ? 'bg-emerald-500 shadow-emerald-900/40' : 'bg-emerald-600 shadow-emerald-900/20'}`}
              >
                {isActive ? <div className="w-5 h-5 bg-white rounded-sm" /> : <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[18px] border-l-white ml-1" />}
              </button>
            </div>

            {/* Instrument Mode Tabs */}
            <div className="flex bg-[#0f172a]/80 p-1 rounded-full border border-slate-800/50 w-full max-sm:max-w-xs max-w-sm">
              {(['General Tuner', 'Guitar', 'Piano'] as const).map((label) => {
                const mode = label.toUpperCase().split(' ')[0] as InstrumentMode;
                return (
                  <button
                    key={label}
                    onClick={() => setInstrument(mode)}
                    className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
                      instrument === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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
                {instrument === 'PIANO' && `Piano mode: ${pianoLevel === 'PRO' ? 'Pro level selected for high-precision tuning.' : 'Novice level selected for easy tuning.'}`}
              </p>
            </div>
          </div>
        )}

        {/* Calibration/Capture View */}
        {(view === 'CALIBRATION' || view === 'CAPTURE') && (
          <div className="text-center w-full max-w-md space-y-8 relative">
            <div className="flex justify-center">
              <button 
                onClick={isActive ? stopAudio : startAudio}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-90 ${isActive ? 'bg-rose-600 shadow-rose-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}
              >
                {isActive ? <div className="w-6 h-6 bg-white rounded-sm" /> : <div className="w-0 h-0 border-y-[12px] border-y-transparent border-l-[20px] border-l-white ml-1" />}
              </button>
            </div>
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest">
              {view === 'CALIBRATION' ? 'Rapid Calibration' : 'Capture Reference'}
            </h2>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                <span>Progress</span>
                <span className="font-mono text-blue-400">{Math.round(sweepProgress)}%</span>
              </div>
              <div className="overflow-hidden h-3 mb-4 flex rounded-full bg-slate-800 border border-slate-700 p-0.5 shadow-inner">
                <div style={{ width: `${sweepProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 rounded-full transition-all duration-300"></div>
              </div>
            </div>
            {sweepProgress >= 100 && (
              <button 
                onClick={() => handleSaveProfile(view === 'CALIBRATION' ? 'INHARMONICITY' : 'REFERENCE_TUNING')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all uppercase tracking-widest"
              >
                SAVE PROFILE
              </button>
            )}
          </div>
        )}

        {/* Library View */}
        {view === 'LIBRARY' && (
          <div className="w-full max-w-2xl bg-[#0f172a]/50 p-8 rounded-3xl border border-slate-800/50">
             <h2 className="text-2xl font-bold mb-6">Library</h2>
             <div className="space-y-3">
                {profiles.map((p, i) => (
                  <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div className="text-left">
                      <h3 className="font-bold text-white text-sm">{p.name}</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter bg-emerald-500/20 text-emerald-300">
                        {p.type}
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
