import type { PianoProfile } from '../../services/database';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculates note name, cents deviation, and target frequency.
 * Account for inharmonicity (B) and octave stretching (Rigaud 2013).
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

  // 2. Determine Target Frequency
  let targetFreq = 440 * Math.pow(2, (midiNote - 69) / 12); // Standard ET

  // Apply Stretched Tuning Logic if we have profile data or B-coefficient
  if (activeProfile && activeProfile.data && activeProfile.data.length > 0) {
     // If we have a reference profile, we use that as the absolute target
     const closestMatch = findClosestInProfile(frequency, activeProfile.data);
     if (closestMatch) targetFreq = closestMatch;
  } else {
     // Dynamic Stretching based on Rigaud Model
     // For a 4:2 octave (matching 4th partial of lower to 2nd of upper):
     // f_4(m-12) = f_2(m)
     // 4 * F0(m-12) * sqrt(1 + 16B) = 2 * F0(m) * sqrt(1 + 4B)
     // This means F0(m) = 2 * F0(m-12) * (sqrt(1 + 16B) / sqrt(1 + 4B))
     
     // For this prototype, we'll apply a standard stretching curve based on B
     const stretchFactor = Math.sqrt(1 + 4 * measuredB); 
     targetFreq = targetFreq * stretchFactor;
  }

  // 3. Calculate Cents Deviation
  // Deviation from the STRETCHED target
  const cents = 1200 * Math.log2(frequency / targetFreq);

  return {
    note: fullNoteName,
    cents: cents,
    midiNote,
    targetFreq
  };
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
  
  // Only return if it's within a reasonable range (1 semitone)
  return minDiff / freq < 0.06 ? closest : null;
}
