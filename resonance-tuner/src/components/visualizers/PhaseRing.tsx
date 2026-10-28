import React, { useEffect, useRef } from 'react';

interface PhaseRingProps {
  cents: number;
  isActive: boolean;
  isSilent?: boolean;
  variant?: 'GENERAL' | 'GUITAR' | 'PIANO';
}

export const PhaseRing: React.FC<PhaseRingProps> = ({
  cents,
  isActive,
  isSilent = false,
  variant = 'GENERAL',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothCentsRef = useRef(0);
  const pulsePhaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.76;

      // Clamp displayed cents to [-50, 50] for visual gauge
      const clampedTarget = Math.max(-50, Math.min(50, cents));

      if (isActive && !isSilent) {
        // Adaptive smoothing: fast when far off, rock-steady when close
        const error = Math.abs(clampedTarget - smoothCentsRef.current);
        const factor = error > 25 ? 0.45 : error > 8 ? 0.22 : 0.1;
        smoothCentsRef.current += (clampedTarget - smoothCentsRef.current) * factor;
      } else if (!isActive) {
        smoothCentsRef.current += (0 - smoothCentsRef.current) * 0.08;
      }

      const currentCents = smoothCentsRef.current;
      const isFineTuned = Math.abs(currentCents) < 4;
      const isClose = Math.abs(currentCents) < 12;

      pulsePhaseRef.current += isFineTuned && isActive && !isSilent ? 0.06 : 0.02;
      const pulseOffset = isFineTuned && isActive && !isSilent ? Math.sin(pulsePhaseRef.current) * 3 : 0;

      const accentColor = isFineTuned
        ? '#10b981' // Emerald green when in tune
        : isClose
        ? '#38bdf8' // Cyan-blue when close
        : '#3b82f6'; // Royal blue when further out

      // 1. Draw Subtle Cent Tick Marks around the top arc (-50¢ to +50¢)
      const tickCount = 21; // every 5 cents from -50 to +50
      for (let i = 0; i < tickCount; i++) {
        const tickCents = -50 + i * 5;
        const tickAngle = -Math.PI / 2 + (tickCents / 50) * (Math.PI * 0.65);
        const isCenterTick = tickCents === 0;
        const isMajorTick = tickCents % 25 === 0;

        const innerR = baseRadius - (isCenterTick ? 18 : isMajorTick ? 13 : 9);
        const outerR = baseRadius - 4;

        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(tickAngle) * innerR, centerY + Math.sin(tickAngle) * innerR);
        ctx.lineTo(centerX + Math.cos(tickAngle) * outerR, centerY + Math.sin(tickAngle) * outerR);
        ctx.strokeStyle = isCenterTick
          ? '#10b981'
          : isMajorTick
          ? '#475569'
          : '#1e293b';
        ctx.lineWidth = isCenterTick ? 3 : isMajorTick ? 2 : 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 2. Top Center Target Notch (0.0¢ reference marker)
      ctx.beginPath();
      ctx.arc(centerX, centerY - baseRadius, 4, 0, Math.PI * 2);
      ctx.fillStyle = isFineTuned && isActive ? '#10b981' : '#94a3b8';
      ctx.fill();

      if (variant === 'GENERAL' || variant === 'PIANO') {
        // Outer ambient phase ring (expands slightly when sharp, contracts when flat, pulses when locked)
        const phaseRadius =
          baseRadius +
          14 +
          (isActive && !isSilent ? (currentCents / 50) * 8 + pulseOffset : 0);

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, phaseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isActive
          ? isFineTuned
            ? 'rgba(16, 185, 129, 0.45)'
            : 'rgba(59, 130, 246, 0.30)'
          : '#1e293b';
        ctx.lineWidth = isFineTuned && isActive ? 3.5 : 2;
        ctx.stroke();

        if (variant === 'PIANO') {
          // Precision Phase-Arc for Piano
          const startAngle = -Math.PI / 2;
          // Ensure a visible arc even when 0.0 cents (locked in tune)
          const minArc = 0.08;
          const rawSweep = (currentCents / 50) * (Math.PI * 0.75);
          const sweep =
            Math.abs(rawSweep) < minArc
              ? rawSweep >= 0
                ? minArc
                : -minArc
              : rawSweep;

          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius, startAngle, startAngle + sweep, sweep < 0);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.stroke();
        } else {
          // Modern Illuminated Needle for General Mode
          const rotation = (currentCents / 50) * (Math.PI * 0.65);
          const needleLen = baseRadius - 12;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rotation);

          // Glow behind needle
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(0, -needleLen);
          ctx.strokeStyle = isFineTuned ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)';
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Sharp core needle
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(0, -needleLen);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.restore();
        }
      } else if (variant === 'GUITAR') {
        // Minimalist Ring + Glowing Tracking Orb & Arc for Guitar
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isFineTuned && isActive ? 'rgba(16, 185, 129, 0.35)' : '#1e293b';
        ctx.lineWidth = 3;
        ctx.stroke();

        const angle = -Math.PI / 2 + (currentCents / 50) * (Math.PI * 0.65);

        // Draw subtle trail arc from top center to orb
        if (isActive) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, baseRadius, -Math.PI / 2, angle, currentCents < 0);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Glowing Orb indicator
        const orbX = centerX + Math.cos(angle) * baseRadius;
        const orbY = centerY + Math.sin(angle) * baseRadius;

        ctx.beginPath();
        ctx.arc(orbX, orbY, isActive ? 9 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? accentColor : '#475569';
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [cents, isActive, isSilent, variant]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={380}
      className="max-w-full h-auto drop-shadow-[0_0_30px_rgba(59,130,246,0.18)]"
    />
  );
};
