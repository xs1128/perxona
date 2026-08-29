'use client';

import { ArrowRight } from 'lucide-react';

/** One gutter down the whole page: masthead, title, deck and action share it. */
const GUTTER = 'px-6 sm:px-10 lg:px-14';

/**
 * Landing page, set as a printed page: masthead, rule, one promise, one way
 * forward, and the collage running along the baseline.
 *
 * The type block sizes to its own content so its padding is never negotiable —
 * the frieze takes whatever is left. Sizing it the other way round (a fixed
 * frieze, the type on `1fr`) let the row over-subscribe on a laptop screen and
 * squeezed the title up against the masthead rule.
 */
export function Hero({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="solace-frame solace-paper solace-hero">
      <header
        className={`relative z-10 flex items-center justify-between gap-4 border-b border-[var(--sol-rule)] py-5 ${GUTTER}`}
      >
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

      <div
        className={`solace-hero-type relative z-10 flex flex-col pt-[clamp(2.75rem,6vh,4.5rem)] pb-[clamp(2.5rem,5.5vh,4rem)] ${GUTTER}`}
      >
        <h1
          className="solace-display solace-rise max-w-[14ch] text-[clamp(2.9rem,min(8.2vw,11.5vh),6.4rem)] leading-[0.94] tracking-[-0.01em]"
          style={{ textWrap: 'balance' }}
        >
          Your Emotional Companion
        </h1>

        <p
          className="solace-rise mt-8 max-w-[46ch] text-[15px] leading-[1.65] text-[var(--sol-ink-soft)]"
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

      <div className="solace-collage solace-collage--plate" />
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
