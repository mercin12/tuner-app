// Pitch detection worker for heavy lifting
self.onmessage = (e: MessageEvent) => {
  const { buffer, sampleRate } = e.data;
  
  // Basic Autocorrelation (Prototype implementation)
  const result = autoCorrelate(buffer, sampleRate);
  
  self.postMessage(result);
};

function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  
  // Piano frequency range: ~27Hz to ~4186Hz
  // Max offset (for 27Hz) = sampleRate / 27 
  // Min offset (for 4186Hz) = sampleRate / 4186
  const minOffset = Math.floor(sampleRate / 4200);
  const maxOffset = Math.floor(sampleRate / 25);
  
  let bestOffset = -1;
  let bestCorrelation = 0;
  
  for (let offset = minOffset; offset < maxOffset; offset++) {
    let correlation = 0;
    for (let i = 0; i < SIZE - offset; i++) {
      correlation += buffer[i] * buffer[i + offset];
    }
    
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  const frequency = sampleRate / bestOffset;
  
  // Adjusted correlation check for normalized buffer
  if (bestCorrelation > 0.01 && frequency > 20 && frequency < 5000) {
    return {
      frequency,
      timestamp: Date.now()
    };
  }

  return { frequency: 0, timestamp: Date.now() };
}
