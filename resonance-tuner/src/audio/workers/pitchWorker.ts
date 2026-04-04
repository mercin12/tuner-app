// Pitch detection worker with median filtering for stability + responsiveness
// Features: 4096-sample buffer for low-note support, sub-harmonic verification
// to prevent octave errors, adaptive clipping, and median window for noise rejection

let recentFreqs: number[] = [];
const MEDIAN_WINDOW = 5;
const JUMP_THRESHOLD_CENTS = 50;

self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  const result = detectPitch(buffer, sampleRate);
  self.postMessage(result);
};

function detectPitch(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;

  // 1. RMS Check
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / SIZE);

  if (rms < 0.01) {
    recentFreqs = [];
    return { frequency: 0, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 2. Adaptive clipping — threshold scales with signal level so quiet
  //    low notes aren't over-trimmed while loud signals still get clipped cleanly
  let r1 = 0, r2 = SIZE - 1;
  const threshold = Math.max(0.05, rms * 1.5);
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) >= threshold) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) >= threshold) { r2 = SIZE - i; break; }
  }

  const clippedBuffer = buffer.slice(r1, r2);
  if (clippedBuffer.length < SIZE / 4) {
    const fallback = recentFreqs.length ? median(recentFreqs) : 0;
    return { frequency: fallback, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 3. Autocorrelation on clipped buffer
  const c = new Float32Array(clippedBuffer.length).fill(0);
  for (let i = 0; i < clippedBuffer.length; i++) {
    for (let j = 0; j < clippedBuffer.length - i; j++) {
      c[i] = c[i] + clippedBuffer[j] * clippedBuffer[j + i];
    }
  }

  // Walk past the initial decreasing region to find the first trough
  let d = 0;
  while (d < c.length - 1 && c[d] > c[d + 1]) d++;

  // Find the highest peak after the first trough
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < c.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  const clarity = maxval / c[0];
  if (maxpos === -1 || clarity < 0.4) {
    const fallback = recentFreqs.length ? median(recentFreqs) : 0;
    return { frequency: fallback, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 4. Sub-harmonic verification — prevent octave errors
  // Autocorrelation of a periodic signal has peaks at lag T, 2T, 3T...
  // If we found a peak at lag T, check whether a valid peak exists near 2T.
  // If it does, the real fundamental is the lower frequency (lag 2T), and
  // what we found at T was just the second harmonic.
  const doublePos = maxpos * 2;
  if (doublePos < c.length - 1) {
    // Search ±5% around 2*maxpos to account for inharmonicity
    const searchStart = Math.max(d, Math.floor(doublePos * 0.95));
    const searchEnd = Math.min(Math.ceil(doublePos * 1.05), c.length - 1);
    let subMax = -1;
    let subPos = -1;
    for (let i = searchStart; i <= searchEnd; i++) {
      if (c[i] > subMax) {
        subMax = c[i];
        subPos = i;
      }
    }
    const subClarity = subMax / c[0];
    // Accept the sub-harmonic if it has reasonable correlation strength.
    // The threshold is lower than the main clarity check (0.4) because
    // autocorrelation naturally decays at longer lags.
    if (subClarity > 0.3) {
      maxpos = subPos;
      maxval = subMax;
    }
  }

  // 5. Parabolic Interpolation for sub-sample precision
  let T0 = maxpos;
  if (T0 > 0 && T0 < c.length - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) T0 = T0 - b / (2 * a);
  }

  const rawFrequency = sampleRate / T0;

  // 6. Median filter with instant snap on large note jumps
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
  const bCoefficient = estimateInharmonicity(buffer, sampleRate, stableFrequency);

  return {
    frequency: stableFrequency,
    bCoefficient,
    clarity,
    timestamp: Date.now(),
    isSilent: false
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Simplified inharmonicity estimation (B)
 * Based on Rigaud (2013): f_n = n * F0 * sqrt(1 + B * n^2)
 */
function estimateInharmonicity(_buffer: Float32Array, _sampleRate: number, f0: number): number {
  if (f0 < 100) return 0.0004; // Bass
  if (f0 < 250) return 0.0002; // Low-Mid
  if (f0 < 600) return 0.0001; // Middle
  return 0.00005;               // High
}
