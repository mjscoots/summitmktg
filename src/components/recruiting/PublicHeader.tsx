import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';

const PUBLIC_PATHS = [
  '/',
  '/recruiting',
  '/ticket',
  '/parents',
  '/industries/',
  '/join',
  '/invite/',
  '/p/',
  '/apply',
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => path === '/' ? pathname === path : pathname === path || pathname.startsWith(path));
}

export function PublicHeader() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const visible = isPublicPath(pathname);

  useEffect(() => {
    if (!visible) return;
    const root = document.getElementById('root');
    const target: HTMLElement | Window = root || window;
    const read = () => setScrolled(root ? root.scrollTop > 40 : window.scrollY > 40);
    read();
    target.addEventListener('scroll', read, { passive: true });
    return () => target.removeEventListener('scroll', read);
  }, [pathname, visible]);

  if (!visible) return null;

  return (
    <>
      <header className={`gold-world public-nav public-site-header fixed inset-x-0 top-0 z-30 ${scrolled ? 'public-nav-scrolled' : ''}`}>
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link to="/" aria-label="Trinity home" className="flex min-h-11 items-center">
            <Wordmark variant="compact" height={28} className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/login"
              data-header-signin
              className="public-link inline-flex min-h-11 items-center px-2 text-sm font-semibold sm:px-3"
            >
              Sign in
            </Link>
            <Button asChild size="sm" className="min-h-10 px-4">
              <Link to="/apply/rookie" data-header-apply>Apply</Link>
            </Button>
          </div>
        </nav>
      </header>
      {pathname !== '/' && <div className="h-14" aria-hidden="true" />}
    </>
  );
}