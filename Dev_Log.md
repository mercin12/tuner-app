# Resonance Tuner — Development Log (`Dev_Log.md`)

## 2026-10-28 — Full Codebase Review & Acoustic / UI Refactor (`development` branch)

### 1. Root Causes Identified in Review (Why the Tuner Previously Failed)
1. **Destructive Signal Clipping (`pitchWorker.ts`)**:
   - The previous worker sliced the audio buffer between the first samples where `Math.abs(buffer[i]) < 0.2`. Because normal microphone signals typically have an amplitude of `0.01` to `0.15`, `buffer[0]` immediately triggered `Math.abs(buffer[0]) < 0.2`, setting `r1 = 0` and `r2 = SIZE - 1`, leaving the waveform unclipped or, when loud, slicing out the middle of the wave.
2. **Unnormalized Autocorrelation & Octave Errors**:
   - Standard unnormalized autocorrelation (`c[i] += buf[j] * buf[j+i]`) tapers linearly with lag `(N - tau) / N` and only walked past the first sample `while (c[d] > c[d+1]) d++`. Any high-frequency noise ripple near lag 0 caused false sub-millisecond peaks, while guitar and piano bass strings suffered severe 2nd/3rd harmonic octave-jumping.
3. **Small Buffer Size (`2048` samples) & OS Audio Filtering**:
   - At `48 kHz`, `2048` samples (`42.6 ms`) cannot capture enough periods of low piano notes (`A0 = 27.5 Hz` has a `36.4 ms` period) or low guitar tunings (`Drop D = 73.42 Hz`, `E2 = 82.41 Hz`).
   - Calling `getUserMedia({ audio: true })` left browser `echoCancellation`, `noiseSuppression`, and `autoGainControl` active, which aggressively gate and distort sustained musical notes.
4. **Stale React Closure in `useAudio.ts`**:
   - `startAudio` closed over the initial `activeProfile` state (`null`). Switching to Guitar or selecting presets (`Standard`, `Drop D`, `DADGAD`, `432 Hz`) while the tuner was running had zero effect on the running `worker.onmessage` handler.
5. **Broken Target Frequency & Piano Stretch Math (`noteUtils.ts`)**:
   - In General and Guitar modes (whenever `activeProfile` was `null`), `noteUtils.ts` unconditionally multiplied `targetFreq` by `Math.sqrt(1 + 4 * measuredB)`, pushing every note sharp!
   - Even for Piano, multiplying all notes by a positive factor shifted `A4` away from `440.0 Hz` and stretched bass notes *sharp* instead of *flat* (violating the Railsback curve where treble is stretched sharp and bass is stretched flat relative to `A4 = 440 Hz`).
   - Guitar `findClosestInProfile` used linear Hz differences instead of logarithmic cents, and 432 Hz guitar tuning displayed wrong note names (`D#2` instead of `E2`) because MIDI conversion hardcoded `440 Hz`.
6. **Missing & Disconnected UI Features (`App.tsx` & `PhaseRing.tsx`)**:
   - Switching to Guitar mode never activated `GUITAR_TUNINGS[0]` (`Standard`) by default.
   - `Note` name was hidden in General and Guitar modes on `main`.
   - `PhaseRing` in Piano mode drew a `0`-radian arc when `cents === 0` (making the ring disappear when in tune).
   - `Library` and `Settings` tabs were empty placeholders, and Piano `NOVICE` / `PRO` modes had no functional controls.

---

### 2. Refactoring & Features Implemented
- **McLeod Pitch Method (MPM / Normalized Square Difference Function) in `src/audio/workers/pitchWorker.ts`**:
  - Replaced unnormalized autocorrelation with full O(1)-window-normalized NSDF (`2 * r(tau) / m(tau)`), DC offset removal, MPM first-lobe key maxima selection (`k = 0.85`), sub-harmonic fundamental verification for bass strings, parabolic sub-sample interpolation, and 5-frame median filtering with instant note-jump snapping.
  - Implemented real spectral partial probing (Goertzel DFT evaluation across harmonics $n = 2..5$) blended with a physical Fletcher/Rigaud baseline to estimate string inharmonicity coefficient $B$.
- **Accurate Guitar & Piano Tuning Math in `src/audio/utils/noteUtils.ts`**:
  - Fixed Equal Temperament calculation for General & Guitar modes.
  - Added proper Railsback / Rigaud (2013) piano stretch calculation (`calculatePianoStretchCents`) anchored at `A4 = 0.0¢`, stretching treble sharp and bass flat, with customizable Octave (`2:1`) and Twelfths (`3:1`) purity weighting in `PRO` mode.
  - Switched profile matching to logarithmic cents distance (`findClosestInProfileByCents`) and added Manual String Lock support for Guitar.
- **Zero-Stale-Closure Audio Hook & Reference Tone Generator (`src/hooks/useAudio.ts`)**:
  - Upgraded `AnalyserNode.fftSize` to `4096` and disabled OS `echoCancellation`, `autoGainControl`, and `noiseSuppression`.
  - Stored `activeProfile` and `NoteCalculationOptions` in refs so changing instruments, presets, string locks, or `A4` reference pitch updates the live tuner immediately.
  - Added `workerBusy` backpressure guard and proper `requestAnimationFrame` cleanup.
  - Added `playReferenceTone` synthesizer so users can audition any target note or guitar string.
- **Complete Guitar & Piano UI (`src/App.tsx`, `src/components/visualizers/PhaseRing.tsx`, `src/components/novice/TensionSafety.tsx`)**:
  - Prominent Note Name, live Hz, Target Hz, and clear `TUNE UP ↑` / `TUNE DOWN ↓` / `IN TUNE` indicators across all modes.
  - **Guitar Mode**: Auto-loads `Guitar: Standard`, provides interactive 6-string lock & reference tone buttons (`6E`–`1E`), built-in presets (`Standard`, `Drop D`, `Open G`, `DADGAD`, `Half-Step Down`, `432 Hz`), and a clean Custom Tuning modal.
  - **Piano Mode**: Restored `TensionSafety` monitor (calculating steel wire stress in MPa from speaking length plus pitch-raise overshoot prediction) in `NOVICE` mode, Interval Weighting sliders (`Octave Purity` & `Twelfths Purity`) in `PRO` mode, and improved 88-key `CALIBRATION` sweep with reset & save at any sample count.
  - **Library & Settings Views**: Full profile manager in `Library` and Concert `A4` Reference Pitch (`415–466 Hz`) + Haptic Lock controls in `Settings`.
  - **Backend Alignment (`resonance-backend/worker.js`)**: Updated Neon Postgres queries to store and retrieve full `TuningProfile` JSON records.
