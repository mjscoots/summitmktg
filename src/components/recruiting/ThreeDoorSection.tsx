import { Link } from 'react-router-dom';

export default function ThreeDoorSection() {
  return (
    <section className="public-reveal bg-surface px-5 py-16 md:px-8 md:py-24" data-reveal>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <Link to="/industries/pest" className="public-door public-door-pest block min-h-44 overflow-hidden bg-card p-5">
            <p className="micro-label text-primary">Live</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">Pest</h2>
            <p className="mt-4 text-text-secondary">The summer lane.</p>
          </Link>
          <Link to="/industries/fiber" className="public-door block min-h-44 bg-card p-5">
            <p className="micro-label text-muted-foreground">Off season lane</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">Fiber</h2>
          </Link>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Life insurance is coming</p>
      </div>
    </section>
  );
}
