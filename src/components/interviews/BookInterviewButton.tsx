import { useState, useEffect } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface BookInterviewButtonProps {
  nextInterview: 2 | 3;
}

export function BookInterviewButton({ nextInterview }: BookInterviewButtonProps) {
  const [bookingUrl, setBookingUrl] = useState<string>('https://calendly.com');

  useEffect(() => {
    const fetchBookingUrl = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'interview_booking_url')
        .single();
      
      if (data?.value) {
        setBookingUrl(data.value);
      }
    };

    fetchBookingUrl();
  }, []);

  return (
    <a
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
    >
      <Calendar className="w-5 h-5" />
      <span>Book Interview {nextInterview}</span>
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}
