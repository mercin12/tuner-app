import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { TensionSafety } from './components/novice/TensionSafety';

type UserMode = 'NOVICE' | 'VIRTUOSO' | 'SWEEP';

function App() {
  const [mode, setMode] = useState<UserMode>('NOVICE');
  const [sweepProgress, setSweepProgress] = useState(0);
  const { isActive, pitchData, startAudio, stopAudio } = useAudio();
  
  // Mock settings
  const [targetFreq] = useState(440.00); // A4
  const [speakingLength] = useState(380); // mm

  const handleModeChange = (newMode: UserMode) => {
    setMode(newMode);
    if (newMode === 'SWEEP') {
      setSweepProgress(0);
    }
  };

  // Start sweep timer if in sweep mode and active
  useEffect(() => {
    let interval: any;
    if (mode === 'SWEEP' && isActive && sweepProgress < 100) {
      interval = setInterval(() => {
        setSweepProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / (30 * 10)); // 30 seconds total
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [mode, isActive, sweepProgress]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">R</div>
          <h1 className="text-xl font-bold tracking-tight">RESONANCE</h1>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-full">
          {(['SWEEP', 'NOVICE', 'VIRTUOSO'] as UserMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
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
        
        {mode === 'SWEEP' ? (
          <div className="text-center w-full max-w-md space-y-8">
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-widest">Rapid Pre-Sweep</h2>
            <p className="text-slate-400 text-sm">Play a slow chromatic glissando across all keys for 30 seconds to calibrate.</p>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Calibration Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {Math.round(sweepProgress)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-800">
                <div style={{ width: `${sweepProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"></div>
              </div>
            </div>

            <div className="text-4xl font-mono text-white">
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
              <div className="text-blue-400 font-mono mt-2 tracking-widest">
                {pitchData?.frequency.toFixed(2) || '000.00'} Hz
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="relative flex items-center justify-center">
              <PhaseRing cents={pitchData?.cents || 0} isActive={isActive} />
              
              {/* Cent Indicator Overlay */}
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

        {/* Dynamic Controls based on Persona */}
        <div className="w-full max-w-md space-y-4">
          {mode === 'NOVICE' && (
            <TensionSafety 
              speakingLength={speakingLength} 
              frequency={targetFreq} 
              currentFrequency={pitchData?.frequency || 0}
            />
          )}
          
          {mode === 'VIRTUOSO' && (
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <h3 className="text-slate-400 text-sm font-semibold mb-4 uppercase tracking-wider">Interval Weighting</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>OCTAVE PURITY</span>
                    <span className="text-blue-400">75%</span>
                  </div>
                  <input type="range" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>TWELFTHS PURITY</span>
                    <span className="text-blue-400">40%</span>
                  </div>
                  <input type="range" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Controls */}
      <footer className="p-8 flex flex-col items-center border-t border-slate-900 bg-slate-950">
        <button
          onClick={isActive ? stopAudio : startAudio}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-2xl ${
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
        <p className="mt-4 text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          {isActive ? 'Listening...' : 'Ready to Tune'}
        </p>
      </footer>
    </div>
  );
}

export default App;