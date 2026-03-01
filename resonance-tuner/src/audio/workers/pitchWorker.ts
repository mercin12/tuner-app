// Pitch detection worker for heavy lifting
// Upgraded with Autocorrelation and Parabolic Interpolation for high precision
// Included Pitch Smoothing and "Sticky" logic to prevent jitter during decay

let stableFrequency = 0;
const SMOOTHING_FACTOR = 0.2; // Adjust between 0 and 1 (lower = smoother/slower)

self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  
  // High-precision Autocorrelation
  const result = detectPitch(buffer, sampleRate);
  
  self.postMessage(result);
};

function detectPitch(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  
  // 1. RMS Check (Sensitivity threshold)
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / SIZE);
  
  // Higher threshold to ignore background noise and very weak tails
  if (rms < 0.008) {
    // We don't reset stableFrequency immediately to allow for short gaps
    return { frequency: stableFrequency, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 2. Autocorrelation
  const c = new Float32Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  // Find the first peak after the initial descent
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  // Clarity represents how "periodic" the signal is
  const clarity = maxval / c[0];

  if (maxpos === -1 || clarity < 0.3) {
    return { frequency: stableFrequency, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 3. Parabolic Interpolation for sub-sample accuracy
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) T0 = T0 - b / (2 * a);

  const rawFrequency = sampleRate / T0;

  // 4. "Sticky" Smoothing Logic
  if (stableFrequency === 0) {
    stableFrequency = rawFrequency;
  } else {
    const diffCents = 1200 * Math.log2(rawFrequency / stableFrequency);
    
    // If the change is small (< 50 cents), it's the same note, so smooth it.
    // If the change is large, it's a new note, so jump immediately.
    if (Math.abs(diffCents) < 50) {
      stableFrequency = stableFrequency + (rawFrequency - stableFrequency) * SMOOTHING_FACTOR;
    } else {
      // Significant change detected - jump to new note if clarity is high
      if (clarity > 0.6) {
        stableFrequency = rawFrequency;
      }
    }
  }

  const bCoefficient = estimateInharmonicity(buffer, sampleRate, stableFrequency);

  return {
    frequency: stableFrequency,
    bCoefficient,
    clarity,
    timestamp: Date.now(),
    isSilent: false
  };
}

/**
 * Simplified inharmonicity estimation (B)
 * Based on Rigaud (2013): f_n = n * F0 * sqrt(1 + B * n^2)
 */
function estimateInharmonicity(_buffer: Float32Array, _sampleRate: number, f0: number): number {
  // In a real implementation, we'd do an FFT here and find the 2nd/3rd partials.
  // For now, we'll return a placeholder that matches common piano profiles (e.g., 0.0001 to 0.0005)
  // based on the frequency (higher B for lower notes).
  if (f0 < 100) return 0.0004;
  if (f0 < 400) return 0.0002;
  return 0.0001;
}
