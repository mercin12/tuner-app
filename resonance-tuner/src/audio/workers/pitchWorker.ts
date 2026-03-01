// Pitch detection worker with MixButton-style stability and high-precision Autocorrelation
// Features: Threshold clipping, aggressive EMA smoothing, and "Sticky" note locking

let stableFrequency = 0;
// Aggressive smoothing (0.05) makes the display very steady
const SMOOTHING_FACTOR = 0.05; 
const STICKY_THRESHOLD_CENTS = 40; // Only jump if we are > 40 cents away from stable note

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
  
  // Ignore noise
  if (rms < 0.01) {
    return { frequency: stableFrequency, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 2. MixButton-style Clipping (Thresholding)
  // We only look at the part of the buffer where the signal is strong
  let r1 = 0, r2 = SIZE - 1, threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
  
  const clippedBuffer = buffer.slice(r1, r2);
  if (clippedBuffer.length < SIZE / 4) {
      return { frequency: stableFrequency, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
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
    return { frequency: stableFrequency, bCoefficient: 0, clarity: 0, timestamp: Date.now(), isSilent: true };
  }

  // 4. Parabolic Interpolation
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) T0 = T0 - b / (2 * a);

  const rawFrequency = sampleRate / T0;

  // 5. Aggressive Sticky Logic
  if (stableFrequency === 0) {
    stableFrequency = rawFrequency;
  } else {
    const diffCents = Math.abs(1200 * Math.log2(rawFrequency / stableFrequency));
    
    if (diffCents < STICKY_THRESHOLD_CENTS) {
      // Same note: Apply aggressive smoothing for visual stability
      stableFrequency = stableFrequency + (rawFrequency - stableFrequency) * SMOOTHING_FACTOR;
    } else {
      // Significant jump: Only switch if the signal is very clear
      if (clarity > 0.7) {
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

function estimateInharmonicity(_buffer: Float32Array, _sampleRate: number, f0: number): number {
  if (f0 < 100) return 0.0004;
  if (f0 < 400) return 0.0002;
  return 0.0001;
}
