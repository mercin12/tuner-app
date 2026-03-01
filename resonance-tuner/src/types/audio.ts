export interface PitchResult {
  frequency: number;
  note: string;
  cents: number;
  clarity: number;
  inTune: boolean;
  isSilent: boolean;
}

export interface InharmonicityProfile {
  pianoId?: string;
  coefficients: number[];
  measuredAt: number;
}

export interface TuningStrategy {
  analyze(buffer: Float32Array): PitchResult;
  calculateStretch(profile: InharmonicityProfile, weighting: number): number;
}
