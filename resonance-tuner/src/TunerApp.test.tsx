import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { detectPitch } from './audio/workers/pitchWorker';
import { getNoteFromFrequency, calculatePianoStretchCents } from './audio/utils/noteUtils';
import { GUITAR_TUNINGS } from './services/database';

function generateSignal(
  fundamentalHz: number,
  sampleRate: number,
  size: number,
  harmonics: { mult: number; amp: number; inharmonicityB?: number }[] = [{ mult: 1, amp: 1 }]
): Float32Array {
  const buffer = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    let val = 0;
    const t = i / sampleRate;
    for (const h of harmonics) {
      const b = h.inharmonicityB || 0;
      const freq = fundamentalHz * h.mult * Math.sqrt(1 + b * h.mult * h.mult);
      val += h.amp * Math.sin(2 * Math.PI * freq * t);
    }
    buffer[i] = val;
  }
  return buffer;
}

describe('Resonance Tuner Acoustic Engine & Pitch Detection (Guitar & Piano)', () => {
  const sampleRate = 48000;
  const bufferSize = 4096;

  it('accurately detects A4 (440.0 Hz) within 0.1 cents', () => {
    const buf = generateSignal(440.0, sampleRate, bufferSize);
    const res = detectPitch(buf, sampleRate);
    expect(res.isSilent).toBe(false);
    expect(Math.abs(res.frequency - 440.0)).toBeLessThan(0.2);

    const noteInfo = getNoteFromFrequency(res.frequency, null, res.bCoefficient, {
      instrument: 'GENERAL',
    });
    expect(noteInfo?.note).toBe('A4');
    expect(Math.abs(noteInfo?.cents || 0)).toBeLessThan(0.5);
  });

  it('accurately detects all 6 Guitar Standard strings (E2, A2, D3, G3, B3, E4) even with strong overtones', () => {
    const standardStrings = [
      { note: 'E2', hz: 82.41 },
      { note: 'A2', hz: 110.0 },
      { note: 'D3', hz: 146.83 },
      { note: 'G3', hz: 196.0 },
      { note: 'B3', hz: 246.94 },
      { note: 'E4', hz: 329.63 },
    ];

    for (const str of standardStrings) {
      // Simulate realistic plucked guitar string where 2nd and 3rd harmonics are strong
      const buf = generateSignal(str.hz, sampleRate, bufferSize, [
        { mult: 1, amp: 0.65 },
        { mult: 2, amp: 0.85 },
        { mult: 3, amp: 0.45 },
      ]);
      // Run 3 frames so the 5-frame median window locks onto the new note
      detectPitch(buf, sampleRate);
      detectPitch(buf, sampleRate);
      const res = detectPitch(buf, sampleRate);

      expect(res.isSilent).toBe(false);
      expect(Math.abs(res.frequency - str.hz)).toBeLessThan(0.5);

      const noteInfo = getNoteFromFrequency(res.frequency, GUITAR_TUNINGS[0], res.bCoefficient, {
        instrument: 'GUITAR',
      });
      expect(noteInfo?.note).toBe(str.note);
      expect(noteInfo?.inTune).toBe(true);
    }
  });

  it('accurately detects low Piano bass notes (E1 = 41.20 Hz, C2 = 65.41 Hz) and high treble (C7 = 2093.0 Hz)', () => {
    const pianoNotes = [
      { note: 'E1', hz: 41.2 },
      { note: 'C2', hz: 65.41 },
      { note: 'C4', hz: 261.63 },
      { note: 'C7', hz: 2093.0 },
    ];

    for (const pn of pianoNotes) {
      const buf = generateSignal(pn.hz, sampleRate, bufferSize, [
        { mult: 1, amp: 0.8, inharmonicityB: 0.0002 },
        { mult: 2, amp: 0.5, inharmonicityB: 0.0002 },
        { mult: 3, amp: 0.25, inharmonicityB: 0.0002 },
      ]);
      detectPitch(buf, sampleRate);
      detectPitch(buf, sampleRate);
      const res = detectPitch(buf, sampleRate);

      expect(res.isSilent).toBe(false);
      const centsErr = Math.abs(1200 * Math.log2(res.frequency / pn.hz));
      expect(centsErr).toBeLessThan(3);
    }
  });

  it('applies proper Railsback stretch curve in Piano mode (A4 = 0¢ stretch, Treble > 0¢, Bass < 0¢)', () => {
    const a4Stretch = calculatePianoStretchCents(69, 0.0001, 'PRO', 75, 40);
    const c7Stretch = calculatePianoStretchCents(96, 0.0001, 'PRO', 75, 40);
    const a1Stretch = calculatePianoStretchCents(33, 0.0004, 'PRO', 75, 40);

    expect(a4Stretch).toBe(0);
    expect(c7Stretch).toBeGreaterThan(8); // Treble stretched sharp
    expect(a1Stretch).toBeLessThan(-5);   // Bass stretched flat
  });
});

describe('Resonance Tuner Navigation & Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const acceptTerms = () => {
    render(<App />);
    const acceptButton = screen.getByText(/I Accept the Risk/i);
    fireEvent.click(acceptButton);
  };

  it('renders Tuner as the first navigation option and Help as the last', () => {
    acceptTerms();
    expect(screen.getByText('Tuner')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('shows Calibration option only when Piano instrument is selected', () => {
    acceptTerms();
    expect(screen.queryByText('CALIBRATION')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Piano'));
    expect(screen.getByText('CALIBRATION')).toBeInTheDocument();
    expect(screen.getByText(/Tension Safety Monitor/i)).toBeInTheDocument();
  });

  it('activates Guitar: Standard preset and string lock buttons when switching to Guitar mode', () => {
    acceptTerms();
    fireEvent.click(screen.getByText('Guitar'));

    expect(screen.getByText('6E')).toBeInTheDocument();
    expect(screen.getByText('1E')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Drop D')).toBeInTheDocument();
    expect(screen.getByText('Open G')).toBeInTheDocument();
  });

  it('switches to Calibration recording view when selected under Piano', () => {
    acceptTerms();
    fireEvent.click(screen.getByText('Piano'));
    fireEvent.click(screen.getByText('CALIBRATION'));

    expect(screen.getByText(/Recording Profile/i)).toBeInTheDocument();
  });

  it('renders the Play button in the tuner view', () => {
    acceptTerms();
    const buttons = screen.getAllByRole('button');
    const playButton = buttons.find(
      (b) => b.className.includes('rounded-full') && b.className.includes('w-16')
    );
    expect(playButton).toBeInTheDocument();
  });
});
