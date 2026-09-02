import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { setPageMeta } from "@/lib/pageMeta";

const ApplySuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({
      title: "Application received - Summit Marketing",
      description: "Your application has been received. Summit will be in touch.",
      path: "/apply/success",
    });
  }, []);

  return (
    <div className="gold-world public-dots relative flex min-h-screen items-center justify-center bg-background px-5">
      <div className="relative z-10 mx-auto max-w-md text-center">
        <Wordmark variant="hero" height={100} className="mx-auto !h-auto w-full max-w-[280px]" />
        <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong">
          <Check className="h-5 w-5 text-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
          Application received
        </h1>
        <p className="mt-3 text-text-secondary">
          A manager reviews it and calls you. Keep an eye on your phone and your email.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/")}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong px-6 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
          >
            Back home
          </button>
          <a
            href="https://www.instagram.com/summitmktgsales/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApplySuccess;
