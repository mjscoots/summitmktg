import { useState } from 'react';
import { Repeat, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface RecurrenceSettings {
  type: 'none' | 'daily' | 'every3days' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  monthlyType: 'date' | 'relative';
  relativeDay: string;
  endType: 'never' | 'date' | 'count';
  endDate: string;
  endCount: number;
}

interface RecurrenceSelectorProps {
  value: RecurrenceSettings;
  onChange: (settings: RecurrenceSettings) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export const DEFAULT_RECURRENCE: RecurrenceSettings = {
  type: 'none',
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: null,
  monthlyType: 'date',
  relativeDay: 'first-monday',
  endType: 'never',
  endDate: '',
  endCount: 10,
};

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const isEnabled = value.type !== 'none';

  const toggleRecurrence = () => {
    onChange({
      ...value,
      type: isEnabled ? 'none' : 'weekly',
    });
  };

  const toggleDayOfWeek = (day: number) => {
    const newDays = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter(d => d !== day)
      : [...value.daysOfWeek, day].sort();
    onChange({ ...value, daysOfWeek: newDays });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
          isEnabled 
            ? "border-primary bg-primary/10" 
            : "border-border hover:border-primary/50"
        )}
        onClick={toggleRecurrence}
      >
        <Repeat className={cn("w-4 h-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-sm font-medium", isEnabled ? "text-foreground" : "text-muted-foreground")}>
          Repeat
        </span>
        <div className={cn(
          "ml-auto w-10 h-5 rounded-full transition-colors relative",
          isEnabled ? "bg-primary" : "bg-muted"
        )}>
          <div className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            isEnabled ? "translate-x-5" : "translate-x-0.5"
          )} />
        </div>
      </div>

      {isEnabled && (
        <div className="space-y-4 pl-1">
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Repeat Pattern</label>
            <Select 
              value={value.type} 
              onValueChange={(type: RecurrenceSettings['type']) => onChange({ ...value, type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="every3days">Every 3 Days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Daily interval */}
          {(value.type === 'daily' || value.type === 'custom') && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Every</span>
              <Input
                type="number"
                min={1}
                max={365}
                value={value.interval}
                onChange={(e) => onChange({ ...value, interval: parseInt(e.target.value) || 1 })}
                className="w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">day(s)</span>
            </div>
          )}

          {/* Weekly days selection */}
          {(value.type === 'weekly' || value.type === 'custom') && (
            <div>
              <label className="block text-sm font-medium mb-2">On these days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xs font-medium transition-colors",
                      value.daysOfWeek.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {value.type === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={value.interval}
                    onChange={(e) => onChange({ ...value, interval: parseInt(e.target.value) || 1 })}
                    className="w-16 text-center"
                  />
                  <span className="text-sm text-muted-foreground">week(s)</span>
                </div>
              )}
            </div>
          )}

          {/* Monthly options */}
          {value.type === 'monthly' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={value.monthlyType === 'date'}
                    onChange={() => onChange({ ...value, monthlyType: 'date' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">On day</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={value.dayOfMonth || 1}
                  onChange={(e) => onChange({ ...value, dayOfMonth: parseInt(e.target.value) || 1 })}
                  className="w-16 text-center"
                  disabled={value.monthlyType !== 'date'}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={value.monthlyType === 'relative'}
                    onChange={() => onChange({ ...value, monthlyType: 'relative' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">On the</span>
                </label>
                <Select
                  value={value.relativeDay}
                  onValueChange={(val) => onChange({ ...value, relativeDay: val })}
                  disabled={value.monthlyType !== 'relative'}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first-monday">First Monday</SelectItem>
                    <SelectItem value="first-tuesday">First Tuesday</SelectItem>
                    <SelectItem value="first-wednesday">First Wednesday</SelectItem>
                    <SelectItem value="first-thursday">First Thursday</SelectItem>
                    <SelectItem value="first-friday">First Friday</SelectItem>
                    <SelectItem value="last-monday">Last Monday</SelectItem>
                    <SelectItem value="last-friday">Last Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* End Repeat Options */}
          <div className="pt-2 border-t border-border">
            <label className="block text-sm font-medium mb-2">End Repeat</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={value.endType === 'never'}
                  onChange={() => onChange({ ...value, endType: 'never' })}
                  className="accent-primary"
                />
                <span className="text-sm">Never</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={value.endType === 'date'}
                    onChange={() => onChange({ ...value, endType: 'date' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">On date</span>
                </label>
                <Input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                  className="w-40"
                  disabled={value.endType !== 'date'}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={value.endType === 'count'}
                    onChange={() => onChange({ ...value, endType: 'count' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">After</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={value.endCount}
                  onChange={(e) => onChange({ ...value, endCount: parseInt(e.target.value) || 1 })}
                  className="w-16 text-center"
                  disabled={value.endType !== 'count'}
                />
                <span className="text-sm text-muted-foreground">occurrences</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert recurrence settings to RRULE format
export function toRRule(settings: RecurrenceSettings): string | null {
  if (settings.type === 'none') return null;

  const parts: string[] = [];

  switch (settings.type) {
    case 'daily':
      parts.push(`FREQ=DAILY`);
      if (settings.interval > 1) parts.push(`INTERVAL=${settings.interval}`);
      break;
    case 'every3days':
      parts.push('FREQ=DAILY', 'INTERVAL=3');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      if (settings.daysOfWeek.length > 0) {
        const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        parts.push(`BYDAY=${settings.daysOfWeek.map(d => dayMap[d]).join(',')}`);
      }
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      if (settings.monthlyType === 'date' && settings.dayOfMonth) {
        parts.push(`BYMONTHDAY=${settings.dayOfMonth}`);
      }
      break;
    case 'custom':
      if (settings.daysOfWeek.length > 0) {
        parts.push('FREQ=WEEKLY');
        const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        parts.push(`BYDAY=${settings.daysOfWeek.map(d => dayMap[d]).join(',')}`);
        if (settings.interval > 1) parts.push(`INTERVAL=${settings.interval}`);
      } else {
        parts.push('FREQ=DAILY');
        if (settings.interval > 1) parts.push(`INTERVAL=${settings.interval}`);
      }
      break;
  }

  // End conditions
  if (settings.endType === 'date' && settings.endDate) {
    parts.push(`UNTIL=${settings.endDate.replace(/-/g, '')}T235959Z`);
  } else if (settings.endType === 'count') {
    parts.push(`COUNT=${settings.endCount}`);
  }

  return `RRULE:${parts.join(';')}`;
}
