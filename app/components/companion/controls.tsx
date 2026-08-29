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
        <p className="mt-1.5 text-[11.5px] leading-snug text-white/38">
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

/** Multi-choice row backed by a string array. */
export function MultiChoiceRow({
  options,
  values,
  onChange,
  format = (value: string) => value.replace(/_/g, ' '),
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  format?: (value: string) => string;
}) {
  const toggle = (option: string) => {
    onChange(
      values.includes(option)
        ? values.filter((entry) => entry !== option)
        : [...values, option],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-selected={values.includes(option)}
          onClick={() => toggle(option)}
          className="solace-chip capitalize"
        >
          {format(option)}
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
          className="grid size-[42px] shrink-0 place-items-center rounded-xl border border-white/14 bg-white/6 text-white/70 transition hover:border-white/30 hover:text-white"
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
              className="rounded-full border border-dashed border-white/16 px-2.5 py-1 text-[11.5px] text-white/45 transition hover:border-white/35 hover:text-white/80"
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
    <section className={cn('solace-glass p-6 sm:p-7', className)}>
      <header className="mb-6 flex items-start gap-3.5">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl text-[13px] font-semibold text-[#07222b]"
          style={{ background: accent }}
        >
          {step}
        </span>
        <div>
          <h2 className="text-[19px] leading-tight font-semibold tracking-[-0.01em] text-white">
            {title}
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-white/50">
            {caption}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/4 px-3.5 py-3 text-left transition hover:border-white/22"
    >
      <span>
        <span className="block text-[13.5px] font-medium text-white/85">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[11.5px] text-white/42">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
          checked ? 'bg-[#5cc9de]' : 'bg-white/16',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-4 rounded-full bg-white transition-all',
            checked ? 'left-[19px]' : 'left-[3px]',
          )}
        />
      </span>
    </button>
  );
}
