import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, TrendingUp, Settings } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import ApplyFlow from "@/components/apply/ApplyFlow";
import { setPageMeta } from "@/lib/pageMeta";

const VetApplication = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({
      title: "Apply as a Veteran - Trinity Sales",
      description:
        "Apply to sell with Trinity as an experienced sales rep. Pest control, fiber internet or life insurance.",
      path: "/apply/veteran",
    });
  }, []);

  const summitUpside = [
    {
      icon: Target,
      title: "Training",
      description:
        "Direct training from a Golden Door record holder (56 days) and a hiring record holder (1,000 reps in one off-season).",
    },
    {
      icon: TrendingUp,
      title: "Uncapped team building",
      description: "You will never be capped on how many people you want to bring out.",
    },
    {
      icon: Settings,
      title: "Systems for Vets",
      description:
        "AI-generated neighborhoods, pre-cut and optimized for efficiency, plus full access to CRM and hiring software - all provided free to veterans on day one.",
    },
  ];

  return (
    <div className="gold-world min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="-ml-2 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-0 pb-16 sm:px-6">
        <ApplyFlow kind="vet" />

        <div className="mb-16 px-6 sm:px-0">
          <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-foreground">
            What you get here
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {summitUpside.map((item) => (
              <div key={item.title} className="flex flex-col gap-2 rounded-lg bg-secondary/50 p-4">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="font-medium text-foreground">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">From the founders</h2>
          </div>
          <div className="card-elevated p-6 md:p-8">
            <VideoPlayer src="https://youtu.be/TTQe2NKXHYQ" title="Hear From One Of Our Founders" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default VetApplication;
