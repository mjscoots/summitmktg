import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PROMPT_SETS = [
  ['Share a win today 🏆', 'Drop a closing tip 🧠', 'What fired you up? 🔥'],
  ['Post your best pitch move 🎯', 'Help someone out 💪', 'Celebrate a teammate 👑'],
  ['Ask a closing question ❓', 'Share what worked today 📈', 'Motivate the team ⚡'],
  ['What did you learn? 🧠', 'Share a door story 🚪', 'Big day energy 💰'],
  ['Drop some knowledge 📚', 'What objection did you crush? 💎', 'Morning energy check ☀️'],
];

interface SmartPromptsProps {
  onSelect: (prompt: string) => void;
  visible: boolean;
}

export function SmartPrompts({ onSelect, visible }: SmartPromptsProps) {
  const [prompts, setPrompts] = useState<string[]>([]);

  useEffect(() => {
    // Rotate prompts based on hour of day
    const hourIndex = Math.floor(Date.now() / 3600000) % PROMPT_SETS.length;
    setPrompts(PROMPT_SETS[hourIndex]);
  }, []);

  if (!visible || prompts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt.replace(/\s[^\s]+$/, ''))} // Remove trailing emoji
          className={cn(
            "rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground/60",
            "hover:text-foreground/70 hover:border-primary/30 hover:bg-primary/5 transition-all whitespace-nowrap",
            "active:scale-95"
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
