import { useState, useRef, useCallback } from 'react';
import type { PitchResult } from '../types/audio';
import { getNoteFromFrequency } from '../audio/utils/noteUtils';
import type { TuningProfile } from '../services/database';

export const useAudio = (activeProfile?: TuningProfile | null) => {
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
      await audioContext.resume();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createAnalyser();
      processor.fftSize = 2048;
      source.connect(processor);

      // Initialize Worker
      workerRef.current = new Worker(new URL('../audio/workers/pitchWorker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const { frequency, clarity, bCoefficient, isSilent } = e.data;
        if (frequency > 0) {
          const result = getNoteFromFrequency(frequency, activeProfile, bCoefficient);
          if (result) {
            setPitchData({
              frequency,
              note: result.note,
              cents: result.cents,
              clarity,
              inTune: result.inTune,
              isSilent: !!isSilent
            });
          }
        }
      };

      let isRunning = true;
      const poll = () => {
        if (!isRunning) return;
        const buffer = new Float32Array(2048);
        processor.getFloatTimeDomainData(buffer);
        workerRef.current?.postMessage({ 
          buffer, 
          sampleRate: audioContext.sampleRate 
        });
        requestAnimationFrame(poll);
      };

      setIsActive(true);
      poll();

      (window as any)._stopResonance = () => {
        isRunning = false;
      };
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  }, [activeProfile]);

  const stopAudio = useCallback(() => {
    setIsActive(false);
    if ((window as any)._stopResonance) (window as any)._stopResonance();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    workerRef.current?.terminate();
    setPitchData(null);
  }, []);

  return { isActive, pitchData, startAudio, stopAudio };
};
