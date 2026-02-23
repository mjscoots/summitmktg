import { useState } from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { downloadICSFile } from '@/lib/icsGenerator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface AddToCalendarButtonProps {
  title: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  description?: string;
  organizer?: string;
  rrule?: string | null;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGoogleCalendarUrl({
  title,
  startDate,
  endDate,
  location,
  description,
}: {
  title: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  description?: string;
}): string {
  const end = endDate || new Date(startDate.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(end)}`,
  });
  if (location) params.set('location', location);
  if (description) params.set('details', description);
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function AddToCalendarButton({
  title,
  startDate,
  endDate,
  location,
  description,
  organizer,
  rrule,
  variant = 'outline',
  size = 'sm',
  className
}: AddToCalendarButtonProps) {
  const handleICS = () => {
    try {
      downloadICSFile({ title, startDate, endDate, location, description, organizer, rrule });
      toast.success('Calendar file downloaded');
    } catch (error) {
      console.error('Error generating ICS file:', error);
      toast.error('Failed to generate calendar file');
    }
  };

  const handleGoogle = () => {
    const url = buildGoogleCalendarUrl({ title, startDate, endDate, location, description });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarPlus className="w-4 h-4 mr-1.5" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleGoogle} className="gap-2 cursor-pointer">
          <ExternalLink className="w-4 h-4" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleICS} className="gap-2 cursor-pointer">
          <Download className="w-4 h-4" />
          Download .ics (Apple / Outlook)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
