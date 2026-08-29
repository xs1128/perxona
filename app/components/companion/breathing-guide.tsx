'use client';

import { useEffect, useRef, useState } from 'react';

/** One round, sized for a stage rather than a full clinical cycle. */
const DEFAULT_SECONDS = 8;

/**
 * The paced-breath counter the avatar hands off to.
 *
 * The companion says "I'll count with you" and then has no way to keep
 * counting — one `present()` call is one performance, and sequencing further
 * calls would drift against a ring animating in the browser. So the voice
 * gives the instruction and this gives the count, which is also the honest
 * division of labour: a number a panicking teenager can follow without
 * listening hard.
 *
 * It runs once and dismisses itself. A guide that looped would still be
 * counting when the next line is spoken, and the patient would learn to
 * ignore it.
 */
export function BreathingGuide({
  seconds = DEFAULT_SECONDS,
  onComplete,
}: {
  seconds?: number;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(1);
  /*
   * The first breath has to be a growth, not a jump. Rendering once at rest
   * and expanding on the next frame gives the transition somewhere to move
   * from; without it the ring is already full when the count starts.
   */
  const [started, setStarted] = useState(false);

  /* Kept in a ref so a new callback identity cannot restart the count. */
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    const timer = setInterval(
      () => setCount((current) => Math.min(current + 1, seconds)),
      1000,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [seconds]);

  /* The last number gets its own second before the guide clears. */
  useEffect(() => {
    if (count < seconds) return;
    const timer = setTimeout(() => completeRef.current(), 1000);
    return () => clearTimeout(timer);
  }, [count, seconds]);

  /*
   * Half in, half out. Alternating the two every second would put a whole
   * breath in a second, which is the pace of a panic attack rather than the
   * way out of one — the wrong thing to model for a patient who is already
   * breathing too fast.
   */
  const half = Math.ceil(seconds / 2);
  const inhaling = count <= half;
  const phaseSeconds = inhaling ? half : seconds - half;

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
            transform: `scale(${started && inhaling ? 1 : 0.55})`,
            transitionDuration: `${phaseSeconds}s`,
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-6 rounded-full bg-[#5fcdc0]/12 blur-xl transition-transform ease-in-out motion-reduce:transition-none"
          style={{
            transform: `scale(${started && inhaling ? 1 : 0.6})`,
            transitionDuration: `${phaseSeconds}s`,
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
          {inhaling ? 'Breathe in' : 'Breathe out'}
        </output>
        <p className="mt-1 font-mono text-[12px] text-white/40">
          paced breath · prescribed
        </p>
      </div>
    </div>
  );
}
