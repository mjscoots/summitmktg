import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const ApplySuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md mx-auto text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-success" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Application Submitted
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate("/")} className="btn-secondary">
            Back to Home
          </button>
          <a 
            href="https://www.instagram.com/summitmktgsales/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Follow us on Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApplySuccess;
