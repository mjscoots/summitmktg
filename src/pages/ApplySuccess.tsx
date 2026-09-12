import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { setPageMeta } from "@/lib/pageMeta";
import { loadSchedulingUrl } from "@/lib/scheduling";

const ApplySuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantsCall = params.get("call") === "1";
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({
      title: "Application received - Trinity Sales",
      description: "Your application has been received. Trinity will be in touch.",
      path: "/apply/success",
    });
  }, []);

  useEffect(() => {
    if (wantsCall) loadSchedulingUrl().then(setSchedulingUrl);
  }, [wantsCall]);

  return (
    <div className="gold-world relative flex min-h-screen items-center justify-center bg-background px-5">
      <div className="relative z-10 mx-auto max-w-md text-center">
        <Wordmark variant="hero" height={100} className="mx-auto !h-auto w-full max-w-[280px]" />
        <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong">
          <Check className="h-5 w-5 text-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
          Application received
        </h1>
        <p className="mt-3 text-text-secondary">
          Someone from the team will reach out and see if you are a good fit.
        </p>
        {wantsCall && schedulingUrl && (
          <a
            href={schedulingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6D3BFF] px-6 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Open the scheduling page
          </a>
        )}
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
