'use client';

import { useEffect, useState } from 'react';

import type { BreathingPattern } from '@/lib/companion/breathing';

type Phase = {
  key: 'inhale' | 'hold' | 'exhale';
  label: string;
  seconds: number;
};

/**
 * The paced-breath counter the avatar talks over.
 *
 * The companion says "I'll count with you" and then has no way to keep
 * counting — one `present()` call is one performance, and sequencing further
 * calls would drift against a ring animating in the browser. So the voice
 * gives the instruction and this gives the count, which is also the honest
 * division of labour: a number a panicking teenager can follow without
 * listening hard.
 *
 * The three durations are the clinician's, parsed out of the prescribed
 * exercise, so this renders whatever was prescribed rather than 4-7-8.
 */
export function BreathingGuide({ pattern }: { pattern: BreathingPattern }) {
  const phases: Phase[] = [
    { key: 'inhale', label: 'Breathe in', seconds: pattern.inhale },
    { key: 'hold', label: 'Hold', seconds: pattern.hold },
    { key: 'exhale', label: 'Breathe out', seconds: pattern.exhale },
  ].filter((phase): phase is Phase => phase.seconds > 0);

  const cycle = phases.reduce((total, phase) => total + phase.seconds, 0);

  const [second, setSecond] = useState(0);
  /*
   * The first breath has to be a growth, not a jump. Rendering once at rest
   * and expanding on the next frame gives the transition somewhere to move
   * from; without it the ring is already full when the count starts.
   */
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    const timer = setInterval(() => setSecond((tick) => tick + 1), 1000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  if (cycle === 0) return null;

  // Where this second falls in the cycle, and how far into its phase it is.
  const position = second % cycle;
  let offset = 0;
  let active = phases[0];
  for (const phase of phases) {
    if (position < offset + phase.seconds) {
      active = phase;
      break;
    }
    offset += phase.seconds;
  }

  const count = position - offset + 1;
  const expanded = started && active.key !== 'exhale';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 py-6 transition-opacity duration-700 ${
        started ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative grid size-56 place-items-center">
        {/* The ring paces the breath; the number keeps the count honest. */}
        <div
          className="absolute inset-0 rounded-full border border-[#5fcdc0]/35 bg-[#5fcdc0]/10 transition-transform ease-in-out motion-reduce:transition-none"
          style={{
            transform: `scale(${expanded ? 1 : 0.55})`,
            transitionDuration: `${active.seconds}s`,
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-6 rounded-full bg-[#5fcdc0]/12 blur-xl transition-transform ease-in-out motion-reduce:transition-none"
          style={{
            transform: `scale(${expanded ? 1 : 0.6})`,
            transitionDuration: `${active.seconds}s`,
          }}
          aria-hidden="true"
        />

        <span
          className="relative font-mono text-7xl font-light tabular-nums text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      </div>

      <div className="text-center">
        <output className="block text-[17px] font-medium text-white">
          {active.label}
        </output>
        <p className="mt-1 font-mono text-[12px] text-white/40">
          {pattern.inhale}-{pattern.hold}-{pattern.exhale} · prescribed
        </p>
      </div>
    </div>
  );
}
