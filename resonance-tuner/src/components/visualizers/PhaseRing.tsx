import React, { useEffect, useRef } from 'react';

interface PhaseRingProps {
  cents: number;
  isActive: boolean;
  variant?: 'GENERAL' | 'GUITAR' | 'PIANO';
}

export const PhaseRing: React.FC<PhaseRingProps> = ({ cents, isActive, variant = 'GENERAL' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothCentsRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;

      if (isActive) {
        smoothCentsRef.current += (cents - smoothCentsRef.current) * 0.1;
      } else {
        smoothCentsRef.current += (0 - smoothCentsRef.current) * 0.05;
      }

      const isFineTuned = Math.abs(smoothCentsRef.current) < 4;
      const accentColor = isFineTuned ? '#10b981' : '#3b82f6';

      if (variant === 'GENERAL' || variant === 'PIANO') {
        // Draw double glow rings
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? `${accentColor}44` : '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (variant === 'PIANO') {
            // Draw progress-style arc for Piano
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (smoothCentsRef.current / 50) * Math.PI;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle, smoothCentsRef.current < 0);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Modern Needle for General
            rotation = (smoothCentsRef.current / 50) * (Math.PI * 0.4);
            const needleLen = radius - 10;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            
            // Glow behind needle
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -needleLen);
            ctx.strokeStyle = `${accentColor}88`;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -needleLen);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            ctx.restore();
        }
      } else if (variant === 'GUITAR') {
        // Minimal Ring for Guitar
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isActive) {
            const angle = (smoothCentsRef.current / 50) * Math.PI;
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(angle - Math.PI/2) * radius, centerY + Math.sin(angle - Math.PI/2) * radius, 6, 0, Math.PI * 2);
            ctx.fillStyle = accentColor;
            ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [cents, isActive, variant]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="max-w-full h-auto drop-shadow-[0_0_30px_rgba(59,130,246,0.15)]"
    />
  );
};
