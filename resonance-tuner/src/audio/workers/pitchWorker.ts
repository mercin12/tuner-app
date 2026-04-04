// Pitch detection worker with median filtering for stability + responsiveness
// Features: Median window (noise rejection without lag), fixed clipping direction,
// window-clear on large note jumps for instant response

let recentFreqs: number[] = [];
const MEDIAN_WINDOW = 5;
// Large jumps (new note): clear the window to snap immediately if clarity is good
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
    recentFreqs = []; // Clear history on silence so stale readings don't persist
    return { frequency: 0, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 2. Clip to strong signal region (find first/last sample at or above threshold)
  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;
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

  let d = 0;
  while (c[d] > c[d + 1]) d++;

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

  // 4. Parabolic Interpolation for sub-sample precision
  let T0 = maxpos;
  if (T0 > 0 && T0 < c.length - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) T0 = T0 - b / (2 * a);
  }

  const rawFrequency = sampleRate / T0;

  // 5. Median filter with instant snap on large note jumps
  // If the new reading is far from the current window median and clearly confident,
  // clear the window so the median snaps immediately instead of slowly drifting over.
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
