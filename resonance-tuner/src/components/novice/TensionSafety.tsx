import React, { useMemo } from 'react';

interface TensionSafetyProps {
  speakingLength: number; // in mm
  frequency: number;      // target frequency
  currentFrequency: number;
  onSpeakingLengthChange?: (lengthMm: number) => void;
}

export const TensionSafety: React.FC<TensionSafetyProps> = ({
  speakingLength,
  frequency,
  currentFrequency,
  onSpeakingLengthChange,
}) => {
  const safetyMetrics = useMemo(() => {
    const activeFreq = currentFrequency > 20 ? currentFrequency : frequency || 440;
    if (!speakingLength || !activeFreq) return null;

    // Physics Model: Tensile Stress (Sigma) for vibrating steel music wire
    // Sigma = 4 * rho * L^2 * f^2
    // rho (Density of High-Carbon Steel) = 7850 kg/m^3
    // Breaking point of Music Wire ~2400-2600 MPa (Ultimate Tensile Strength)
    // Yield point (Permanent Deformation) ~1150 MPa
    const RHO_STEEL = 7850;
    const lengthMeters = speakingLength / 1000;

    // Calculate current stress in Pascals
    const currentStress = 4 * RHO_STEEL * Math.pow(lengthMeters, 2) * Math.pow(activeFreq, 2);

    // Convert to Megapascals (MPa)
    const stressMPa = currentStress / 1000000;

    // Safety Limits
    const YIELD_STRENGTH = 1150; // Warning Zone start
    const BREAKING_POINT = 2200; // Danger Zone (Snap risk)

    // Map 0-1500 MPa to 0-100% of the bar
    const percentage = (stressMPa / 1500) * 100;

    const isSafe = stressMPa < YIELD_STRENGTH;
    const isWarning = stressMPa >= YIELD_STRENGTH && stressMPa < BREAKING_POINT;
    const isDanger = stressMPa >= BREAKING_POINT;

    // Tension Gradient / Overshoot recommendation when pitching up a flat string
    const centsFlat = frequency > 0 && currentFrequency > 20
      ? 1200 * Math.log2(frequency / currentFrequency)
      : 0;
    const overshootCents = centsFlat > 15 ? Math.min(12, +(centsFlat * 0.18).toFixed(1)) : 0;

    return { percentage, stressMPa, isSafe, isWarning, isDanger, overshootCents };
  }, [speakingLength, frequency, currentFrequency]);

  if (!safetyMetrics) return null;

  return (
    <div className="p-5 bg-[#0f172a]/70 rounded-2xl border border-slate-800/70 shadow-lg space-y-3 w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Tension Safety Monitor
          </h3>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              safetyMetrics.isSafe
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/50'
                : safetyMetrics.isWarning
                ? 'text-amber-400 bg-amber-950/60 border border-amber-800/50'
                : 'text-rose-400 bg-rose-950/60 border border-rose-800/50'
            }`}
          >
            {safetyMetrics.isSafe
              ? 'SAFE ZONE'
              : safetyMetrics.isWarning
              ? 'HIGH TENSION'
              : 'BREAKING RISK'}
          </span>
        </div>
        <span className="text-xs text-slate-300 font-mono font-bold">
          {Math.round(safetyMetrics.stressMPa)} MPa
        </span>
      </div>

      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/50 z-10"
          style={{ left: '76%' }}
          title="Yield Warning (1150 MPa)"
        />
        <div
          className={`h-full transition-all duration-300 ease-out ${
            safetyMetrics.isDanger
              ? 'bg-rose-600 animate-pulse'
              : safetyMetrics.isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(Math.max(safetyMetrics.percentage, 4), 100)}%` }}
        />
      </div>

      {onSpeakingLengthChange && (
        <div className="pt-1 flex items-center justify-between gap-4">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
            String Speaking Length: <span className="text-blue-400 font-mono">{speakingLength} mm</span>
          </label>
          <input
            type="range"
            min={80}
            max={1400}
            step={10}
            value={speakingLength}
            onChange={(e) => onSpeakingLengthChange(Number(e.target.value))}
            aria-label="String Speaking Length"
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {safetyMetrics.overshootCents > 0 && (
        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-1.5 flex justify-between items-center">
          <span>Pitch-Raise Settling Prediction:</span>
          <span className="font-mono font-bold">Over-pull by +{safetyMetrics.overshootCents}¢</span>
        </div>
      )}
    </div>
  );
};
