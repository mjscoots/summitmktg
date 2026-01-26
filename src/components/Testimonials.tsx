import { Quote } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
export interface Testimonial {
  id: string;
  name: string;
  market?: string;
  quote: string;
  image?: string;
}
interface TestimonialsProps {
  title: string;
  testimonials: Testimonial[];
  showVideo?: boolean;
  videoTitle?: string;
  videoSubtext?: string;
  videoUrl?: string;
}

// Placeholder testimonials - replace with real data later
export const rookieTestimonials: Testimonial[] = [{
  id: "1",
  name: "Alex M.",
  market: "Phoenix, AZ",
  quote: "Made more in four months than my entire year at my old job. The training system actually works."
}, {
  id: "2",
  name: "Jordan K.",
  market: "Dallas, TX",
  quote: "Zero sales experience before this. Hit $120k serviced my first summer."
}, {
  id: "3",
  name: "Taylor R.",
  market: "Salt Lake City, UT",
  quote: "The team culture and daily competition kept me locked in. Best summer decision I ever made."
}];
export const vetTestimonials: Testimonial[] = [{
  id: "1",
  name: "Marcus T.",
  market: "Multi-Market",
  quote: "Built a team of 12 my first year. The marketing deal structure actually rewards real leadership."
}, {
  id: "2",
  name: "Sarah L.",
  market: "Denver, CO",
  quote: "Came from SaaS sales. The D2D skills translated immediately, and the upside is unmatched."
}, {
  id: "3",
  name: "Chris B.",
  market: "Atlanta, GA",
  quote: "Third year running a team. The training system makes scaling repeatable."
}];
const Testimonials = ({
  title,
  testimonials,
  showVideo = false,
  videoTitle,
  videoUrl
}: TestimonialsProps) => {
  return <div className="py-12">
      
      
      {/* Video Section - Only shown when showVideo is true */}
      {showVideo && videoUrl && <div className="mb-10">
          <div className="card-elevated p-6 md:p-8">
            <h3 className="text-xl font-bold text-foreground mb-4 uppercase tracking-wide text-center">
              {videoTitle || "WATCH WHAT A SUMMER AT SUMMIT LOOKS LIKE"}
            </h3>
            <VideoPlayer src={videoUrl} title={videoTitle} />
          </div>
        </div>}
      
      {/* Testimonial Quotes */}
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map(testimonial => <div key={testimonial.id} className="card-elevated p-6">
            <Quote className="w-8 h-8 text-primary/30 mb-4" />
            <p className="text-foreground mb-4 leading-relaxed">
              "{testimonial.quote}"
            </p>
            <div className="flex items-center gap-3">
              {testimonial.image ? <img src={testimonial.image} alt={testimonial.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>}
              <div>
                <p className="font-medium text-foreground">{testimonial.name}</p>
                {testimonial.market && <p className="text-xs text-muted-foreground">{testimonial.market}</p>}
              </div>
            </div>
          </div>)}
      </div>
    </div>;
};
export default Testimonials;