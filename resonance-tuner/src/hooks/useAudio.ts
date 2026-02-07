import { useState, useRef, useCallback } from 'react';
import type { PitchResult } from '../types/audio';
import { getNoteFromFrequency } from '../audio/utils/noteUtils';

export const useAudio = () => {
  const [isActive, setIsActive] = useState(false);
  const [pitchData, setPitchData] = useState<PitchResult | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.resume(); // Crucial for mobile browsers
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createAnalyser();
      processor.fftSize = 2048;
      source.connect(processor);

      // Initialize Worker
      workerRef.current = new Worker(new URL('../audio/workers/pitchWorker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const freq = e.data.frequency;
        if (freq > 0) {
          const result = getNoteFromFrequency(freq);
          if (result) {
            setPitchData({
              frequency: freq,
              note: result.note,
              cents: result.cents,
              clarity: 0.95
            });
          }
        }
      };

      // Poll audio data
      let isRunning = true;

      const poll = () => {
        if (!isRunning) return;
        
        const buffer = new Float32Array(2048);
        processor.getFloatTimeDomainData(buffer);
        
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        
        if (rms > 0.005) { 
          // Use Transferable Objects (pass buffer as second arg)
          // This prevents the main thread from lagging on data copy
          workerRef.current?.postMessage({ 
            buffer, 
            sampleRate: audioContext.sampleRate 
          }, [buffer.buffer]);
        } else {
          workerRef.current?.postMessage({ frequency: 0 });
        }
        
        requestAnimationFrame(poll);
      };

      setIsActive(true);
      poll();

      (window as any)._stopResonance = () => {
        isRunning = false;
      };

      setIsActive(true);
      poll();

      // Store stop function
      (window as any)._stopResonance = () => {
        isRunning = false;
      };
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }, []); // Removed isActive dependency to prevent loop recreation

  const stopAudio = useCallback(() => {
    setIsActive(false);
    if ((window as any)._stopResonance) (window as any)._stopResonance();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    workerRef.current?.terminate();
  }, []);

  return { isActive, pitchData, startAudio, stopAudio };
};
