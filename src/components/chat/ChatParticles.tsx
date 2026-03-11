import { useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
}

type ParticleType = 'normal' | 'flame' | 'lightning' | 'gold';

const PARTICLE_COLORS: Record<ParticleType, string[]> = {
  normal: ['hsl(220, 70%, 60%)', 'hsl(220, 60%, 50%)', 'hsl(230, 50%, 70%)'],
  flame: ['hsl(15, 95%, 55%)', 'hsl(30, 95%, 55%)', 'hsl(45, 95%, 60%)', 'hsl(0, 90%, 50%)'],
  lightning: ['hsl(200, 100%, 70%)', 'hsl(220, 100%, 80%)', 'hsl(180, 90%, 65%)', 'hsl(260, 80%, 75%)'],
  gold: ['hsl(45, 95%, 55%)', 'hsl(40, 90%, 50%)', 'hsl(50, 100%, 65%)', 'hsl(35, 85%, 45%)'],
};

export function useChatParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const burst = useCallback((x: number, y: number, type: ParticleType = 'normal') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas matches display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const colors = PARTICLE_COLORS[type];
    const count = 8 + Math.floor(Math.random() * 5); // 8-12 particles
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0,
        maxLife: 250 + Math.random() * 100,
        size: type === 'normal' ? 2 + Math.random() * 2 : 2.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.8 + Math.random() * 0.2,
      });
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, rect.width, rect.height);

      let alive = false;
      for (const p of particles) {
        p.life = elapsed;
        if (p.life >= p.maxLife) continue;
        alive = true;

        const progress = p.life / p.maxLife;
        p.x += p.vx * (1 - progress * 0.5);
        p.y += p.vy * (1 - progress * 0.5);
        p.vy += 0.02; // gravity

        const alpha = p.opacity * (1 - progress);
        const size = p.size * (1 - progress * 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();

        if (type === 'lightning') {
          // Small lightning bolt shape
          ctx.moveTo(p.x, p.y - size);
          ctx.lineTo(p.x + size * 0.5, p.y);
          ctx.lineTo(p.x - size * 0.3, p.y + size * 0.3);
          ctx.lineTo(p.x + size * 0.2, p.y + size);
          ctx.fill();
        } else {
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Glow effect
        if (type !== 'normal') {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    };

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return { canvasRef, burst };
}

export function ParticleCanvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
