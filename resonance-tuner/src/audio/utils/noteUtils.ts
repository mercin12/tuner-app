import type { PianoProfile } from '../../services/database';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculates note name, cents deviation, and target frequency.
 * Accounts for inharmonicity (B) and relative tuning from a Master Reference.
 */
export function getNoteFromFrequency(
  frequency: number, 
  activeProfile?: PianoProfile | null, 
  measuredB: number = 0.0001
) {
  if (frequency < 20.0 || frequency > 5000) return null;

  // 1. Basic MIDI Note Determination
  const n = 12 * Math.log2(frequency / 440) + 69;
  const midiNote = Math.round(n);
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTES[midiNote % 12];
  const fullNoteName = `${noteName}${octave}`;

  // 2. Relative Tuning Logic
  // Default master reference is A4 = 440Hz, but we allow C4 to be the anchor if in the profile
  let masterRefFreq = 440;
  let masterRefMidi = 69; // A4

  // Check if user has a custom "Golden Master" or Reference C4 in the profile
  if (activeProfile && activeProfile.type === 'REFERENCE_TUNING' && activeProfile.data.length > 0) {
      // Find the closest note to C4 (Midi 60) in the profile to use as the relative anchor
      const c4Ref = findNoteInProfile(60, activeProfile.data);
      if (c4Ref) {
          masterRefFreq = c4Ref;
          masterRefMidi = 60;
      }
  }

  // Calculate target frequency relative to the Master Reference
  let targetFreq = masterRefFreq * Math.pow(2, (midiNote - masterRefMidi) / 12);

  // Apply Stretched Tuning Logic based on the Rigaud model
  if (activeProfile && activeProfile.type === 'INHARMONICITY') {
     // Use the captured profile data for absolute target if it exists
     const profileTarget = findClosestInProfile(frequency, activeProfile.data);
     if (profileTarget) targetFreq = profileTarget;
  } else {
     // Dynamic stretching: shift target slightly based on string stiffness (B)
     const stretchFactor = Math.sqrt(1 + 4 * measuredB); 
     targetFreq = targetFreq * stretchFactor;
  }

  // 3. Calculate Cents Deviation (Tight 4-cent tolerance for "In Tune")
  const cents = 1200 * Math.log2(frequency / targetFreq);

  return {
    note: fullNoteName,
    cents: cents,
    midiNote,
    targetFreq,
    inTune: Math.abs(cents) < 4 // Tightened tolerance
  };
}

function findNoteInProfile(targetMidi: number, profileData: number[]): number | null {
    // This assumes the profile data contains frequencies we can map back to MIDI
    for (const freq of profileData) {
        const midi = Math.round(12 * Math.log2(freq / 440) + 69);
        if (midi === targetMidi) return freq;
    }
    return null;
}

function findClosestInProfile(freq: number, profileData: number[]): number | null {
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
  return minDiff / freq < 0.06 ? closest : null;
}
