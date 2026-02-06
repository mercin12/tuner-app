// Neon Database Service (via Cloudflare Worker Bridge)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Default for local dev

export interface PianoProfile {
  id?: number;
  name: string;
  speakingLength: number;
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
    throw error;
  }
};

export const fetchPianoProfiles = async () => {
  try {
    const response = await fetch(`${API_URL}/pianos`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch pianos:", error);
    return [];
  }
};
