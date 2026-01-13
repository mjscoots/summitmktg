import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  role?: "rookie" | "vet";
}

const Header = ({ role }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    // Clear any stored role/session
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const navItems = role === "vet" 
    ? [
        { label: "Dashboard", path: "/app/vet" },
        { label: "Training", path: "/app/training" },
        { label: "My Progress", path: "/app/progress" },
        { label: "Rep Progress", path: "/app/reps" },
        { label: "Announcements", path: "/app/announcements" },
      ]
    : [
        { label: "Dashboard", path: "/app/rookie" },
        { label: "Training", path: "/app/training" },
        { label: "My Progress", path: "/app/progress" },
        { label: "Announcements", path: "/app/announcements" },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 
              className="text-lg font-black tracking-tight cursor-pointer"
              onClick={() => navigate(role === "vet" ? "/app/vet" : "/app/rookie")}
            >
              SUMMIT <span className="text-primary">MKTG</span>
            </h1>
            {role && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded uppercase">
                {role === "vet" ? "Vet / Manager" : "Rookie"}
              </span>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden pt-4 pb-2 border-t border-border mt-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-2 py-2 text-sm font-medium rounded transition-colors ${
                  isActive(item.path)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full text-left px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
