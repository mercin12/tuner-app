import type { TuningProfile } from '../../services/database';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculates note name, cents deviation, and target frequency.
 * Prioritizes instrument-specific targets from the active profile.
 */
export function getNoteFromFrequency(
  frequency: number, 
  activeProfile?: TuningProfile | null, 
  measuredB: number = 0.0001
) {
  if (frequency < 20.0 || frequency > 5000) return null;

  // 1. Determine the logical Note (MIDI) first
  const n = 12 * Math.log2(frequency / 440) + 69;
  const midiNote = Math.round(n);
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTES[midiNote % 12];
  const fullNoteName = `${noteName}${octave}`;

  let targetFreq = 440 * Math.pow(2, (midiNote - 69) / 12); // Default ET

  // 2. Profile-Specific Target Logic
  if (activeProfile && activeProfile.data.length > 0) {
    if (activeProfile.type === 'INSTRUMENT_TARGETS') {
      // Find the absolute closest Hz in the instrument profile (e.g. nearest guitar string)
      const closest = findClosestInProfile(frequency, activeProfile.data, 0.2); // Wider tolerance for strings
      if (closest) {
        targetFreq = closest;
        // Recalculate which note this target frequency actually corresponds to
        const targetMidi = Math.round(12 * Math.log2(targetFreq / 440) + 69);
        const tOctave = Math.floor(targetMidi / 12) - 1;
        const tNoteName = NOTES[targetMidi % 12];
        // We update the display name to match the target string the user is trying to hit
        return {
          note: `${tNoteName}${tOctave}`,
          cents: 1200 * Math.log2(frequency / targetFreq),
          midiNote: targetMidi,
          targetFreq,
          inTune: Math.abs(1200 * Math.log2(frequency / targetFreq)) < 4
        };
      }
    } else if (activeProfile.type === 'REFERENCE_TUNING') {
      const c4Ref = findNoteInProfile(60, activeProfile.data);
      if (c4Ref) targetFreq = c4Ref * Math.pow(2, (midiNote - 60) / 12);
    } else if (activeProfile.type === 'INHARMONICITY') {
      const profileTarget = findClosestInProfile(frequency, activeProfile.data, 0.06);
      if (profileTarget) targetFreq = profileTarget;
    }
  } else {
    // Dynamic stretching for piano if no profile but B is measured
    const stretchFactor = Math.sqrt(1 + 4 * measuredB); 
    targetFreq = targetFreq * stretchFactor;
  }

  const cents = 1200 * Math.log2(frequency / targetFreq);

  return {
    note: fullNoteName,
    cents: cents,
    midiNote,
    targetFreq,
    inTune: Math.abs(cents) < 4
  };
}

function findNoteInProfile(targetMidi: number, profileData: number[]): number | null {
    for (const freq of profileData) {
        const midi = Math.round(12 * Math.log2(freq / 440) + 69);
        if (midi === targetMidi) return freq;
    }
    return null;
}

function findClosestInProfile(freq: number, profileData: number[], toleranceRatio: number): number | null {
  if (!profileData || profileData.length === 0) return null;
  let closest = profileData[0];
  let minDiff = Math.abs(freq - closest);
  for (let i = 1; i < profileData.length; i++) {
    const diff = Math.abs(freq - profileData[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = profileData[i];
    }
  }
  return minDiff / freq < toleranceRatio ? closest : null;
}
