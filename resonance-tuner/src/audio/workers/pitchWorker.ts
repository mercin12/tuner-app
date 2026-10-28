// High-precision pitch detection worker using McLeod Pitch Method (MPM) / NSDF
// + Sub-harmonic verification for guitar/piano bass strings
// + Spectral harmonic peak analysis for real inharmonicity (B) estimation (Rigaud 2013)

let recentFreqs: number[] = [];
const MEDIAN_WINDOW = 5;
const JUMP_THRESHOLD_CENTS = 45;
let lastValidFrequency = 0;
let lastValidB = 0.0001;

if (typeof self !== 'undefined' && typeof (self as unknown as { onmessage?: unknown }).onmessage !== 'undefined') {
  self.onmessage = (e: MessageEvent) => {
    const { buffer, sampleRate } = e.data;
    const result = detectPitch(buffer, sampleRate);
    self.postMessage(result);
  };
}

export function detectPitch(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;

  // 1. RMS Check & DC Offset Removal
  let mean = 0;
  for (let i = 0; i < SIZE; i++) mean += buffer[i];
  mean /= SIZE;

  let sumSq = 0;
  const cleanBuffer = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i] - mean;
    cleanBuffer[i] = val;
    sumSq += val * val;
  }
  const rms = Math.sqrt(sumSq / SIZE);

  // Noise floor check (~ -46 dBFS)
  if (rms < 0.005) {
    recentFreqs = [];
    return {
      frequency: lastValidFrequency,
      bCoefficient: lastValidB,
      clarity: 0,
      timestamp: Date.now(),
      isSilent: true,
    };
  }

  // 2. McLeod Pitch Method (Normalized Square Difference Function - NSDF)
  // Valid frequency range: A0 (27.5 Hz) to C8 (4186 Hz)
  // Give margin down to 25 Hz and up to 4500 Hz
  const minTau = Math.max(2, Math.floor(sampleRate / 4500));
  const maxTau = Math.min(Math.floor(SIZE * 0.75), Math.ceil(sampleRate / 25));

  const nsdf = new Float32Array(maxTau + 1);

  // Precompute cumulative squares to compute m(tau) in O(1) per lag
  const cumSq = new Float64Array(SIZE + 1);
  for (let i = 0; i < SIZE; i++) {
    cumSq[i + 1] = cumSq[i] + cleanBuffer[i] * cleanBuffer[i];
  }

  for (let tau = minTau; tau <= maxTau; tau++) {
    const count = SIZE - tau;
    let acf = 0;
    for (let i = 0; i < count; i++) {
      acf += cleanBuffer[i] * cleanBuffer[i + tau];
    }
    // m(tau) = sum_{i=0}^{W-1-tau} (x[i]^2 + x[i+tau]^2)
    const m = cumSq[count] + (cumSq[SIZE] - cumSq[tau]);
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  // 3. Peak Picking (MPM Key Maxima)
  // Find positive zero crossings and record the maximum within each positive lobe
  const peaks: { tau: number; val: number }[] = [];
  let inPositiveLobe = false;
  let lobeMaxTau = minTau;
  let lobeMaxVal = -1;

  // Walk past the initial lag-0 lobe first
  let startTau = minTau;
  while (startTau < maxTau && nsdf[startTau] > 0 && nsdf[startTau] >= nsdf[startTau + 1]) {
    startTau++;
  }
  while (startTau < maxTau && nsdf[startTau] > 0) {
    startTau++;
  }

  for (let tau = startTau; tau <= maxTau; tau++) {
    const val = nsdf[tau];
    if (val > 0) {
      if (!inPositiveLobe) {
        inPositiveLobe = true;
        lobeMaxVal = val;
        lobeMaxTau = tau;
      } else if (val > lobeMaxVal) {
        lobeMaxVal = val;
        lobeMaxTau = tau;
      }
    } else if (inPositiveLobe) {
      peaks.push({ tau: lobeMaxTau, val: lobeMaxVal });
      inPositiveLobe = false;
    }
  }
  if (inPositiveLobe && lobeMaxVal > 0) {
    peaks.push({ tau: lobeMaxTau, val: lobeMaxVal });
  }

  if (peaks.length === 0) {
    return {
      frequency: lastValidFrequency,
      bCoefficient: lastValidB,
      clarity: 0,
      timestamp: Date.now(),
      isSilent: true,
    };
  }

  // Find the highest global peak n_max
  let globalMaxVal = -1;
  for (const p of peaks) {
    if (p.val > globalMaxVal) globalMaxVal = p.val;
  }

  // Clarity threshold
  if (globalMaxVal < 0.45) {
    return {
      frequency: lastValidFrequency,
      bCoefficient: lastValidB,
      clarity: globalMaxVal,
      timestamp: Date.now(),
      isSilent: true,
    };
  }

  // MPM chooses the FIRST key maximum that exceeds k * globalMaxVal (k ~ 0.90)
  // Because MPM scans lags from smallest tau (highest frequency) to largest tau (lowest frequency):
  // - If the 2nd harmonic (tau = T0/2) has a small peak (e.g. 0.40) and the true fundamental (tau = T0) has a strong peak (e.g. 0.95),
  //   k * globalMaxVal (0.90 * 0.95 = 0.855) skips the weak harmonic peak at T0/2 and picks the true fundamental at T0!
  // - Simultaneously, because it picks the FIRST peak >= k * globalMaxVal, it hits T0 before 2*T0 or 3*T0, preventing sub-octave errors!
  const k = 0.90;
  let chosenPeak = peaks[0];
  for (const p of peaks) {
    if (p.val >= k * globalMaxVal) {
      chosenPeak = p;
      break;
    }
  }

  // 5. Parabolic Interpolation on NSDF around chosenPeak.tau
  let T0 = chosenPeak.tau;
  let clarity = chosenPeak.val;
  if (T0 > minTau && T0 < maxTau) {
    const x1 = nsdf[T0 - 1];
    const x2 = nsdf[T0];
    const x3 = nsdf[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a < 0) {
      const delta = -b / (2 * a);
      if (Math.abs(delta) < 1) {
        T0 += delta;
        clarity = Math.min(1, x2 - (b * b) / (4 * a));
      }
    }
  }

  const rawFrequency = sampleRate / T0;
  if (rawFrequency < 25 || rawFrequency > 4500 || isNaN(rawFrequency)) {
    return {
      frequency: lastValidFrequency,
      bCoefficient: lastValidB,
      clarity: 0,
      timestamp: Date.now(),
      isSilent: true,
    };
  }

  // 6. Median Filter with Instant Snap on Real Note Changes
  if (recentFreqs.length > 0) {
    const currentMedian = median(recentFreqs);
    const diffCents = Math.abs(1200 * Math.log2(rawFrequency / currentMedian));
    if (diffCents > JUMP_THRESHOLD_CENTS && clarity > 0.6) {
      recentFreqs = [];
    }
  }

  recentFreqs.push(rawFrequency);
  if (recentFreqs.length > MEDIAN_WINDOW) recentFreqs.shift();

  const stableFrequency = median(recentFreqs);
  const bCoefficient = estimateInharmonicity(cleanBuffer, sampleRate, stableFrequency);

  lastValidFrequency = stableFrequency;
  lastValidB = bCoefficient;

  return {
    frequency: stableFrequency,
    bCoefficient,
    clarity,
    timestamp: Date.now(),
    isSilent: false,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Estimates string inharmonicity coefficient B from overtone partials (Rigaud 2013):
 * f_n = n * F0 * sqrt(1 + B * n^2)  =>  (f_n / (n * F0))^2 - 1 = B * n^2
 * Uses targeted Goertzel / DFT evaluation around harmonics n = 2..5 to measure real partial stretching,
 * blended with a physical piano curve fallback when higher partials are weak.
 */
export function estimateInharmonicity(buffer: Float32Array, sampleRate: number, f0: number): number {
  // Empirical physical curve baseline (Rigaud 2013 / Fletcher)
  const midi = 12 * Math.log2(f0 / 440) + 69;
  // Standard grand/upright baseline B curve across keyboard
  const baselineB = Math.max(
    0.00004,
    Math.min(0.015, 0.00012 * Math.exp(0.055 * Math.abs(midi - 55)) + (midi < 45 ? 0.00025 * (45 - midi) : 0))
  );

  // Measure partials n = 2, 3, 4 if below Nyquist
  const maxHarmonic = Math.min(5, Math.floor((sampleRate * 0.45) / f0));
  if (maxHarmonic < 2) return baselineB;

  const N = buffer.length;
  let numSum = 0;
  let denSum = 0;
  let validPartials = 0;

  for (let n = 2; n <= maxHarmonic; n++) {
    // Search in a small frequency window [n*f0 * 0.998, n*f0 * 1.025]
    const minF = n * f0 * 0.999;
    const maxF = n * f0 * (1 + 0.5 * n * n * 0.008);
    const steps = 11;
    let bestF = n * f0;
    let maxMag = 0;

    for (let s = 0; s <= steps; s++) {
      const testF = minF + ((maxF - minF) * s) / steps;
      const mag = goertzelMagnitude(buffer, sampleRate, testF, N);
      if (mag > maxMag) {
        maxMag = mag;
        bestF = testF;
      }
    }

    if (maxMag > 0.001) {
      const ratioSq = Math.pow(bestF / (n * f0), 2) - 1;
      if (ratioSq >= 0 && ratioSq < 0.15) {
        const bEst = ratioSq / (n * n);
        numSum += bEst;
        denSum += 1;
        validPartials++;
      }
    }
  }

  if (validPartials > 0 && denSum > 0) {
    const measuredB = numSum / denSum;
    // Blend 60% measured partial inharmonicity with 40% physical baseline for stability
    return Math.max(0.00002, Math.min(0.02, measuredB * 0.6 + baselineB * 0.4));
  }

  return baselineB;
}

function goertzelMagnitude(buffer: Float32Array, sampleRate: number, targetFreq: number, N: number): number {
  const omega = (2 * Math.PI * targetFreq) / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let s1 = 0;
  let s2 = 0;
  // Use first 1024 samples for fast partial peak probing
  const len = Math.min(N, 1024);
  for (let i = 0; i < len; i++) {
    const s0 = buffer[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.max(0, power)) / len;
}
