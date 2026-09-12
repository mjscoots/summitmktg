import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface IndustryTileProps {
  name: string;
  line: string;
  to: string;
  depth: number;
}

function IndustryTile({ name, line, to, depth }: IndustryTileProps) {
  const tileRef = useRef<HTMLAnchorElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const frame = useRef(0);

  const animate = useCallback(() => {
    const node = tileRef.current;
    if (!node) return;
    current.current.x += (target.current.x - current.current.x) * 0.12;
    current.current.y += (target.current.y - current.current.y) * 0.12;
    node.style.setProperty('--tile-x', `${current.current.x.toFixed(2)}px`);
    node.style.setProperty('--tile-y', `${current.current.y.toFixed(2)}px`);
    const moving = Math.abs(target.current.x - current.current.x) > 0.02 || Math.abs(target.current.y - current.current.y) > 0.02;
    frame.current = moving ? requestAnimationFrame(animate) : 0;
  }, []);

  const move = (clientX: number, clientY: number) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = tileRef.current?.getBoundingClientRect();
    if (!rect) return;
    target.current = {
      x: ((clientX - rect.left) / rect.width - 0.5) * depth * 2,
      y: ((clientY - rect.top) / rect.height - 0.5) * depth * 2,
    };
    if (!frame.current) frame.current = requestAnimationFrame(animate);
  };

  const settle = () => {
    target.current = { x: 0, y: 0 };
    if (!frame.current) frame.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <Link
      ref={tileRef}
      to={to}
      className="public-door block min-h-44 rounded-xl bg-card p-6"
      onPointerMove={(event) => move(event.clientX, event.clientY)}
      onPointerLeave={settle}
    >
      <h3 className="text-2xl font-extrabold text-foreground"><span className="door-lane">{name}</span></h3>
      <p className="mt-4 text-text-secondary">{line}</p>
    </Link>
  );
}

export default function ThreeDoorSection() {
  const industries = [
    { name: 'Pest control', line: 'Homes and businesses', to: '/industries/pest' },
    { name: 'Fiber internet', line: 'Homes, in person', to: '/industries/fiber' },
    { name: 'Life insurance', line: 'Families, licensed', to: '/industries/life' },
  ];

  return (
    <section className="public-section px-5 py-16 text-center md:px-8 md:py-24" data-reveal>
      <div className="mx-auto max-w-5xl">
        <h2 className="section-title text-foreground"><span className="reveal-clip"><span>Three industries. One team.</span></span></h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-text-secondary">
          Pest control. Fiber internet. Life insurance. One team. Sell any of them, year round, and find the one that fits you.
        </p>
        <div className="reveal-cards mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {industries.map((industry, index) => (
            <IndustryTile key={industry.name} {...industry} depth={2 + index} />
          ))}
        </div>
      </div>
    </section>
  );
}
