import React, { useMemo } from 'react';

interface TensionSafetyProps {
  speakingLength: number; // in mm
  frequency: number;      // target frequency
  currentFrequency: number;
}

export const TensionSafety: React.FC<TensionSafetyProps> = ({ 
  speakingLength, 
  frequency,
  currentFrequency 
}) => {
  const safetyMetrics = useMemo(() => {
    if (!speakingLength || !frequency) return null;
    
    // Simple physical model (simplified for prototype)
    // T = (2 * L * f)^2 * mu
    // We calculate the ratio of current tension vs target
    const targetTension = Math.pow(2 * (speakingLength/1000) * frequency, 2);
    const currentTension = Math.pow(2 * (speakingLength/1000) * currentFrequency, 2);
    
    const percentageOfTarget = (currentTension / targetTension) * 100;
    const isSafe = percentageOfTarget < 110; // Allow 10% over-pull for pitch raise

    return { percentageOfTarget, isSafe };
  }, [speakingLength, frequency, currentFrequency]);

  if (!safetyMetrics) return null;

  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
      <h3 className="text-slate-400 text-sm font-semibold mb-2">TENSION GRADIENT</h3>
      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${safetyMetrics.isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(safetyMetrics.percentageOfTarget, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-slate-500">Elastic Limit: 110%</span>
        <span className={`text-xs font-mono ${safetyMetrics.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
          {safetyMetrics.percentageOfTarget.toFixed(1)}% LOAD
        </span>
      </div>
    </div>
  );
};
