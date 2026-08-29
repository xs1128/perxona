'use client';

import { useEffect, useRef } from 'react';
import { Mic, PhoneOff, ShieldAlert, Square } from 'lucide-react';

import { AvatarPortrait } from './avatar-portrait';
import type { CompanionSession } from '@/lib/companion/use-companion-session';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';

/** Taps offered to a patient who will not or cannot speak. */
const QUICK_REPLIES = [
  { emoji: '😔', label: "I can't sleep", text: "I can't sleep." },
  {
    emoji: '😰',
    label: 'My heart is racing',
    text: 'My heart is racing and I feel panic.',
  },
  { emoji: '💭', label: 'I miss them', text: 'I really miss them tonight.' },
  { emoji: '🙂', label: "I'm okay", text: "I'm okay right now." },
];

export function Session({
  session,
  onExit,
}: {
  session: CompanionSession;
  onExit: () => void;
}) {
  // Destructured in one place: reading `session.x` during render alongside
  // `session.ref` makes the compiler treat the whole object as a ref.
  const {
    ref,
    live,
    state,
    preset,
    companion,
    thinking,
    lastSaid,
    setListening,
    dismissAlert,
    alert: alertState,
  } = session;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mic = useSpeechRecognition({
    onResult: (transcript) => void session.send(transcript),
  });

  // Both companions look up while the microphone is open.
  useEffect(() => {
    setListening(mic.listening);
  }, [setListening, mic.listening]);

  /* The exit is deliberately awkward so a child cannot reach the console. */
  const beginHold = () => {
    holdTimer.current = setTimeout(() => {
      session.end();
      onExit();
    }, 2500);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const status = thinking
    ? 'Thinking…'
    : mic.listening
      ? 'Listening…'
      : state.phase === 'connecting'
        ? state.progress
          ? `Loading ${state.progress.asset} ${state.progress.percentage}%`
          : 'Connecting…'
        : live
          ? state.performanceState
          : 'Rehearsal mode';

  return (
    <div className="solace-panel solace-ground relative overflow-hidden">
      {/* The Perxona stage. Always mounted so `begin()` has a live element. */}
      <div className={`absolute inset-0 ${live ? 'block' : 'hidden'}`}>
        {/* @ts-expect-error sv-presenter is provided by the Perxona runtime. */}
        <sv-presenter ref={ref} className="block h-full w-full" />
      </div>

      {/* Stand-in stage when no catalog IDs are configured. */}
      {!live && preset ? (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="grid place-items-center rounded-full p-10"
            style={{
              background: `radial-gradient(circle, ${preset.gradient[0]}22, transparent 70%)`,
            }}
          >
            <AvatarPortrait
              gradient={preset.gradient}
              className={`size-44 ring-1 ring-white/15 ${
                state.speaking || thinking ? '' : 'solace-breathe'
              }`}
            />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/78 to-transparent" />

      <div className="relative flex h-[100dvh] flex-col">
        <header className="flex items-start justify-between p-5 sm:p-7">
          <div className="flex items-center gap-3">
            {preset ? (
              <AvatarPortrait gradient={preset.gradient} className="size-10" />
            ) : null}
            <div>
              <p className="text-[15px] font-semibold text-white">
                {companion?.calledName || 'Companion'}
              </p>
              <p className="text-[12px] text-white/50" aria-live="polite">
                {status}
              </p>
            </div>
          </div>

          <button
            type="button"
            onPointerDown={beginHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            title="Hold for 2.5 seconds to end the session"
            className="grid size-10 place-items-center rounded-full border border-white/12 text-white/35 transition hover:border-white/30 hover:text-white/70"
          >
            <PhoneOff className="size-4" />
          </button>
        </header>

        {alertState ? (
          <div
            className={`mx-5 flex items-start gap-3 rounded-2xl border px-4 py-3 sm:mx-7 ${
              alertState.level === 'emergency'
                ? 'border-[#f2836b]/50 bg-[#f2836b]/16'
                : 'border-[#f5c563]/40 bg-[#f5c563]/12'
            }`}
          >
            <ShieldAlert
              className={`mt-0.5 size-4 shrink-0 ${
                alertState.level === 'emergency'
                  ? 'text-[#ffb9a6]'
                  : 'text-[#f5c563]'
              }`}
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">
                {alertState.level === 'emergency'
                  ? 'Emergency threshold crossed'
                  : 'Distress flagged'}
              </p>
              <p className="text-[12px] text-white/65">{alertState.detail}</p>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-[12px] text-white/50 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="flex-1" />

        <div className="space-y-5 p-5 pb-8 sm:p-7 sm:pb-10">
          {state.caption || lastSaid ? (
            <p className="mx-auto max-w-2xl text-center text-[19px] leading-relaxed font-medium text-white/92 sm:text-[22px]">
              {state.caption || lastSaid}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_REPLIES.map((quick) => (
              <button
                key={quick.label}
                type="button"
                disabled={thinking}
                onClick={() => void session.send(quick.text)}
                className="flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-4 py-2.5 text-[14px] text-white/85 backdrop-blur-md transition hover:border-white/35 hover:bg-white/14 disabled:opacity-40"
              >
                <span aria-hidden="true">{quick.emoji}</span>
                {quick.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            {mic.supported ? (
              <button
                type="button"
                onClick={() => (mic.listening ? mic.stop() : mic.start())}
                className={`relative grid size-[76px] place-items-center rounded-full transition ${
                  mic.listening
                    ? 'solace-listening bg-[#5cc9de] text-[#07222b]'
                    : 'bg-white text-[#0a2730] hover:scale-105'
                }`}
                aria-label={mic.listening ? 'Stop listening' : 'Talk'}
              >
                {mic.listening ? (
                  <Square className="size-6 fill-current" />
                ) : (
                  <Mic className="size-7" />
                )}
              </button>
            ) : (
              <p className="text-[12.5px] text-white/45">
                Voice input needs Chrome or Safari — use the buttons above.
              </p>
            )}
          </div>
        </div>
      </div>

      {state.error ? (
        <p className="absolute inset-x-5 bottom-2 mx-auto max-w-xl rounded-xl border border-[#f2836b]/35 bg-[#f2836b]/12 px-3.5 py-2 text-center text-[12px] leading-snug text-[#ffd9cf]">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
