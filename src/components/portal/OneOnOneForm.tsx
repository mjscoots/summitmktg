import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Printer, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  type Answers, type FormField, type OneOnOneKind,
  FORM_CONFIG, ONE_ON_ONE_NOTICE, ONE_ON_ONE_BOOKING, STORAGE_KEYS,
  formDefaults, notesSummary, restoreAnswers, sameNightText,
} from '@/data/portal/oneOnOnes';
import './OneOnOneForm.css';

function Field({ field, value, onChange, prefix }: {
  field: FormField; value: string; onChange: (value: string) => void; prefix: string;
}) {
  const id = `${prefix}-${field.key}`;
  const controlClass = 'min-h-11 min-w-0 w-full max-w-full';
  return (
    <div className="min-w-0 space-y-2">
      <Label id={`${id}-label`} htmlFor={id} className="block text-sm leading-relaxed">{field.label}</Label>
      {field.type === 'textarea' ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${controlClass} min-h-24`} />
      ) : field.type === 'radio' ? (
        <RadioGroup id={id} aria-labelledby={`${id}-label`} value={value} onValueChange={onChange} className="flex flex-wrap gap-x-4 gap-y-1">
          {field.options?.map((option, index) => (
            <Label key={option} htmlFor={`${id}-${index}`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal">
              <RadioGroupItem id={`${id}-${index}`} value={option} />{option}
            </Label>
          ))}
        </RadioGroup>
      ) : field.type === 'select' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} aria-labelledby={`${id}-label`} className={controlClass}><SelectValue /></SelectTrigger>
          <SelectContent>{field.options?.map((option) => <SelectItem key={option} value={option} className="min-h-11">{option}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input id={id} type={field.type || 'text'} value={value} min={field.min} max={field.max}
          onChange={(e) => onChange(e.target.value)} className={controlClass} />
      )}
    </div>
  );
}

export default function OneOnOneForm({ kind, fullName }: { kind: OneOnOneKind; fullName: string }) {
  const config = FORM_CONFIG[kind];
  const storageKey = STORAGE_KEYS[kind];
  const [initial] = useState(() => {
    const defaults = formDefaults(kind, fullName);
    try {
      const raw = window.localStorage.getItem(storageKey);
      return { answers: restoreAnswers(kind, raw, defaults), saved: Boolean(raw), unavailable: false };
    } catch {
      return { answers: defaults, saved: false, unavailable: true };
    }
  });
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [saved, setSaved] = useState(initial.saved);
  const [storageUnavailable, setStorageUnavailable] = useState(initial.unavailable);
  const [feedback, setFeedback] = useState('');

  const update = (key: string, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setFeedback('');
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(true);
      setStorageUnavailable(false);
    } catch {
      setSaved(false);
      setStorageUnavailable(true);
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Copied');
    } catch {
      setFeedback('Copy was not available. Use Print / save PDF to keep these notes.');
    }
  };
  const clear = () => {
    if (!window.confirm('Clear this form and its saved copy on this device?')) return;
    try {
      window.localStorage.removeItem(storageKey);
      setAnswers(formDefaults(kind, fullName));
      setSaved(false);
      setStorageUnavailable(false);
      setFeedback('Form cleared');
    } catch {
      setFeedback('The saved copy could not be cleared on this device.');
    }
  };
  const summary = notesSummary(kind, answers);

  return (
    <article className="portal-one-on-one min-w-0">
      <div className="one-on-one-screen space-y-6">
        <Link to="/portal/one-on-ones" className="inline-flex min-h-11 items-center text-sm text-primary">← Weekly 1:1s</Link>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{config.title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{config.subtitle}</p>
        </div>
        <p className="rounded-md border border-border bg-muted p-4 text-sm leading-relaxed">{ONE_ON_ONE_NOTICE}</p>
        <p role="status" className="text-sm text-muted-foreground">
          {storageUnavailable ? 'This device could not save your changes. Copy or print your notes before closing.' : saved ? 'Saved on this device' : 'Not saved on this device yet'}
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {config.sections.map((section, index) => (
            <fieldset key={index} className="min-w-0 space-y-4 border-t border-border pt-6">
              {section.title && <legend className="max-w-full pr-2 text-base font-semibold leading-relaxed">{section.title}</legend>}
              {kind === 'rep' && section.title === 'Same-night text' && (
                <div className="space-y-3">
                  <Label htmlFor="rep-same-night-preview">Same-night text</Label>
                  <Textarea id="rep-same-night-preview" readOnly value={sameNightText(answers)} className="min-h-24 w-full" />
                  <Button type="button" variant="secondary" className="min-h-11" onClick={() => void copy(sameNightText(answers))}><Copy />Copy text</Button>
                </div>
              )}
              <div className={section.layout === 'counts' ? 'grid min-w-0 grid-cols-2 gap-4' : section.layout === 'pairs' ? 'grid min-w-0 gap-4 sm:grid-cols-2' : 'space-y-4'}>
                {section.fields.map((field) => <Field key={field.key} field={field} value={answers[field.key] || ''} onChange={(value) => update(field.key, value)} prefix={kind} />)}
              </div>
              {section.helper && <p className="text-sm leading-relaxed text-muted-foreground">{section.helper}</p>}
              {section.title === 'Next 1:1' && (
                <Button asChild variant="link" className="min-h-11 h-auto whitespace-normal px-0 text-left">
                  <a href={ONE_ON_ONE_BOOKING} target="_blank" rel="noopener"><ExternalLink />Book next 1:1</a>
                </Button>
              )}
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button type="button" className="min-h-11" onClick={() => void copy(summary)}><Copy />Copy notes</Button>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => window.print()}><Printer />Print / save PDF</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={clear}><Trash2 />Clear form</Button>
          </div>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{feedback}</p>
        </form>
      </div>
      <div className="one-on-one-print hidden">{summary}</div>
    </article>
  );
}