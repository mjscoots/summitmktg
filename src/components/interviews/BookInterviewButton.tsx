import { Calendar, ExternalLink } from 'lucide-react';

interface BookInterviewButtonProps {
  nextInterview: 2 | 3;
}

// Static URLs for interview booking
const INTERVIEW_URLS = {
  2: 'https://docs.google.com/document/d/1i8Ubyf4zZCHC6087YG-lvCf0W9tD53_Cb4UCRCo9dCw/edit?usp=sharing',
  3: 'https://calendly.com/mathewjoyce',
} as const;

export function BookInterviewButton({ nextInterview }: BookInterviewButtonProps) {
  const bookingUrl = INTERVIEW_URLS[nextInterview];

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
