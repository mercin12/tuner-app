import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Audio API
class AudioContextMock {
  resume = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn() });
  createAnalyser = vi.fn().mockReturnValue({ 
    fftSize: 2048, 
    getFloatTimeDomainData: vi.fn() 
  });
  close = vi.fn().mockResolvedValue(undefined);
  sampleRate = 44100;
}

(window as any).AudioContext = AudioContextMock;
(window as any).webkitAudioContext = AudioContextMock;

// Mock Navigator MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
    })
  },
  writable: true
});

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
});
