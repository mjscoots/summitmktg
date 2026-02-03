import { CalendarPlus } from 'lucide-react';
import { downloadICSFile } from '@/lib/icsGenerator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AddToCalendarButtonProps {
  title: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  description?: string;
  organizer?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function AddToCalendarButton({
  title,
  startDate,
  endDate,
  location,
  description,
  organizer,
  variant = 'outline',
  size = 'sm',
  className
}: AddToCalendarButtonProps) {
  const handleClick = () => {
    try {
      downloadICSFile({
        title,
        startDate,
        endDate,
        location,
        description,
        organizer
      });
      toast.success('Calendar file downloaded');
    } catch (error) {
      console.error('Error generating ICS file:', error);
      toast.error('Failed to generate calendar file');
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleClick}
      className={className}
    >
      <CalendarPlus className="w-4 h-4 mr-1.5" />
      Add to Calendar
    </Button>
  );
}
