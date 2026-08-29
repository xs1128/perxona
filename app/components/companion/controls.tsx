'use client';

import { useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ChipVariant = 'default' | 'boundary' | 'anchor' | 'alert';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="solace-label">{label}</span>
      {children}
      {hint ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--sol-ink-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Single-choice row of pills. */
export function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className="solace-chip"
          title={option.hint}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A free-form list rendered as removable chips with an inline add field.
 * Used for boundaries, anchors, forbidden actions, and alert keywords.
 */
export function ChipListInput({
  values,
  onChange,
  placeholder,
  variant = 'default',
  suggestions = [],
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  variant?: ChipVariant;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft('');
  };

  const remove = (value: string) => {
    onChange(values.filter((entry) => entry !== value));
  };

  const unused = suggestions.filter((entry) => !values.includes(entry));

  return (
    <div className="space-y-2.5">
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="solace-chip"
              data-variant={variant === 'default' ? undefined : variant}
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove ${value}`}
                className="-mr-1 rounded-full p-0.5 opacity-55 transition hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
          className="solace-field flex-1"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label="Add"
          className="grid size-[42px] shrink-0 place-items-center rounded-[3px] border border-[var(--sol-rule)] bg-white text-[var(--sol-ink-soft)] transition hover:border-[var(--sol-rule-strong)] hover:text-[var(--sol-ink)]"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {unused.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => add(entry)}
              className="rounded-[3px] border border-dashed border-[var(--sol-rule-strong)] px-2.5 py-1 text-[11.5px] text-[var(--sol-ink-faint)] transition hover:border-[var(--sol-surgical)] hover:text-[var(--sol-surgical)]"
            >
              + {entry}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Numbered card used for each console section. */
export function SectionCard({
  step,
  title,
  caption,
  accent,
  children,
  className,
}: {
  step: string;
  title: string;
  caption: string;
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('solace-card p-6 sm:p-7', className)}>
      <header className="mb-6 flex items-start gap-3.5 border-b border-[var(--sol-rule)] pb-4">
        <span
          className="mt-[3px] grid size-[26px] shrink-0 place-items-center rounded-[3px] border font-mono text-[12px]"
          style={{ borderColor: accent, color: accent }}
        >
          {step}
        </span>
        <div>
          <h2 className="solace-display text-[23px] leading-none">{title}</h2>
          <p className="mt-1.5 text-[13px] leading-snug text-[var(--sol-ink-soft)]">
            {caption}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}
