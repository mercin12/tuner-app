import { PianoProfile } from '../../services/database';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteFromFrequency(frequency: number, activeProfile?: PianoProfile | null) {
  if (frequency <= 0) return null;

  // 1. Determine the Note Name (Standard Math is always used for Naming)
  const n = 12 * Math.log2(frequency / 440) + 69;
  const midiNote = Math.round(n);
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTES[midiNote % 12];
  const fullNoteName = `${noteName}${octave}`;

  let cents = 0;
  let targetFreq = 440 * Math.pow(2, (midiNote - 69) / 12);

  // 2. If a Custom Profile exists, look up the TARGET frequency for this note
  // This supports "Reference Tunings" where A4 might not be 440Hz, or C#3 is stretched.
  if (activeProfile && activeProfile.data && activeProfile.data.length > 0) {
    // Basic lookup: In a real app, we'd map MIDI notes to array indices more robustly.
    // Assuming data[] is a chromatic map where index 0 is lowest note detected or A0.
    // For this prototype, we'll try to find the closest match in the profile data
    // to avoid complex index mapping logic without a defined schema.
    
    const closestMatch = activeProfile.data.reduce((prev, curr) => {
      return (Math.abs(curr - frequency) < Math.abs(prev - frequency) ? curr : prev);
    });

    // Only use the profile target if it's within a semitone (approx 6%) of the detected pitch
    // otherwise we assume it's a different note.
    if (Math.abs(closestMatch - frequency) / frequency < 0.06) {
      targetFreq = closestMatch;
    }
  }

  // 3. Calculate Cents Deviation from the Target (Standard or Custom)
  // 1200 * log2(f / target)
  cents = 1200 * Math.log2(frequency / targetFreq);

  return {
    note: fullNoteName,
    cents: cents,
    midiNote,
    targetFreq
  };
}
