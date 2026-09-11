import { Link } from 'react-router-dom';

/**
 * Pass 183: a plain centred stack with the shared card reveal. The doors take a
 * small scale where there is a pointer, press to 0.98 on touch, and draw a
 * gradient underline under the lane name on enter. Nothing here reads the scroll.
 */
export default function ThreeDoorSection() {
  return (
    <section className="public-section px-5 py-16 text-center md:px-8 md:py-24" data-reveal>
      <div className="mx-auto max-w-4xl">
        <div className="reveal-cards grid gap-6 md:grid-cols-2 md:gap-8">
          <Link to="/industries/pest" className="public-door block min-h-44 overflow-hidden rounded-xl bg-card p-6">
            <p className="cover-label text-foreground">Live</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
              <span className="door-lane">Pest</span>
            </h2>
            <p className="mt-4 text-text-secondary">The summer lane.</p>
          </Link>
          <Link to="/industries/fiber" className="public-door block min-h-44 rounded-xl bg-card p-6">
            <p className="cover-label text-muted-foreground">Off season lane</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
              <span className="door-lane">Fiber</span>
            </h2>
          </Link>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Life insurance is coming</p>
      </div>
    </section>
  );
}
