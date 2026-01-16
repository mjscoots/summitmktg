import { Mountain } from "lucide-react";

interface MountainAccentProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const MountainAccent = ({ className = "", size = "sm" }: MountainAccentProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Mountain className={`text-primary/20 ${sizeClasses[size]} ${className}`} />
  );
};

export default MountainAccent;
