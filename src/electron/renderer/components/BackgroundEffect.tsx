import React, { useCallback, useEffect, useRef } from 'react';

export default function BackgroundEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);
  const ripplesRef = useRef<{ x: number; y: number; radius: number; alpha: number }[]>([]);
  const rafRef = useRef(0);

  const handleMouse = useCallback((e: MouseEvent) => {
    targetRef.current.x = e.clientX / window.innerWidth;
    targetRef.current.y = e.clientY / window.innerHeight;
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    ripplesRef.current.push({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      radius: 0,
      alpha: 0.6,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouse, handleClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      [0, 242, 254],   // #00f2fe
      [79, 172, 254],  // #4facfe
      [67, 233, 123],  // #43e97b
    ];

    function draw() {
      if (!canvas || !ctx) return;
      timeRef.current += 0.008;

      // Smooth mouse interpolation (lerp)
      mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.05;

      const w = canvas.width;
      const h = canvas.height;

      // Base gradient — follows mouse
      const grad = ctx.createRadialGradient(
        w * mouseRef.current.x, h * mouseRef.current.y, 0,
        w * mouseRef.current.x, h * mouseRef.current.y, w * 0.8,
      );
      grad.addColorStop(0, `rgba(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}, 0.9)`);
      grad.addColorStop(0.4, `rgba(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}, 0.7)`);
      grad.addColorStop(0.7, `rgba(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}, 0.4)`);
      grad.addColorStop(1, `rgba(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}, 0.2)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle ambient glow orbiting
      const angle = timeRef.current;
      const orbitX = w * (0.5 + Math.cos(angle * 0.3) * 0.3);
      const orbitY = h * (0.5 + Math.sin(angle * 0.4) * 0.25);
      const ambient = ctx.createRadialGradient(orbitX, orbitY, 0, orbitX, orbitY, w * 0.4);
      ambient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      ambient.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
      ambient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, w, h);

      // Click ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += Math.max(2, w * 0.01);
        r.alpha *= 0.98;

        if (r.alpha < 0.01 || r.radius > w * 0.6) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(w * r.x, h * r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glow of ripple
        const inner = ctx.createRadialGradient(
          w * r.x, h * r.y, 0,
          w * r.x, h * r.y, r.radius,
        );
        inner.addColorStop(0, `rgba(255, 255, 255, ${r.alpha * 0.15})`);
        inner.addColorStop(0.5, `rgba(255, 255, 255, ${r.alpha * 0.05})`);
        inner.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = inner;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
