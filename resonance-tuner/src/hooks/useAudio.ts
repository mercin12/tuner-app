import { useState, useEffect, useRef, useCallback } from 'react';
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
      const poll = () => {
        if (!isActive) return;
        processor.getFloatTimeDomainData(buffer);
        workerRef.current?.postMessage({ buffer, sampleRate: audioContext.sampleRate });
        requestAnimationFrame(poll);
      };

      setIsActive(true);
      poll();
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }, [isActive]);

  const stopAudio = useCallback(() => {
    setIsActive(false);
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    workerRef.current?.terminate();
  }, []);

  return { isActive, pitchData, startAudio, stopAudio };
};
