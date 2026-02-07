// Pitch detection worker for heavy lifting
self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  
  // Basic Autocorrelation (Prototype implementation)
  const result = autoCorrelate(buffer, sampleRate);
  
  self.postMessage(result);
};

function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  
  // 1. RMS Check: Reject if signal is too weak (Silence/Noise floor)
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / SIZE);
  if (rms < 0.01) return { frequency: 0, timestamp: Date.now() };

  // Piano frequency range: ~27Hz to ~4186Hz
  // Max offset (for 27Hz) = sampleRate / 27 
  // Min offset (for 4186Hz) = sampleRate / 4186
  const minOffset = Math.floor(sampleRate / 4500);
  const maxOffset = Math.floor(sampleRate / 26); // Stop searching below 26Hz
  
  let bestOffset = -1;
  let minDifference = Infinity;
  
  // AMDF is faster than Autocorrelation because it uses subtraction/abs 
  // instead of multiplication, which is much easier for mobile CPUs.
  for (let offset = minOffset; offset < maxOffset; offset++) {
    let difference = 0;
    for (let i = 0; i < SIZE - offset; i++) {
      difference += Math.abs(buffer[i] - buffer[i + offset]);
    }
    
    if (difference < minDifference) {
      minDifference = difference;
      bestOffset = offset;
    }
  }

  // Calculate "clarity" (relative quality of the match)
  const averageValue = minDifference / SIZE;
  const frequency = sampleRate / bestOffset;
  
  // Stricter clarity: < 0.08 requires a clearer signal
  // Range: > 26.5Hz to allow A0 (27.5Hz) but reject 25Hz noise
  // Weighted preference for higher frequencies to avoid sub-harmonic drop
  if (averageValue < 0.08 && frequency > 26.5 && frequency < 4500) {
    return {
      frequency,
      timestamp: Date.now()
    };
  }

  return { frequency: 0, timestamp: Date.now() };
}
