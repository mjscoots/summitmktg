import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Target, Users, Calendar, FileText } from "lucide-react";
import ApplyFlow from "@/components/apply/ApplyFlow";
import { setPageMeta } from "@/lib/pageMeta";

const RookieApplication = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({
      title: "Apply as a Rookie - Trinity Sales",
      description:
        "Apply to sell with Trinity. Pest control, fiber internet or life insurance. First-time reps start here.",
      path: "/apply/rookie",
    });
  }, []);

  const whyDifferent = [
    { icon: Calendar, text: "Four-month sprint" },
    { icon: Target, text: "Clear training roadmap" },
    { icon: FileText, text: "Simple schedule, repeatable scripts" },
    { icon: Users, text: "Team culture + competition" },
    { icon: Zap, text: "You are paid on performance, not the clock." },
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
        <p className="px-5 pt-6 text-center text-sm text-text-secondary sm:px-0">
          Sold before?{" "}
          <Link to="/apply/veteran" className="font-semibold text-primary underline-offset-4 hover:underline">
            Apply here
          </Link>
        </p>

        <ApplyFlow kind="rookie" />

        <div className="px-6 sm:px-0">
          <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-foreground">
            What the job is
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {whyDifferent.map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-4">
                <item.icon className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RookieApplication;
