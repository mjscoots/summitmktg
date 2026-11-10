import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/button';
import { isPublicRecruitingPath, pausePublicMetaPixel, trackPublicMeta } from '@/lib/publicMetaPixel';

export function PublicHeader() {
  const { pathname, key } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const visible = isPublicRecruitingPath(pathname);

  useEffect(() => {
    if (visible) void trackPublicMeta('PageView', `${pathname}:${key}`);
    else pausePublicMetaPixel();
  }, [pathname, key, visible]);

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
      <header className={`gold-world public-nav public-site-header fixed inset-x-0 top-0 z-30 ${pathname === '/' ? 'public-site-header-cover' : ''} ${scrolled ? 'public-nav-scrolled' : ''}`}>
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
      {pathname === '/' && scrolled && (
        <div className="gold-world public-mobile-apply fixed inset-x-0 bottom-0 z-30 px-5 pt-3 sm:hidden" data-mobile-apply>
          <Button asChild className="w-full">
            <Link to="/apply/rookie">Apply</Link>
          </Button>
        </div>
      )}
    </>
  );
}