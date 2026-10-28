import { useState, useRef, useCallback, useEffect } from 'react';
import type { PitchResult } from '../types/audio';
import { getNoteFromFrequency } from '../audio/utils/noteUtils';
import type { NoteCalculationOptions } from '../audio/utils/noteUtils';
import type { TuningProfile } from '../services/database';

export interface AudioHookOptions extends NoteCalculationOptions {
  onPitchDetected?: (result: PitchResult) => void;
}

export const useAudio = (
  activeProfile?: TuningProfile | null,
  options: AudioHookOptions = {}
) => {
  const [isActive, setIsActive] = useState(false);
  const [pitchData, setPitchData] = useState<PitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const toneOscRef = useRef<OscillatorNode | null>(null);
  const toneGainRef = useRef<GainNode | null>(null);

  // Keep latest activeProfile and options in refs so the running audio worker callback
  // always evaluates against the user's current instrument, preset, or settings without restarting the mic!
  const profileRef = useRef<TuningProfile | null | undefined>(activeProfile);
  const optionsRef = useRef<AudioHookOptions>(options);

  useEffect(() => {
    profileRef.current = activeProfile;
    optionsRef.current = options;
  }, [activeProfile, options]);

  const startAudio = useCallback(async () => {
    setError(null);
    try {
      // Request raw microphone audio with OS-level voice processing disabled
      // so guitar & piano sine/overtone waves are not distorted or gated out!
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createAnalyser();
      processor.fftSize = 4096;
      processor.smoothingTimeConstant = 0;
      source.connect(processor);

      // Initialize Worker
      workerRef.current = new Worker(
        new URL('../audio/workers/pitchWorker.ts', import.meta.url),
        { type: 'module' }
      );

      let workerBusy = false;

      workerRef.current.onmessage = (e) => {
        workerBusy = false;
        const { frequency, clarity, bCoefficient, isSilent } = e.data;
        if (frequency > 0) {
          const result = getNoteFromFrequency(
            frequency,
            profileRef.current,
            bCoefficient,
            optionsRef.current
          );
          if (result) {
            const pitchResult: PitchResult = {
              frequency,
              note: result.note,
              cents: result.cents,
              clarity,
              inTune: result.inTune,
              isSilent: !!isSilent,
              targetFreq: result.targetFreq,
              midiNote: result.midiNote,
              bCoefficient: bCoefficient || 0.0001,
            };
            setPitchData(pitchResult);
            optionsRef.current.onPitchDetected?.(pitchResult);
          }
        } else if (isSilent) {
          setPitchData((prev) => (prev ? { ...prev, isSilent: true, clarity: 0 } : null));
        }
      };

      let isRunning = true;
      const buffer = new Float32Array(processor.fftSize);

      const poll = () => {
        if (!isRunning) return;
        if (!workerBusy && workerRef.current) {
          processor.getFloatTimeDomainData(buffer);
          workerBusy = true;
          workerRef.current.postMessage({
            buffer,
            sampleRate: audioContext.sampleRate,
          });
        }
        rafIdRef.current = requestAnimationFrame(poll);
      };

      setIsActive(true);
      poll();

      (window as unknown as { _stopResonance?: () => void })._stopResonance = () => {
        isRunning = false;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    } catch (err) {
      console.error('Microphone access denied', err);
      setError('Microphone access was denied or unavailable. Please allow microphone permissions.');
      setIsActive(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    setIsActive(false);
    const win = window as unknown as { _stopResonance?: () => void };
    if (win._stopResonance) win._stopResonance();
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    workerRef.current?.terminate();
    setPitchData(null);
  }, []);

  /**
   * Plays a warm reference tone (fundamental + gentle 2nd/3rd harmonic) for a target frequency
   * so guitarists and pianists can hear the exact reference pitch.
   */
  const playReferenceTone = useCallback((freq: number, durationMs = 1800) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx =
        audioContextRef.current && audioContextRef.current.state === 'running'
          ? audioContextRef.current
          : new AudioCtx();

      if (toneOscRef.current) {
        try {
          toneOscRef.current.stop();
        } catch {
          // ignore
        }
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);

      toneOscRef.current = osc;
      toneGainRef.current = gain;
    } catch (e) {
      console.warn('Could not play reference tone:', e);
    }
  }, []);

  useEffect(() => {
    return () => {
      const win = window as unknown as { _stopResonance?: () => void };
      if (win._stopResonance) win._stopResonance();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      workerRef.current?.terminate();
    };
  }, []);

  return { isActive, pitchData, error, startAudio, stopAudio, playReferenceTone };
};
