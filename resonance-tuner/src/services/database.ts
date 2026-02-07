// Neon Database Service (via Cloudflare Worker Bridge)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Default for local dev

export type ProfileType = 'INHARMONICITY' | 'REFERENCE_TUNING';

export interface PianoProfile {
  id?: number;
  name: string;
  type: ProfileType;
  speakingLength?: number;
  data: number[]; // Array of frequencies (0 to 88 or detected set)
  created_at?: string;
}

export const savePianoProfile = async (profile: PianoProfile) => {
  try {
    const response = await fetch(`${API_URL}/pianos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to save piano:", error);
    // Fallback for prototype (Local Storage)
    const existing = JSON.parse(localStorage.getItem('resonance_profiles') || '[]');
    const newProfile = { ...profile, id: Date.now(), created_at: new Date().toISOString() };
    localStorage.setItem('resonance_profiles', JSON.stringify([...existing, newProfile]));
    return newProfile;
  }
};

export const fetchPianoProfiles = async (): Promise<PianoProfile[]> => {
  try {
    // Try API first
    const response = await fetch(`${API_URL}/pianos`);
    if (response.ok) return await response.json();
    throw new Error('API unavailable');
  } catch (error) {
    console.warn("API unreachable, loading local profiles:", error);
    // Fallback to Local Storage
    return JSON.parse(localStorage.getItem('resonance_profiles') || '[]');
  }
};
