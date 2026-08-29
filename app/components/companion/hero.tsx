'use client';

import { ArrowRight } from 'lucide-react';

/** Landing page. One name, one promise, one way forward. */
export function Hero({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div className="solace-panel solace-scrollbar bg-[#e9eef0] p-3 sm:p-5">
      <div className="solace-ground relative isolate flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[26px] sm:min-h-[calc(100dvh-40px)] sm:rounded-[30px]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70 mix-blend-luminosity"
          style={{ backgroundImage: 'url(/hero.jpg)' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#07222b]/30" />

        <header className="relative flex items-center gap-2.5 px-6 py-6 text-white sm:px-10 sm:py-8">
          <SolaceMark />
          <span className="text-[21px] font-semibold tracking-[-0.02em]">
            Med Companion
          </span>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <h1 className="solace-rise max-w-4xl text-[clamp(2.6rem,7.5vw,5.5rem)] leading-[1.03] font-semibold tracking-[-0.035em] text-white">
            Your Emotional Companion
          </h1>

          <button
            type="button"
            onClick={onAdvance}
            className="group solace-rise mt-12 inline-flex items-center gap-3 rounded-full bg-white py-2 pr-2 pl-7 text-[15.5px] font-medium text-[#0a2730] transition hover:gap-4"
            style={{ animationDelay: '140ms' }}
          >
            Set Your Companion
            <span className="grid size-10 place-items-center rounded-full bg-[#2f6fe4] text-white transition group-hover:bg-[#1d5bd0]">
              <ArrowRight className="size-4.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SolaceMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <defs>
        <linearGradient id="solace-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8ce6f5" />
          <stop offset="100%" stopColor="#5b8df0" />
        </linearGradient>
      </defs>
      <path
        d="M16 3c5 3.4 7.6 7.1 7.6 11.2 0 4.6-3.4 8-7.6 8s-7.6-3.4-7.6-8C8.4 10.1 11 6.4 16 3Z"
        fill="url(#solace-mark)"
        opacity="0.92"
      />
      <path
        d="M16 29c-5-3.4-7.6-7.1-7.6-11.2"
        stroke="url(#solace-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
