// Tuning Database Service (Generic for Piano, Guitar, etc.)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export type ProfileType = 'INHARMONICITY' | 'REFERENCE_TUNING' | 'INSTRUMENT_TARGETS';

export interface TuningProfile {
  id?: number;
  name: string;
  type: ProfileType;
  instrument?: 'PIANO' | 'GUITAR' | 'OTHER';
  data: number[]; // Array of target frequencies
  stringNames?: string[]; // Optional string labels (e.g., ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
  created_at?: string;
}

// Predefined Guitar Tunings
export const GUITAR_TUNINGS: TuningProfile[] = [
  {
    name: 'Guitar: Standard',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [82.41, 110.0, 146.83, 196.0, 246.94, 329.63], // E2 to E4
    stringNames: ['6E', '5A', '4D', '3G', '2B', '1E'],
  },
  {
    name: 'Guitar: Drop D',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [73.42, 110.0, 146.83, 196.0, 246.94, 329.63], // D2 to E4
    stringNames: ['6D', '5A', '4D', '3G', '2B', '1E'],
  },
  {
    name: 'Guitar: Open G',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [73.42, 98.0, 146.83, 196.0, 246.94, 293.66], // D2 G2 D3 G3 B3 D4
    stringNames: ['6D', '5G', '4D', '3G', '2B', '1D'],
  },
  {
    name: 'Guitar: DADGAD',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [73.42, 110.0, 146.83, 196.0, 220.0, 293.66], // D2 A2 D3 G3 A3 D4
    stringNames: ['6D', '5A', '4D', '3G', '2A', '1D'],
  },
  {
    name: 'Guitar: Half-Step Down (Eb)',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [77.78, 103.83, 138.59, 185.0, 233.08, 311.13], // Eb2 to Eb4
    stringNames: ['6Eb', '5Ab', '4Db', '3Gb', '2Bb', '1Eb'],
  },
  {
    name: 'Guitar: 432 Hz Standard',
    type: 'INSTRUMENT_TARGETS',
    instrument: 'GUITAR',
    data: [80.91, 108.0, 144.16, 192.43, 242.45, 323.63],
    stringNames: ['6E', '5A', '4D', '3G', '2B', '1E'],
  },
];

const LOCAL_STORAGE_KEY = 'resonance_profiles';

const getLocalProfiles = (): TuningProfile[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveTuningProfile = async (profile: TuningProfile): Promise<TuningProfile> => {
  const newProfile: TuningProfile = {
    ...profile,
    id: profile.id || Date.now(),
    created_at: profile.created_at || new Date().toISOString(),
  };

  // Always persist in localStorage first so offline / local sessions never lose data
  const existing = getLocalProfiles().filter((p) => p.name !== newProfile.name);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...existing, newProfile]));

  try {
    const response = await fetch(`${API_URL}/pianos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Offline or backend not running - local storage already saved
  }
  return newProfile;
};

export const deleteTuningProfile = (idOrName: number | string): TuningProfile[] => {
  const existing = getLocalProfiles();
  const updated = existing.filter((p) => p.id !== idOrName && p.name !== idOrName);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const fetchTuningProfiles = async (): Promise<TuningProfile[]> => {
  const local = getLocalProfiles();
  try {
    const response = await fetch(`${API_URL}/pianos`);
    if (response.ok) {
      const remote: TuningProfile[] = await response.json();
      if (Array.isArray(remote) && remote.length > 0) {
        return remote;
      }
    }
  } catch {
    // Use local profiles
  }
  return local;
};
