import type { TuningProfile } from '../../services/database';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface NoteCalculationOptions {
  instrument?: 'GENERAL' | 'GUITAR' | 'PIANO';
  pianoLevel?: 'NOVICE' | 'PRO' | 'CALIBRATION';
  referencePitch?: number; // Default 440 Hz
  octaveWeight?: number;   // 0..100, default 75
  twelfthWeight?: number;  // 0..100, default 40
  targetStringIndex?: number | null; // Optional manual string lock for Guitar
}

/**
 * Calculates note name, cents deviation, and target frequency.
 * Supports:
 * - Equal Temperament (General / Guitar Chromatic)
 * - Instrument Target Presets (Guitar E Standard, Drop D, DADGAD, Open G, 432Hz, Custom) with optional String Lock
 * - Piano Railsback / Rigaud (2013) & Hinrichsen (2012) Stretched Tuning (Novice vs Pro interval weighting)
 * - Piano Calibrated Inharmonicity Profiles & Captured Reference Tunings
 */
export function getNoteFromFrequency(
  frequency: number,
  activeProfile?: TuningProfile | null,
  measuredB: number = 0.0001,
  options: NoteCalculationOptions = {}
) {
  if (frequency < 20.0 || frequency > 5000 || isNaN(frequency)) return null;

  const {
    instrument = 'GENERAL',
    pianoLevel = 'NOVICE',
    referencePitch = 440,
    octaveWeight = 75,
    twelfthWeight = 40,
    targetStringIndex = null,
  } = options;

  // 1. Determine the logical Note (MIDI) relative to referencePitch (default A4 = 440Hz)
  const n = 12 * Math.log2(frequency / referencePitch) + 69;
  const midiNote = Math.round(n);
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const noteName = NOTES[noteIndex];
  const fullNoteName = `${noteName}${octave}`;

  // Pure Equal Temperament target frequency
  let targetFreq = referencePitch * Math.pow(2, (midiNote - 69) / 12);

  // 2. Guitar / Instrument Target Profile Logic
  if (
    activeProfile &&
    activeProfile.data &&
    activeProfile.data.length > 0 &&
    activeProfile.type === 'INSTRUMENT_TARGETS' &&
    (instrument === 'GUITAR' || activeProfile.instrument === 'GUITAR' || activeProfile.instrument === 'OTHER')
  ) {
    // If user manually locked onto a specific string index, use that string directly
    if (
      targetStringIndex !== null &&
      targetStringIndex >= 0 &&
      targetStringIndex < activeProfile.data.length
    ) {
      targetFreq = activeProfile.data[targetStringIndex];
      const targetMidi = Math.round(12 * Math.log2(targetFreq / referencePitch) + 69);
      const tOctave = Math.floor(targetMidi / 12) - 1;
      const tNoteName = NOTES[((targetMidi % 12) + 12) % 12];
      const cents = 1200 * Math.log2(frequency / targetFreq);
      return {
        note: `${tNoteName}${tOctave}`,
        cents,
        midiNote: targetMidi,
        targetFreq,
        inTune: Math.abs(cents) < 4,
      };
    }

    // Auto-detect closest string in the preset (using cents distance so bass & treble strings have equal semitone capture range)
    const closest = findClosestInProfileByCents(frequency, activeProfile.data, 350); // Within 3.5 semitones
    if (closest !== null) {
      targetFreq = closest;
      // If preset is 432Hz guitar, compute note name against 432Hz so it displays E2, A2, D3, G3, B3, E4 instead of D#2!
      const effectiveA4 = activeProfile.name.includes('432') ? 432 : referencePitch;
      const targetMidi = Math.round(12 * Math.log2(targetFreq / effectiveA4) + 69);
      const tOctave = Math.floor(targetMidi / 12) - 1;
      const tNoteName = NOTES[((targetMidi % 12) + 12) % 12];
      const cents = 1200 * Math.log2(frequency / targetFreq);
      return {
        note: `${tNoteName}${tOctave}`,
        cents,
        midiNote: targetMidi,
        targetFreq,
        inTune: Math.abs(cents) < 4,
      };
    }
  }

  // 3. Piano Mode & Piano Profile Logic
  if (instrument === 'PIANO' || activeProfile?.type === 'INHARMONICITY' || activeProfile?.type === 'REFERENCE_TUNING') {
    if (activeProfile && activeProfile.data.length > 0 && activeProfile.type === 'REFERENCE_TUNING') {
      const exactMatch = findClosestInProfileByCents(frequency, activeProfile.data, 80);
      if (exactMatch) {
        targetFreq = exactMatch;
      } else {
        const c4Ref = findNoteInProfile(60, activeProfile.data);
        if (c4Ref) targetFreq = c4Ref * Math.pow(2, (midiNote - 60) / 12);
      }
    } else if (activeProfile && activeProfile.data.length > 0 && activeProfile.type === 'INHARMONICITY') {
      // Check if calibrated data has an entry near this note or compute stretched curve from profile
      const calibratedNoteFreq = findClosestInProfileByCents(frequency, activeProfile.data, 60);
      const bToUse = calibratedNoteFreq ? Math.max(0.00005, measuredB) : measuredB;
      const stretchCents = calculatePianoStretchCents(midiNote, bToUse, pianoLevel, octaveWeight, twelfthWeight);
      targetFreq = targetFreq * Math.pow(2, stretchCents / 1200);
    } else {
      // Dynamic Railsback / Rigaud (2013) stretch anchored at A4 (MIDI 69 = 0 cents stretch)
      const stretchCents = calculatePianoStretchCents(midiNote, measuredB, pianoLevel, octaveWeight, twelfthWeight);
      targetFreq = targetFreq * Math.pow(2, stretchCents / 1200);
    }
  }

  const cents = 1200 * Math.log2(frequency / targetFreq);

  return {
    note: fullNoteName,
    cents,
    midiNote,
    targetFreq,
    inTune: Math.abs(cents) < 4,
  };
}

