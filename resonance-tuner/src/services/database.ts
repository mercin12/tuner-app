// Tuning Database Service (Generic for Piano, Guitar, etc.)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export type ProfileType = 'INHARMONICITY' | 'REFERENCE_TUNING' | 'INSTRUMENT_TARGETS';

export interface TuningProfile {
  id?: number;
  name: string;
  type: ProfileType;
  instrument?: 'PIANO' | 'GUITAR' | 'OTHER';
  data: number[]; // Array of target frequencies
  created_at?: string;
}

// Predefined Guitar Tunings
export const GUITAR_TUNINGS: TuningProfile[] = [
  {
    name: "Guitar: E Standard",
    type: "INSTRUMENT_TARGETS",
    instrument: "GUITAR",
    data: [82.41, 110.00, 146.83, 196.00, 246.94, 329.63] // E2 to E4
  },
  {
    name: "Guitar: Drop D",
    type: "INSTRUMENT_TARGETS",
    instrument: "GUITAR",
    data: [73.42, 110.00, 146.83, 196.00, 246.94, 329.63] // D2 to E4
  },
  {
    name: "Guitar: DADGAD",
    type: "INSTRUMENT_TARGETS",
    instrument: "GUITAR",
    data: [73.42, 110.00, 146.83, 196.00, 220.00, 293.67] // D2 to D4
  },
  {
    name: "Guitar: 432 Hz",
    type: "INSTRUMENT_TARGETS",
    instrument: "GUITAR",
    data: [80.60, 107.32, 144.02, 192.44, 242.28, 323.63]
  }
];

export const saveTuningProfile = async (profile: TuningProfile) => {
  try {
    const response = await fetch(`${API_URL}/pianos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to save profile:", error);
    const existing = JSON.parse(localStorage.getItem('resonance_profiles') || '[]');
    const newProfile = { ...profile, id: Date.now(), created_at: new Date().toISOString() };
    localStorage.setItem('resonance_profiles', JSON.stringify([...existing, newProfile]));
    return newProfile;
  }
};

export const fetchTuningProfiles = async (): Promise<TuningProfile[]> => {
  try {
    const response = await fetch(`${API_URL}/pianos`);
    if (response.ok) return await response.json();
    throw new Error('API unavailable');
  } catch (error) {
    console.warn("Using local storage fallback:", error);
    return JSON.parse(localStorage.getItem('resonance_profiles') || '[]');
  }
};
