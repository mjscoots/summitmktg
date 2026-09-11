import { Link } from 'react-router-dom';

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
        <div className="reveal-cards mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {industries.map((industry) => (
            <Link key={industry.name} to={industry.to} className="public-door block min-h-44 rounded-xl bg-card p-6">
              <h3 className="text-2xl font-extrabold text-foreground"><span className="door-lane">{industry.name}</span></h3>
              <p className="mt-4 text-text-secondary">{industry.line}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
