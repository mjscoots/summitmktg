import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AppRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Get role from localStorage (set during login)
    const role = localStorage.getItem("userRole");
    
    if (role === "vet") {
      navigate("/app/vet", { replace: true });
    } else if (role === "rookie") {
      navigate("/app/rookie", { replace: true });
    } else {
      // If no role, redirect to login
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
};

export default AppRedirect;
