import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { setPageMeta } from "@/lib/pageMeta";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    setPageMeta({
      title: "Page not found - Trinity Sales",
      description: "That page does not exist.",
      path: location.pathname,
    });
    // Kept out of console.error so a missing page never reads as an app failure.
    console.warn("404: no route for", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">That page does not exist</p>
        <Link to="/" className="inline-flex min-h-11 items-center text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