/**
 * Computes the piano Railsback stretch offset in cents for a given MIDI note (A0=21 to C8=108).
 * Anchored at A4 (MIDI 69) = 0.0 cents so A4 is always exact reference pitch (e.g. 440.0 Hz).
 * High notes (above A4) are stretched sharp (+cents) to match sharp upper partials.
 * Low notes (below A4) are stretched flat (-cents) so their sharp overtones align with midrange fundamentals.
 */
export function calculatePianoStretchCents(
  midiNote: number,
  measuredB: number = 0.0001,
  pianoLevel: 'NOVICE' | 'PRO' | 'CALIBRATION' = 'NOVICE',
  octaveWeight: number = 75,
  twelfthWeight: number = 40
): number {
  if (pianoLevel === 'CALIBRATION') return 0;

  const semitonesFromA4 = midiNote - 69;
  if (semitonesFromA4 === 0) return 0;

  // Normalize B around standard middle-register B_ref = 0.0001
  const bScale = Math.max(0.5, Math.min(2.5, Math.sqrt(measuredB / 0.0001)));

  // Pro mode lets the technician blend Octave Purity (2:1 partial matching, narrower stretch in midrange, wider in extremes)
  // vs Twelfths Purity (3:1 partial matching, smoother cumulative stretch across the scale).
  const proFactor =
    pianoLevel === 'PRO'
      ? 0.65 + (octaveWeight / 100) * 0.35 + (twelfthWeight / 100) * 0.25
      : 0.85; // Novice uses a gentle, safe standard stretch

  const octavesFromA4 = semitonesFromA4 / 12;

  if (octavesFromA4 > 0) {
    // Treble stretch (positive cents, cubic growth toward C8 up to +25..35 cents)
    return (1.8 * octavesFromA4 + 0.85 * Math.pow(octavesFromA4, 3)) * bScale * proFactor;
  } else {
    // Bass stretch (negative cents, curving down toward A0 down to -20..-30 cents)
    const absOct = Math.abs(octavesFromA4);
    return -(1.2 * absOct + 0.55 * Math.pow(absOct, 2.6)) * bScale * proFactor;
  }
}

function findNoteInProfile(targetMidi: number, profileData: number[]): number | null {
  for (const freq of profileData) {
    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    if (midi === targetMidi) return freq;
  }
  return null;
}

function findClosestInProfileByCents(freq: number, profileData: number[], maxCents: number): number | null {
  if (!profileData || profileData.length === 0) return null;
  let closest = profileData[0];
  let minCentsDiff = Math.abs(1200 * Math.log2(freq / closest));

  for (let i = 1; i < profileData.length; i++) {
    const centsDiff = Math.abs(1200 * Math.log2(freq / profileData[i]));
    if (centsDiff < minCentsDiff) {
      minCentsDiff = centsDiff;
      closest = profileData[i];
    }
  }
  return minCentsDiff <= maxCents ? closest : null;
}
