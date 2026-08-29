'use client';

import { ArrowRight } from 'lucide-react';

/**
 * Landing page, set as a printed page: masthead, rule, one promise, one way
 * forward, and the collage running along the baseline. The type block takes
 * whatever height the frieze leaves it, so nothing has to be positioned by
 * hand at any viewport.
 */
export function Hero({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="solace-frame solace-paper grid grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--sol-rule)] px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <SolaceMark />
          <span className="text-[16px] font-medium tracking-[-0.01em]">
            Med Companion
          </span>
        </div>
        <span className="solace-meta hidden sm:block">
          Clinician-guided companion
        </span>
      </header>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
        <h1
          className="solace-display solace-rise max-w-[14ch] text-[clamp(2.9rem,8.2vw,6.4rem)] leading-[0.92] tracking-[-0.015em]"
          style={{ textWrap: 'balance' }}
        >
          Your Emotional Companion
        </h1>

        <p
          className="solace-rise mt-6 max-w-[48ch] text-[15px] leading-[1.65] text-[var(--sol-ink-soft)]"
          style={{ animationDelay: '90ms' }}
        >
          Turns a written care plan into a Perxona avatar companion, with the
          boundaries and escalations a clinician sets.
        </p>

        <button
          type="button"
          onClick={onAdvance}
          className="solace-cta solace-rise mt-9 self-start"
          style={{ animationDelay: '180ms' }}
        >
          Set Your Companion
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="solace-collage h-[34svh] sm:h-[46svh] lg:h-[52svh]" />
    </div>
  );
}

/** A drawn cross rather than a logotype — one hairline, one accent. */
function SolaceMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[22px]"
      fill="none"
      stroke="var(--sol-surgical)"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10.4" opacity="0.4" />
      <path d="M12 6.4v11.2M6.4 12h11.2" strokeLinecap="round" />
    </svg>
  );
}
