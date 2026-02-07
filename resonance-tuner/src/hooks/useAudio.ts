import { useState, useRef, useCallback } from 'react';
import type { PitchResult } from '../types/audio';

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
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createAnalyser();
      source.connect(processor);

      // Initialize Worker
      workerRef.current = new Worker(new URL('../audio/workers/pitchWorker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        // Here we'll eventually calculate cents deviation from target note
        const freq = e.data.frequency;
        if (freq > 0) {
          setPitchData({
            frequency: freq,
            note: 'A4', // Mock note detection for now
            cents: (Math.random() - 0.5) * 10, // Mock jitter for visualizer
            clarity: 0.95
          });
        }
      };

      // Poll audio data
      const buffer = new Float32Array(2048);
      let isRunning = true;

      const poll = () => {
        if (!isRunning) return;
        
        processor.getFloatTimeDomainData(buffer);
        
        // Simple volume check (RMS) to ensure there is sound
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        
        if (rms > 0.01) { // Only send to worker if there is actual sound
          workerRef.current?.postMessage({ buffer, sampleRate: audioContext.sampleRate });
        }
        
        requestAnimationFrame(poll);
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
