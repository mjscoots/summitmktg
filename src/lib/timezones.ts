export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)', short: 'ET' },
  { value: 'America/Chicago', label: 'Central (CT)', short: 'CT' },
  { value: 'America/Denver', label: 'Mountain (MT)', short: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)', short: 'PT' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)', short: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)', short: 'HT' },
  { value: 'America/Phoenix', label: 'Arizona (MST)', short: 'MST' },
] as const;

export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(date: Date | string, timezone: string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  try {
    // Use Intl.DateTimeFormat for timezone conversion
    const options: Intl.DateTimeFormatOptions = { timeZone: timezone };
    
    // Build format based on formatStr patterns
    if (formatStr === 'h:mm a') {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }
    
    if (formatStr === 'h:mm a z') {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
      options.timeZoneName = 'short';
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }

    if (formatStr === 'EEEE, MMM d') {
      options.weekday = 'long';
      options.month = 'short';
      options.day = 'numeric';
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }

    if (formatStr === 'MMM d') {
      options.month = 'short';
      options.day = 'numeric';
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }

    if (formatStr === 'MMM d, yyyy') {
      options.month = 'short';
      options.day = 'numeric';
      options.year = 'numeric';
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }

    if (formatStr === 'EEEE, MMM d, yyyy') {
      options.weekday = 'long';
      options.month = 'short';
      options.day = 'numeric';
      options.year = 'numeric';
      return new Intl.DateTimeFormat('en-US', options).format(d);
    }

    // Fallback: just return locale string in timezone
    return d.toLocaleString('en-US', { timeZone: timezone });
  } catch {
    // If timezone is invalid, fall back to local
    return d.toLocaleString('en-US');
  }
}

/**
 * Get the short timezone label for display
 */
export function getTimezoneShort(timezone: string): string {
  const tz = TIMEZONES.find(t => t.value === timezone);
  if (tz) return tz.short;
  // For any IANA timezone not in our list, derive short name dynamically
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Detect user's browser timezone automatically
 */
export function detectBrowserTimezone(): string {
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return browserTz || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
