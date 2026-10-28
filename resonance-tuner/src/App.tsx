import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAudio } from './hooks/useAudio';
import type { PitchResult } from './types/audio';
import { PhaseRing } from './components/visualizers/PhaseRing';
import { HelpModal } from './components/visualizers/HelpModal';
import { SweepExplanation } from './components/visualizers/SweepExplanation';
import { TensionSafety } from './components/novice/TensionSafety';
import { TermsOfService } from './components/TermsOfService';
import { TermsPage } from './components/TermsPage';
import {
  saveTuningProfile,
  fetchTuningProfiles,
  deleteTuningProfile,
  GUITAR_TUNINGS,
} from './services/database';
import type { TuningProfile } from './services/database';

type ViewMode =
  | 'TUNER'
  | 'LIBRARY'
  | 'SETTINGS'
  | 'HELP'
  | 'TERMS'
  | 'LONG_EXPLANATION'
  | 'CALIBRATION'
  | 'CAPTURE';
type InstrumentMode = 'GENERAL' | 'GUITAR' | 'PIANO';
type PianoLevel = 'NOVICE' | 'PRO' | 'CALIBRATION';

function App() {
  const [view, setView] = useState<ViewMode>('TUNER');
  const [instrument, setInstrument] = useState<InstrumentMode>('GENERAL');
  const [pianoLevel, setPianoLevel] = useState<PianoLevel>('NOVICE');

  // Calibration & Saved Profiles State
  const [sweepProgress, setSweepProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<number[]>([]);
  const [activeProfile, setActiveProfile] = useState<TuningProfile | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<TuningProfile[]>([]);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(() => {
    return localStorage.getItem('resonance_terms_accepted') === 'true';
  });

  // Guitar String Lock (null = Auto-detect string, 0..5 = locked string index)
  const [lockedStringIndex, setLockedStringIndex] = useState<number | null>(null);

  // Piano Novice & Pro Controls
  const [speakingLength, setSpeakingLength] = useState<number>(620); // mm
  const [octaveWeight, setOctaveWeight] = useState<number>(75); // %
  const [twelfthWeight, setTwelfthWeight] = useState<number>(40); // %

  // Global Settings
  const [referencePitch, setReferencePitch] = useState<number>(() => {
    const saved = localStorage.getItem('resonance_ref_pitch');
    const parsed = saved ? parseFloat(saved) : 440;
    return !isNaN(parsed) && parsed >= 415 && parsed <= 466 ? parsed : 440;
  });
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(true);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customHzInput, setCustomHzInput] = useState<string>('82.41, 110.00, 146.83, 196.00, 246.94, 329.63');

  const handlePitchDetected = useCallback(
    (detected: PitchResult) => {
      if (
        instrument === 'PIANO' &&
        pianoLevel === 'CALIBRATION' &&
        !detected.isSilent &&
        detected.frequency > 25 &&
        detected.clarity > 0.5
      ) {
        setCapturedData((prev) => {
          const alreadyCaptured = prev.some(
            (f) => Math.abs(1200 * Math.log2(f / detected.frequency)) < 40
          );
          if (!alreadyCaptured) {
            const newData = [...prev, Number(detected.frequency.toFixed(2))].sort((a, b) => a - b);
            setSweepProgress(Math.min((newData.length / 88) * 100, 100));
            return newData;
          }
          return prev;
        });
      }
    },
    [instrument, pianoLevel]
  );

  const audioOptions = useMemo(
    () => ({
      instrument,
      pianoLevel,
      referencePitch,
      octaveWeight,
      twelfthWeight,
      targetStringIndex: instrument === 'GUITAR' ? lockedStringIndex : null,
      onPitchDetected: handlePitchDetected,
    }),
    [instrument, pianoLevel, referencePitch, octaveWeight, twelfthWeight, lockedStringIndex, handlePitchDetected]
  );

  const { isActive, pitchData, error: audioError, startAudio, stopAudio, playReferenceTone } =
    useAudio(activeProfile, audioOptions);

  // Modal State
  const [helpInfo, setHelpInfo] = useState<{
    title: string;
    content: string;
    long?: boolean;
  } | null>(null);

  // Load saved profiles on mount
  useEffect(() => {
    fetchTuningProfiles().then(setSavedProfiles).catch(console.error);
  }, []);

  // Haptic pitch lock feedback when inTune transitions to true
  useEffect(() => {
    if (
      hapticEnabled &&
      isActive &&
      pitchData &&
      !pitchData.isSilent &&
      pitchData.inTune &&
      typeof navigator !== 'undefined' &&
      navigator.vibrate
    ) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }, [hapticEnabled, isActive, pitchData]);

  const handleAcceptTerms = () => {
    localStorage.setItem('resonance_terms_accepted', 'true');
    setHasAcceptedTerms(true);
  };

  const handleViewChange = async (newView: ViewMode) => {
    setView(newView);
    if (newView === 'LIBRARY') {
      const list = await fetchTuningProfiles();
      setSavedProfiles(list);
    }
  };

  const handleInstrumentChange = (mode: InstrumentMode) => {
    setInstrument(mode);
    setLockedStringIndex(null);

    if (mode === 'GUITAR') {
      // Automatically activate Guitar: Standard if not already using a guitar profile
      if (!activeProfile || activeProfile.instrument !== 'GUITAR') {
        setActiveProfile(GUITAR_TUNINGS[0]);
      }
    } else if (mode === 'GENERAL') {
      setActiveProfile(null);
    } else if (mode === 'PIANO') {
      if (activeProfile?.instrument === 'GUITAR') {
        setActiveProfile(null);
      }
    }
  };

  const handlePianoLevelChange = (level: PianoLevel) => {
    setPianoLevel(level);
    if (level === 'CALIBRATION') {
      setSweepProgress(0);
      setCapturedData([]);
    }
  };

  const handleSaveProfile = async (type: 'INHARMONICITY' | 'REFERENCE_TUNING') => {
    const defaultName =
      type === 'INHARMONICITY'
        ? `Piano Profile (${new Date().toLocaleDateString()})`
        : `Reference Tuning (${new Date().toLocaleDateString()})`;
    const name =
      typeof window !== 'undefined' && window.prompt
        ? window.prompt(
            type === 'INHARMONICITY' ? 'Name this Piano Profile:' : 'Name this Reference Tuning:',
            defaultName
          ) || defaultName
        : defaultName;

    const newProfile: TuningProfile = {
      name,
      type,
      instrument: 'PIANO',
      data: capturedData,
    };
    const saved = await saveTuningProfile(newProfile);
    const updatedList = await fetchTuningProfiles();
    setSavedProfiles(updatedList);
    setActiveProfile(saved);
    setPianoLevel('PRO');
  };

  const handleSaveCustomTuning = async () => {
    if (!customName.trim()) return;
    const data = customHzInput
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n >= 20 && n <= 4500);

    if (data.length > 0) {
      const newProfile: TuningProfile = {
        name: customName.trim(),
        type: 'INSTRUMENT_TARGETS',
        instrument: 'GUITAR',
        data,
      };
      const saved = await saveTuningProfile(newProfile);
      const updatedList = await fetchTuningProfiles();
      setSavedProfiles(updatedList);
      setActiveProfile(saved);
      setShowCustomModal(false);
      setCustomName('');
      setView('TUNER');
    }
  };

  const handleLoadProfile = (profile: TuningProfile) => {
    setActiveProfile(profile);
    setLockedStringIndex(null);
    if (profile.instrument === 'GUITAR' || profile.type === 'INSTRUMENT_TARGETS') {
      setInstrument('GUITAR');
    } else if (profile.type === 'INHARMONICITY' || profile.type === 'REFERENCE_TUNING') {
      setInstrument('PIANO');
    }
    setView('TUNER');
  };

  const handleDeleteProfile = (idOrName: number | string) => {
    const updated = deleteTuningProfile(idOrName);
    setSavedProfiles(updated);
    if (activeProfile && (activeProfile.id === idOrName || activeProfile.name === idOrName)) {
      setActiveProfile(instrument === 'GUITAR' ? GUITAR_TUNINGS[0] : null);
    }
  };

  const handleReferencePitchChange = (newHz: number) => {
    const clamped = Math.max(415, Math.min(466, newHz));
    setReferencePitch(clamped);
    localStorage.setItem('resonance_ref_pitch', String(clamped));
  };

  if (!hasAcceptedTerms && view !== 'TERMS') {
    return (
      <TermsOfService
        onAccept={handleAcceptTerms}
        onViewFullTerms={() => setView('TERMS')}
      />
    );
  }

  const displayedCents = pitchData && !pitchData.isSilent ? pitchData.cents : 0;
  const isNoteInTune = Math.abs(displayedCents) < 4;
  const tuningDirectionText =
    !isActive || !pitchData || pitchData.isSilent
      ? 'Play a note to begin tuning'
      : isNoteInTune
      ? 'IN TUNE — Pitch Locked'
      : displayedCents < 0
      ? `FLAT (${displayedCents.toFixed(1)}¢) — Tune Up ↑`
      : `SHARP (+${displayedCents.toFixed(1)}¢) — Tune Down ↓`;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {view === 'TERMS' && (
        <div className="fixed inset-0 z-[60] bg-[#020617] overflow-y-auto">
          <TermsPage onBack={() => setView('TUNER')} />
        </div>
      )}

      <HelpModal
        isOpen={!!helpInfo}
        onClose={() => setHelpInfo(null)}
        title={helpInfo?.title || ''}
        content={helpInfo?.content || ''}
        onLearnMore={helpInfo?.long ? () => setView('LONG_EXPLANATION') : undefined}
      />

      {/* Custom Tuning Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-blue-400 font-black uppercase text-xs tracking-widest">
                Create Custom Tuning
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Open D or Baritone"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target String Frequencies (Hz, comma-separated)
                </label>
                <input
                  type="text"
                  value={customHzInput}
                  onChange={(e) => setCustomHzInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomTuning}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black text-white uppercase tracking-wider"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg">
            R
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Resonance Tuner</h1>
        </div>
        <div className="flex items-center gap-3">
          {referencePitch !== 440 && (
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300">
              A4 = {referencePitch} Hz
            </span>
          )}
          <button
            onClick={() =>
              setHelpInfo({
                title: 'About Resonance Tuner',
                content:
                  'Resonance Tuner v1.1.0 — High-precision McLeod Pitch Method (NSDF) & Rigaud Inharmonicity acoustic engine for Guitar and Piano.',
              })
            }
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800/50 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            ?
          </button>
        </div>
      </header>

      {/* Top Navigation Bar */}
      <nav className="px-6 mb-6">
        <div className="flex bg-[#0f172a]/80 backdrop-blur-md p-1 rounded-xl border border-slate-800/50 max-w-4xl mx-auto">
          {(['Tuner', 'Library', 'Settings', 'Help'] as const).map((label) => {
            const v = label.toUpperCase() as ViewMode;
            return (
              <button
                key={label}
                onClick={() => handleViewChange(v)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  view === v
                    ? 'bg-slate-700/50 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-5xl mx-auto relative">
        {view === 'LONG_EXPLANATION' && (
          <div className="w-full max-w-xl bg-[#0f172a]/60 p-8 rounded-3xl border border-slate-800/50">
            <SweepExplanation onBack={() => setView('TUNER')} />
          </div>
        )}

        {view === 'TUNER' && (
          <div className="w-full flex flex-col items-center gap-8">
            {audioError && (
              <div className="w-full max-w-md bg-rose-950/40 border border-rose-800/60 text-rose-200 px-4 py-3 rounded-xl text-xs text-center">
                {audioError}
              </div>
            )}

            {/* Piano Level & Calibration Toggle */}
            {instrument === 'PIANO' && (
              <div className="flex bg-[#0f172a]/80 p-1 rounded-xl border border-slate-800/50 w-full max-w-md">
                {(['NOVICE', 'PRO', 'CALIBRATION'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handlePianoLevelChange(level)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                      pianoLevel === level
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}

            {/* Note and Frequency Display */}
            <div className="text-center space-y-2">
              {instrument === 'PIANO' && (
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-200">Piano</h2>
                  {activeProfile && activeProfile.instrument === 'PIANO' && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-bold">
                      {activeProfile.name}
                    </span>
                  )}
                </div>
              )}

              {instrument === 'PIANO' && pianoLevel === 'CALIBRATION' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">
                      Recording Profile
                    </div>
                    <button
                      onClick={() =>
                        setHelpInfo({
                          title: 'Rapid Pre-Sweep Calibration',
                          content:
                            'Play individual notes across your piano from bass to treble. Resonance measures the overtone inharmonicity coefficient (B) of your strings to compute a custom stretched tuning curve.',
                          long: true,
                        })
                      }
                      className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-blue-400 font-bold"
                    >
                      ?
                    </button>
                  </div>
                  <div className="text-4xl font-mono text-white">{Math.round(sweepProgress)}%</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {capturedData.length} / 88 notes sampled{' '}
                    {pitchData && !pitchData.isSilent ? `• Current: ${pitchData.note}` : ''}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-7xl font-mono font-black text-white tracking-tight">
                      {pitchData?.note || 'A4'}
                    </div>
                    <button
                      onClick={() => playReferenceTone(pitchData?.targetFreq || referencePitch)}
                      title="Play Reference Tone"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <span>🔊</span>
                      <span className="hidden sm:inline">Ref Tone</span>
                    </button>
                  </div>
                  <div className="text-blue-400 font-mono text-xl tracking-widest">
                    {pitchData?.frequency.toFixed(1) || referencePitch.toFixed(1)} Hz
                  </div>
                  {pitchData && !pitchData.isSilent && (
                    <div className="text-[11px] font-mono text-slate-400">
                      Target: {pitchData.targetFreq.toFixed(2)} Hz
                      {instrument === 'PIANO' && pianoLevel === 'PRO'
                        ? ` • B=${(pitchData.bCoefficient || 0.0001).toFixed(5)}`
                        : ''}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Central Gauge */}
            <div className="relative flex items-center justify-center">
              <PhaseRing
                cents={displayedCents}
                isActive={isActive}
                isSilent={pitchData?.isSilent ?? true}
                variant={instrument}
              />

              <div className="absolute flex flex-col items-center pointer-events-none">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-6xl font-mono font-black ${
                      isNoteInTune ? 'text-emerald-400' : 'text-blue-400'
                    }`}
                  >
                    {pitchData && !pitchData.isSilent
                      ? (displayedCents > 0 ? '+' : '') + displayedCents.toFixed(1)
                      : '0.0'}
                  </span>
                  <span className="text-xl font-bold text-slate-500">¢</span>
                </div>
                <span className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
                  Deviation
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded-full ${
                    !isActive || !pitchData || pitchData.isSilent
                      ? 'text-slate-500'
                      : isNoteInTune
                      ? 'text-emerald-300 bg-emerald-950/70 border border-emerald-800/50'
                      : 'text-blue-300 bg-blue-950/60 border border-blue-800/40'
                  }`}
                >
                  {!isActive || !pitchData || pitchData.isSilent
                    ? 'READY'
                    : isNoteInTune
                    ? 'IN TUNE'
                    : displayedCents < 0
                    ? 'TUNE UP ↑'
                    : 'TUNE DOWN ↓'}
                </span>
              </div>

              {/* Play Button */}
              <div className="absolute -bottom-20 sm:top-1/2 sm:-right-24 sm:-translate-y-1/2 flex justify-center w-full sm:w-auto">
                <button
                  onClick={isActive ? stopAudio : startAudio}
                  aria-label={isActive ? 'Stop Tuner' : 'Start Tuner'}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-30 transition-all transform active:scale-90 ${
                    isActive
                      ? 'bg-rose-500 shadow-rose-900/40'
                      : 'bg-emerald-500 shadow-emerald-900/40'
                  }`}
                >
                  {isActive ? (
                    <div className="w-5 h-5 bg-white rounded-sm" />
                  ) : (
                    <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[18px] border-l-white ml-1" />
                  )}
                </button>
              </div>
            </div>

            {/* Instrument Mode Tabs */}
            <div className="flex bg-[#0f172a]/80 p-1 rounded-full border border-slate-800/50 w-full max-sm:max-w-xs max-w-sm mt-10 sm:mt-4">
              {(['General Tuner', 'Guitar', 'Piano'] as const).map((label) => {
                const mode = label.toUpperCase().split(' ')[0] as InstrumentMode;
                return (
                  <button
                    key={label}
                    onClick={() => handleInstrumentChange(mode)}
                    className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${
                      instrument === mode
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Calibration Save & Reset Controls */}
            {instrument === 'PIANO' && pianoLevel === 'CALIBRATION' && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {capturedData.length >= 3 && (
                  <button
                    onClick={() => handleSaveProfile('INHARMONICITY')}
                    className="py-3.5 px-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg uppercase tracking-widest transition-all"
                  >
                    Save Piano Profile ({capturedData.length} Notes)
                  </button>
                )}
                {capturedData.length > 0 && (
                  <button
                    onClick={() => {
                      setCapturedData([]);
                      setSweepProgress(0);
                    }}
                    className="py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl uppercase tracking-wider"
                  >
                    Reset Sweep
                  </button>
                )}
              </div>
            )}

            {/* Piano Novice Mode: Tension Safety Monitor */}
            {instrument === 'PIANO' && pianoLevel === 'NOVICE' && (
              <div className="w-full max-w-md">
                <TensionSafety
                  speakingLength={speakingLength}
                  frequency={pitchData?.targetFreq || referencePitch}
                  currentFrequency={pitchData?.frequency || referencePitch}
                  onSpeakingLengthChange={setSpeakingLength}
                />
              </div>
            )}

            {/* Piano Pro Mode: Interval Weighting Curves (Octave vs Twelfths Purity) */}
            {instrument === 'PIANO' && pianoLevel === 'PRO' && (
              <div className="w-full max-w-md bg-[#0f172a]/60 p-6 rounded-3xl border border-slate-800/60 space-y-5 relative">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">
                    Interval Weighting Curves
                  </h3>
                  <button
                    onClick={() =>
                      setHelpInfo({
                        title: 'Interval Weighting (Railsback Stretch)',
                        content:
                          'Adjust how the acoustic solver balances 2:1 Octave purity against 3:1 Twelfth purity. Higher Twelfths Purity produces a concert-style stretch across the middle and upper registers.',
                      })
                    }
                    className="w-5 h-5 rounded-full border border-slate-700 text-[10px] text-slate-400 hover:text-white"
                  >
                    ?
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1.5 text-slate-400 tracking-wider">
                      <span>OCTAVE PURITY (2:1)</span>
                      <span className="text-blue-400 font-mono">{octaveWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={octaveWeight}
                      onChange={(e) => setOctaveWeight(Number(e.target.value))}
                      aria-label="Octave Purity"
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1.5 text-slate-400 tracking-wider">
                      <span>TWELFTHS PURITY (3:1)</span>
                      <span className="text-blue-400 font-mono">{twelfthWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={twelfthWeight}
                      onChange={(e) => setTwelfthWeight(Number(e.target.value))}
                      aria-label="Twelfths Purity"
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guitar String Selector & Presets */}
            {instrument === 'GUITAR' && (
              <div className="w-full max-w-md bg-[#0f172a]/50 p-6 rounded-3xl border border-slate-800/50 space-y-6">
                {/* Interactive String Selector (Auto + Individual Strings with Reference Tone) */}
                {activeProfile && activeProfile.data.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        String Lock & Reference
                      </span>
                      <button
                        onClick={() => setLockedStringIndex(null)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          lockedStringIndex === null
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Auto-Detect
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {activeProfile.data.map((hz, idx) => {
                        const label =
                          activeProfile.stringNames?.[idx] || `${activeProfile.data.length - idx}`;
                        const isSelected = lockedStringIndex === idx;
                        const isCurrentlyDetected =
                          lockedStringIndex === null &&
                          pitchData &&
                          !pitchData.isSilent &&
                          Math.abs(pitchData.targetFreq - hz) < 0.5;

                        return (
                          <button
                            key={`${label}-${idx}`}
                            onClick={() => {
                              setLockedStringIndex(isSelected ? null : idx);
                              playReferenceTone(hz, 1400);
                            }}
                            title={`Lock to ${label} (${hz} Hz) & play reference tone`}
                            className={`py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : isCurrentlyDetected
                                ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <span className="text-xs font-black">{label}</span>
                            <span className="text-[9px] font-mono opacity-75">
                              {Math.round(hz)}Hz
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Presets
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {GUITAR_TUNINGS.slice(0, 3).map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handleLoadProfile(p)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                        activeProfile?.name === p.name
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {p.name.replace('Guitar: ', '')}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 text-xs font-bold hover:border-slate-600 flex items-center justify-center gap-2"
                  >
                    Add Custom <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Footer Area */}
            <div className="w-full max-w-3xl bg-[#0f172a]/30 p-6 rounded-3xl border border-slate-800/30 text-center space-y-1">
              <p className="text-slate-300 text-sm font-semibold">{tuningDirectionText}</p>
              <p className="text-slate-500 text-xs font-medium">
                {instrument === 'GENERAL' &&
                  'General Tuning mode. Keep the needle in the center.'}
                {instrument === 'GUITAR' &&
                  `Guitar mode: ${activeProfile?.name.replace('Guitar: ', '') || 'Standard'} tuning. Tune each string until green.`}
                {instrument === 'PIANO' && pianoLevel === 'CALIBRATION'
                  ? 'Play every note individually bottom to top to map string stiffness.'
                  : instrument === 'PIANO'
                  ? `Piano mode: ${
                      pianoLevel === 'PRO'
                        ? 'Pro level selected for high-precision tuning.'
                        : 'Novice level selected for easy tuning.'
                    }`
                  : ''}
              </p>
            </div>
          </div>
        )}

        {/* Library View */}
        {view === 'LIBRARY' && (
          <div className="w-full max-w-2xl bg-[#0f172a]/50 p-8 rounded-3xl border border-slate-800/50 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Tuning Library</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Select a built-in guitar tuning or load a saved custom piano/instrument profile.
                </p>
              </div>
              <button
                onClick={() => setShowCustomModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-wider text-white"
              >
                + Custom Tuning
              </button>
            </div>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">
                Guitar Tunings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GUITAR_TUNINGS.map((p) => {
                  const isCurrent = activeProfile?.name === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleLoadProfile(p)}
                      className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${
                        isCurrent
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{p.name.replace('Guitar: ', '')}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {p.stringNames?.join(' • ') || `${p.data.length} strings`}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                          isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCurrent ? 'ACTIVE' : 'LOAD'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em]">
                Saved Piano & Custom Profiles
              </h3>
              {savedProfiles.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-slate-800/60 border-dashed">
                  <p className="text-slate-400 text-sm">
                    Your saved profiles will appear here. Use Piano Calibration or + Custom Tuning to save profiles.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedProfiles.map((p) => {
                    const isCurrent = activeProfile?.name === p.name;
                    return (
                      <div
                        key={p.id || p.name}
                        className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex justify-between items-center gap-4"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {p.type === 'INHARMONICITY'
                              ? `Piano Calibration (${p.data.length} notes)`
                              : `${p.data.length} target frequencies`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadProfile(p)}
                            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                              isCurrent
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            {isCurrent ? 'ACTIVE' : 'LOAD'}
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p.id || p.name)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-bold transition-colors"
                            title="Delete Profile"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Settings View */}
        {view === 'SETTINGS' && (
          <div className="w-full max-w-2xl bg-[#0f172a]/50 p-8 rounded-3xl border border-slate-800/50 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Settings</h2>
              <p className="text-slate-400 text-xs">
                Configure concert reference pitch, calibration defaults, and feedback preferences.
              </p>
            </div>

            <div className="space-y-6">
              {/* Concert A4 Pitch Calibration */}
              <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">Concert A4 Reference Pitch</h3>
                    <p className="text-xs text-slate-400">
                      Standard concert pitch is 440.0 Hz (415 Hz Baroque – 444 Hz Orchestral).
                    </p>
                  </div>
                  <span className="text-xl font-mono font-black text-blue-400">
                    {referencePitch} Hz
                  </span>
                </div>
                <input
                  type="range"
                  min={415}
                  max={466}
                  step={1}
                  value={referencePitch}
                  onChange={(e) => handleReferencePitchChange(Number(e.target.value))}
                  aria-label="Concert A4 Reference Pitch"
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[415, 432, 440, 442, 444].map((hz) => (
                    <button
                      key={hz}
                      onClick={() => handleReferencePitchChange(hz)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                        referencePitch === hz
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {hz} Hz
                    </button>
                  ))}
                </div>
              </div>

              {/* Haptic Lock Toggle */}
              <div className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white">Haptic Pitch-Lock Feedback</h3>
                  <p className="text-xs text-slate-400">
                    Gentle vibration on supported mobile devices when note locks within ±4 cents.
                  </p>
                </div>
                <button
                  onClick={() => setHapticEnabled((v) => !v)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors ${
                    hapticEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {hapticEnabled ? 'Enabled' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Center */}
        {view === 'HELP' && (
          <div className="w-full max-w-2xl bg-[#0f172a]/50 p-8 rounded-3xl border border-slate-800/50 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-xl">
                ?
              </div>
              <h2 className="text-3xl font-black tracking-tight">Help Center</h2>
            </div>

            <section className="space-y-4">
              <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">
                Getting Started
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Select your instrument below the gauge. Click the{' '}
                <span className="text-emerald-400 font-bold">Play</span> button to begin. You must
                grant microphone access for the tuner to analyze your instrument's audio signal.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">
                Guitar & String Lock
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Switch to Guitar mode to access presets like{' '}
                <span className="text-slate-200">Standard</span>,{' '}
                <span className="text-slate-200">Drop D</span>,{' '}
                <span className="text-slate-200">Open G</span>,{' '}
                <span className="text-slate-200">DADGAD</span>, or{' '}
                <span className="text-slate-200">432 Hz</span>. Tap any string button to lock the
                tuner onto that specific string and hear its reference tone.
              </p>
            </section>

            <section className="space-y-4 border-l-2 border-purple-500/30 pl-6 py-2">
              <h3 className="text-purple-400 font-black text-xs uppercase tracking-[0.3em]">
                Piano Calibration & Stretch Tuning
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed italic">
                "Every piano is physically unique."
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                For piano tuning, Novice mode provides a Tension Safety Monitor (calculating steel
                wire stress in MPa from speaking length) and a safe Railsback stretch curve. Pro
                mode lets you customize Octave (2:1) vs. Twelfths (3:1) interval purity, or run a{' '}
                <span className="text-purple-400">Calibration</span> sweep across the keyboard.
              </p>
            </section>

            <section className="space-y-4 bg-red-950/10 p-6 rounded-2xl border border-red-900/20">
              <h3 className="text-red-500 font-black text-xs uppercase tracking-[0.3em]">
                Safety Notice
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tuning instruments under high tension (especially pianos) carries inherent physical
                risks. Please consult the{' '}
                <span className="text-red-400 font-bold">Terms of Service</span> before attempting
                mechanical adjustments.
              </p>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center z-30">
        <p className="text-[10px] text-slate-600 font-medium tracking-tight">
          &copy; 2026{' '}
          <a
            href="https://romansolutions.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500/80 hover:text-blue-400 transition-colors font-bold"
          >
            Roman Digital Solutions LLC
          </a>
          . All rights reserved.
        </p>
        <button
          onClick={() => handleViewChange('TERMS')}
          className="text-[10px] text-slate-600 hover:text-slate-400 underline decoration-slate-800 underline-offset-4 transition-colors mt-2"
        >
          Terms of Service
        </button>
      </footer>
    </div>
  );
}

export default App;
