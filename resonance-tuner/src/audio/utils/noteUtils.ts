const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteFromFrequency(frequency: number) {
  if (frequency <= 0) return null;

  // Formula: n = 12 * log2(f / 440) + 69
  const n = 12 * Math.log2(frequency / 440) + 69;
  const midiNote = Math.round(n);
  const cents = (n - midiNote) * 100;
  
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTES[midiNote % 12];

  return {
    note: `${noteName}${octave}`,
    cents: cents,
    midiNote
  };
}
