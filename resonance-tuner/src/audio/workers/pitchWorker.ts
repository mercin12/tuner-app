// Pitch detection worker for heavy lifting
let lastFrequency = 0;

self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  
  // Basic Autocorrelation (Prototype implementation)
  const result = autoCorrelate(buffer, sampleRate);
  
  self.postMessage(result);
};

function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  
  // 1. RMS Check: Lowered to 0.002 to match main thread and capture sustain
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / SIZE);
  
  if (rms < 0.002) {
    lastFrequency = 0;
    return { frequency: 0, timestamp: Date.now() };
  }

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
  
  // Dynamic Threshold Logic:
  // If the new frequency is close to the last one (Sustain), be more lenient.
  const isSustain = lastFrequency > 0 && Math.abs(frequency - lastFrequency) < 2;
  const threshold = isSustain ? 0.15 : 0.08; // 0.15 allows for "messier" sustain tails

  if (averageValue < threshold && frequency > 26.5 && frequency < 4500) {
    lastFrequency = frequency;
    return {
      frequency,
      timestamp: Date.now()
    };
  }

  // Only reset if we truly lost the signal (very high difference)
  if (averageValue > 0.3) lastFrequency = 0;

  return { frequency: 0, timestamp: Date.now() };
}
