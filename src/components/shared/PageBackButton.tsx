import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageBackButtonProps {
  /** Label to show next to the arrow. Defaults to "Back" */
  label?: string;
  /** Override the default browser back behavior with a specific path */
  to?: string;
  className?: string;
}

export function PageBackButton({ label = 'Back', to, className }: PageBackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-4 ${className || ''}`}
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Button>
  );
}
