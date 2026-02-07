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
    if (!speakingLength || !currentFrequency) return null;
    
    // Physics Model: Tensile Stress (Sigma)
    // Sigma = 4 * rho * L^2 * f^2
    // rho (Density of High-Carbon Steel) = 7850 kg/m^3
    // Breaking point of Piano Wire ~2600 MPa (Ultimate Tensile Strength)
    // Yield point (Permanent Deformation) ~1100-1200 MPa
    
    const RHO_STEEL = 7850; 
    const lengthMeters = speakingLength / 1000;
    
    // Calculate current stress in Pascals
    const currentStress = 4 * RHO_STEEL * Math.pow(lengthMeters, 2) * Math.pow(currentFrequency, 2);
    
    // Convert to Megapascals (MPa)
    const stressMPa = currentStress / 1000000;
    
    // Safety Limits
    const YIELD_STRENGTH = 1100; // Warning Zone start
    const BREAKING_POINT = 2400; // Danger Zone (Snap)
    
    // Calculate percentage relative to the yield point (safe working limit)
    // We map 0-1300 MPa to 0-100% of the bar
    const percentage = (stressMPa / 1300) * 100;
    
    // Determine status
    const isSafe = stressMPa < YIELD_STRENGTH;
    const isWarning = stressMPa >= YIELD_STRENGTH && stressMPa < BREAKING_POINT;
    const isDanger = stressMPa >= BREAKING_POINT;

    return { percentage, stressMPa, isSafe, isWarning, isDanger };
  }, [speakingLength, currentFrequency]);

  if (!safetyMetrics) return null;

  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
      <div className="flex justify-between items-end mb-2">
        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tension Gradient</h3>
        <span className="text-[9px] text-slate-500 font-mono">
          {Math.round(safetyMetrics.stressMPa)} MPa
        </span>
      </div>
      
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
        {/* Safety Markers */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/30 z-10" style={{ left: '85%' }} title="Yield Warning"></div>
        
        <div 
          className={`h-full transition-all duration-300 ease-out ${
            safetyMetrics.isDanger ? 'bg-rose-600 animate-pulse' : 
            safetyMetrics.isWarning ? 'bg-yellow-500' : 
            'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(safetyMetrics.percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 items-center">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
          safetyMetrics.isSafe ? 'text-emerald-400 bg-emerald-900/20' : 
          safetyMetrics.isWarning ? 'text-yellow-400 bg-yellow-900/20' : 
          'text-rose-400 bg-rose-900/20'
        }`}>
          {safetyMetrics.isSafe ? 'SAFE ZONE' : safetyMetrics.isWarning ? 'HIGH TENSION' : 'BREAKING POINT'}
        </span>
        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
          Steel Stress Limit
        </span>
      </div>
    </div>
  );
};
