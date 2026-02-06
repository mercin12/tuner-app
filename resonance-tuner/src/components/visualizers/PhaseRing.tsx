import React, { useEffect, useRef } from 'react';

interface PhaseRingProps {
  cents: number;
  isActive: boolean;
}

export const PhaseRing: React.FC<PhaseRingProps> = ({ cents, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Draw outer static ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isActive) {
        // Rotation speed based on cents deviation
        // If cents is 0, rotation should be very slow or stop
        const speed = cents * 0.05;
        rotation += speed;

        // Draw pulsing phase markers
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12 + rotation;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = Math.abs(cents) < 1 ? '#10b981' : '#3b82f6';
          ctx.fill();
        }

        // Pulse indicator
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 + Math.random() * 0.1})`;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [cents, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="max-w-full h-auto drop-shadow-2xl"
    />
  );
};
