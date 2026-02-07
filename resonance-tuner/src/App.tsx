import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { TensionSafety } from './components/novice/TensionSafety';

import { useState, useEffect, useCallback } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { TensionSafety } from './components/novice/TensionSafety';
import { HelpModal } from './components/visualizers/HelpModal';
import { savePianoProfile } from './services/database';

type UserMode = 'NOVICE' | 'VIRTUOSO' | 'SWEEP' | 'HELP';

function App() {
  const [mode, setMode] = useState<UserMode>('NOVICE');
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const { isActive, pitchData, startAudio, stopAudio } = useAudio();
  
  // Modal State
  const [helpInfo, setHelpInfo] = useState<{title: string, content: string} | null>(null);

  // Mock settings
  const [targetFreq] = useState(440.00); 
  const [speakingLength] = useState(380); 

  const handleModeChange = (newMode: UserMode) => {
    setMode(newMode);
    if (newMode === 'SWEEP') {
      setSweepProgress(0);
      setCapturedData([]);
    }
  };

  const handleSaveProfile = async () => {
    const name = prompt("Name this piano profile (e.g. 'Yamaha C3'):");
    if (name) {
      await savePianoProfile({
        name,
        speakingLength,
        // capturedData represents the unique string stiffness profile
      } as any);
      alert("Profile Saved to Neon!");
      setMode('VIRTUOSO');
    }
  };

  // Capture sweep data
  useEffect(() => {
    if (mode === 'SWEEP' && isActive && pitchData && pitchData.frequency > 0) {
      setCapturedData(prev => [...prev, pitchData.frequency]);
    }
  }, [mode, isActive, pitchData]);

  // Start sweep timer
  useEffect(() => {
    let interval: any;
    if (mode === 'SWEEP' && isActive && sweepProgress < 100) {
      interval = setInterval(() => {
        setSweepProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / (30 * 10)); 
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [mode, isActive, sweepProgress]);

  const showHelp = (title: string, content: string) => {
    setHelpInfo({ title, content });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <HelpModal 
        isOpen={!!helpInfo} 
        onClose={() => setHelpInfo(null)} 
        title={helpInfo?.title || ''} 
        content={helpInfo?.content || ''} 
      />

      {/* Header */}
      <header className="p-6 flex flex-col gap-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">R</div>
            <h1 className="text-xl font-bold tracking-tight">RESONANCE</h1>
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
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        
        {mode === 'HELP' ? (
          <div className="max-w-md w-full space-y-6 overflow-y-auto max-h-[60vh] pr-2">
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-400 font-bold mb-3">1. PRE-SWEEP (Mandatory)</h2>
              <p className="text-sm text-slate-400">Pianos aren't perfect. Strings are stiff, making high notes naturally sharp. Start with a 30-second SWEEP. Play every note slowly from bottom to top. This creates your <b>Piano Profile</b>.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-emerald-400 font-bold mb-3">2. NOVICE MODE</h2>
              <p className="text-sm text-slate-400">Use this if you are a DIYer. It includes the <b>Tension Gradient</b> tool to prevent you from breaking strings by alerting you when tension is too high.</p>
            </section>
            <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-blue-500 font-bold mb-3">3. VIRTUOSO MODE</h2>
              <p className="text-sm text-slate-400">For pros. Adjust <b>Interval Weighting</b> to choose between pure octaves or pure twelfths. Resonance uses <b>Spectral Entropy</b> to calculate the perfect stretch curve.</p>
            </section>
          </div>
        ) : mode === 'SWEEP' ? (
          <div className="text-center w-full max-w-md space-y-8">
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
              Rapid Pre-Sweep
              <button onClick={() => showHelp('Pre-Sweep', 'By playing a 30-second chromatic glissando, Resonance analyzes the specific thickness and stiffness of your piano strings to calculate a custom "Stretch Curve" unique to your instrument.')} className="w-5 h-5 rounded-full border border-slate-600 text-[10px] text-slate-500 hover:border-blue-400">?</button>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed px-4">Press PLAY and play a slow glissando across all keys for 30 seconds to calibrate.</p>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">Calibration Progress</span>
                <span className="text-xs font-mono text-blue-400">{Math.round(sweepProgress)}%</span>
              </div>
              <div className="overflow-hidden h-3 mb-4 flex rounded-full bg-slate-800 border border-slate-700 p-0.5">
                <div style={{ width: `${sweepProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 rounded-full transition-all duration-300"></div>
              </div>
            </div>

            {sweepProgress >= 100 && (
              <button 
                onClick={handleSaveProfile}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95"
              >
                SAVE PIANO PROFILE
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
    </div>
  );
}

export default App;
      </footer>
    </div>
  );
}

export default App;