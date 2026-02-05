import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ 
  value, 
  suffix = '', 
  duration = 500,
  className 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    if (value !== prevValue) {
      setIsAnimating(true);
      
      // Count-up animation
      const startTime = Date.now();
      const difference = value - prevValue;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const current = prevValue + (difference * easedProgress);
        
        setDisplayValue(Math.round(current));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => setIsAnimating(false), 100);
        }
      };
      
      requestAnimationFrame(animate);
      prevValueRef.current = value;
    }
  }, [value, duration]);

  return (
    <span 
      className={cn(
        "transition-all duration-200",
        isAnimating && "animate-pulse-update text-primary scale-110",
        className
      )}
    >
      {displayValue}{suffix}
    </span>
  );
}
