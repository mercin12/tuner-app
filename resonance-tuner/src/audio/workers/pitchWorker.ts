// Pitch detection worker for heavy lifting
self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  
  // Basic Autocorrelation (Prototype implementation)
  const result = autoCorrelate(buffer, sampleRate);
  
  self.postMessage(result);
};

function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  const minOffset = Math.floor(sampleRate / 4200);
  const maxOffset = Math.floor(sampleRate / 25);
  
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
  
  // Valid piano range and clarity threshold
  if (averageValue < 0.1 && frequency > 25 && frequency < 4500) {
    return {
      frequency,
      timestamp: Date.now()
    };
  }

  return { frequency: 0, timestamp: Date.now() };
}
