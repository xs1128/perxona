'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  TvMinimalPlay,
} from 'lucide-react';

import { AvatarPortrait } from './avatar-portrait';
import { BreathingGuide } from './breathing-guide';
import type { CompanionSession } from '@/lib/companion/use-companion-session';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';

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
    instanceKey,
    live,
    state,
    preset,
    companion,
    speaking,
    delivering,
    thinking,
    performing,
    firedExercise,
    breathing,
    scripted,
    cue,
    setListening,
    dismissAlert,
    alert: alertState,
  } = session;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* The presenter's teleprompter. Off by default — the stage is projected. */
  const [cueOpen, setCueOpen] = useState(false);

  const mic = useSpeechRecognition({
    // Only the avatar's own voice has to be ignored — it plays out of the same
    // speakers the microphone hears. While it thinks the stage is silent, so
    // everything the mic picks up is the patient and must go through.
    paused: speaking,
    onResult: (transcript) => {
      void session.send(transcript);
    },
  });

  /*
   * Push-to-talk.
   *
   * A latched microphone restarts itself through Chrome's silence timeout, so
   * between turns it keeps hearing the room — anyone else in it included. Held
   * capture makes the window explicit: the microphone is open only while a
   * finger is down, and releasing it is what ends the turn.
   *
   * `talkingRef` guards the edges that can fire twice, like a pointer release
   * that lands after the window has already blurred.
   */
  const talkingRef = useRef(false);
  const { start: micStart, stop: micStop, supported: micSupported } = mic;

  const beginTalk = useCallback(() => {
    if (talkingRef.current) return;
    talkingRef.current = true;
    micStart();
  }, [micStart]);

  const endTalk = useCallback(() => {
    if (!talkingRef.current) return;
    talkingRef.current = false;
    // `stop()` lets the engine deliver whatever it has already buffered, so
    // the final transcript still arrives after the release.
    micStop();
  }, [micStop]);

  /*
   * Space is the same hold, for a presenter whose hand is on the keyboard
   * rather than the trackpad. Losing the window mid-hold — alt-tabbing to the
   * slides — has to close the microphone too, or it stays open off-screen.
   */
  useEffect(() => {
    if (!micSupported) return;

    const isTyping = () => {
      const element = document.activeElement;
      return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // `repeat` fires for as long as the key is held; only the first counts.
      if (event.code !== 'Space' || event.repeat || isTyping()) return;
      event.preventDefault();
      beginTalk();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      endTalk();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', endTalk);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endTalk);
    };
  }, [micSupported, beginTalk, endTalk]);

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

  /*
   * The transcript steps aside for the avatar's turn.
   *
   * It covers the whole turn, not just the audible part, so the bubbles fade
   * once and come back once instead of blinking at each handover between
   * thinking, delivery and speech.
   */
  const avatarHasTurn = thinking || delivering || speaking;
  /*
   * The count waits for the voice to finish. Starting it under the line that
   * explains it would put the ring mid-cycle by the time she is actually asked
   * to breathe in, so the avatar explains and then the guide takes over.
   */
  const breathingActive = breathing !== null && !avatarHasTurn;
  const transcriptHidden = avatarHasTurn || breathing !== null;

  /* One word for what the avatar is doing, plus how it is doing it. */
  const stage = thinking
    ? { label: 'Thinking', tone: '#f5c563' }
    : mic.preparing
      ? { label: 'Preparing speech', tone: '#f5c563' }
      : mic.listening
        ? { label: 'Listening', tone: '#5cc9de' }
        : state.phase === 'connecting'
          ? {
              label: state.progress
                ? `Loading ${state.progress.asset} ${state.progress.percentage}%`
                : 'Connecting',
              tone: '#f5c563',
            }
          : speaking
            ? { label: 'Speaking', tone: '#5fcdc0' }
            : live
              ? { label: 'Listening for you', tone: '#ffffff' }
              : { label: 'Rehearsal mode', tone: '#ffffff' };

  /*
   * The microphone is armed but discarding audio — never a mystery silence:
   * the button drops its recording look so "I talk and nothing happens" is
   * not what a paused mic looks like.
   */
  const micStandby = mic.listening && speaking;

  return (
    <div className="solace-panel solace-ground relative overflow-hidden">
      {/*
        The Perxona stage. Always mounted so `begin()` has a live element, and
        never `display: none` — a hidden element gives the renderer a 0x0
        canvas, and the Presenter can stall at `Initializing` rather than
        reaching `Ready`. It fades in instead.

        `key` is load-bearing: an element is bound to the Avatar and Scene it
        was initialized with, so `usePresenter` changes the target by bumping
        this and initializing the replacement.
      */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          live ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* @ts-expect-error sv-presenter is provided by the Perxona runtime. */}
        <sv-presenter
          key={instanceKey}
          ref={ref}
          className="block h-full w-full"
        />
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
                speaking || thinking ? '' : 'solace-breathe'
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

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: `${stage.tone}55`,
                    background: `${stage.tone}1f`,
                    color: stage.tone,
                  }}
                  aria-live="polite"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      thinking || mic.preparing || mic.listening
                        ? 'animate-pulse'
                        : ''
                    }`}
                    style={{ background: stage.tone }}
                  />
                  {stage.label}
                </span>

                {/*
                  The emotion the care plan asked for, shown as it performs.
                  This is the visible link between the prescription and what
                  the avatar's face is doing.
                */}
                {performing ? (
                  <span className="rounded-full border border-white/14 bg-white/8 px-2.5 py-1 font-mono text-[11px] text-white/70">
                    {performing.emotion} · {performing.intensity}
                  </span>
                ) : null}

                {/*
                  A prescribed exercise ran on the trigger its clinician wrote.
                  Naming it here is the whole argument of the product in one
                  chip: the plan is executing, not a generic assistant.
                */}
                {firedExercise ? (
                  <span className="rounded-full border border-[#5fcdc0]/45 bg-[#5fcdc0]/14 px-2.5 py-1 text-[11px] font-medium text-[#8fe0c5]">
                    Prescribed exercise · {firedExercise}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scripted ? (
              <button
                type="button"
                onClick={() => setCueOpen((open) => !open)}
                title="Show the next line to say"
                aria-pressed={cueOpen}
                className={`grid size-10 place-items-center rounded-full border transition ${
                  cueOpen
                    ? 'border-white/30 bg-white/10 text-white/80'
                    : 'border-white/12 text-white/35 hover:border-white/30 hover:text-white/70'
                }`}
              >
                <TvMinimalPlay className="size-4" />
              </button>
            ) : null}

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
          </div>
        </header>

        {/*
          Two very different jobs share this slot. Distress is a note for the
          dashboard and stays quiet. An emergency is an instruction to the
          person in the room — call the doctor — so it goes solid red, names
          the contact from the plan, and quotes the line that tripped it.
        */}
        {alertState ? (
          alertState.level === 'emergency' ? (
            <div className="mx-5 rounded-2xl border-2 border-[#ff4d4d] bg-[#c81e1e] px-4 py-3 shadow-[0_0_0_4px_rgba(255,77,77,0.18)] sm:mx-7">
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 size-5 shrink-0 animate-pulse text-white" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Emergency threshold crossed
                  </p>
                  <p className="text-[16px] font-semibold leading-tight text-white">
                    Call the doctor now
                    {alertState.contact ? ` — ${alertState.contact}` : ''}
                  </p>
                  {alertState.reason ? (
                    <p className="mt-1 text-[12px] leading-snug text-white/80">
                      Heard: &ldquo;{alertState.reason}&rdquo;
                    </p>
                  ) : null}
                  <p className="mt-1 text-[12px] leading-snug text-white/80">
                    {alertState.detail}
                    {alertState.resource ? ` · ${alertState.resource}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="text-[12px] text-white/60 transition hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-5 flex items-start gap-3 rounded-2xl border border-[#f5c563]/40 bg-[#f5c563]/12 px-4 py-3 sm:mx-7">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#f5c563]" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white">
                  Distress flagged
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
          )
        ) : null}

        {/*
          The transcript sits on top of the avatar, so it is held at 70% and
          masked with a bottom-up gradient: the newest line is the most solid
          and everything scrolling upward thins out, keeping the face readable.
        */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-7 solace-scrollbar flex flex-col justify-end opacity-70"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.12) 14%, rgba(0,0,0,0.4) 34%, rgba(0,0,0,0.72) 56%, #000 78%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.12) 14%, rgba(0,0,0,0.4) 34%, rgba(0,0,0,0.72) 56%, #000 78%)',
          }}
        >
          <div
            className={`space-y-4 max-w-2xl mx-auto w-full transition-opacity duration-500 ${
              transcriptHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {session.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] ${
                    msg.role === 'user'
                      ? 'bg-[#5cc9de] text-[#07222b] rounded-br-sm'
                      : 'bg-white text-black rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking || mic.interim ? (
              <div
                className={`flex ${
                  mic.interim ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] ${
                    mic.interim
                      ? 'bg-[#5cc9de]/70 text-[#07222b] rounded-br-sm italic'
                      : 'bg-white/80 text-black rounded-bl-sm animate-pulse shadow-sm'
                  }`}
                >
                  {mic.interim ? mic.interim : '...'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/*
          Anchored low and outside the transcript's mask: the count has to stay
          crisp where the bubbles are deliberately faded, and clear of the
          avatar's face at either camera angle.
        */}
        {breathingActive ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center sm:bottom-36">
            <BreathingGuide pattern={breathing} />
          </div>
        ) : null}

        {scripted && cueOpen ? (
          <div className="mx-auto w-full max-w-2xl px-5 sm:px-7">
            <div className="rounded-2xl border border-white/14 bg-black/55 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                {cue ? 'Say next' : 'Script finished'}
              </p>
              {cue ? (
                <>
                  <p className="mt-1.5 text-[15px] leading-snug text-white">
                    “{cue.cue}”
                  </p>
                  <p className="mt-1.5 text-[12px] leading-snug text-white/45">
                    {cue.beat}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[13px] leading-snug text-white/55">
                  Every beat has played. Anything said now is answered by the
                  care plan&apos;s own rules.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="p-5 pb-8 sm:p-7 sm:pb-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('text') as HTMLInputElement;
              const val = input.value;
              if (val && !thinking) {
                void session.send(val);
                input.value = '';
              }
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto"
          >
            <input
              name="text"
              type="text"
              placeholder="Type a message..."
              disabled={thinking}
              className="flex-1 rounded-full border border-white/16 bg-white/10 px-5 py-3.5 text-[15px] text-white placeholder-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
            {mic.supported ? (
              <button
                type="button"
                /*
                  Capturing the pointer keeps the release on this element even
                  if the finger slides off it mid-sentence, which is the whole
                  point of a hold: it can only end when the hand lets go.
                */
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  beginTalk();
                }}
                onPointerUp={endTalk}
                onPointerCancel={endTalk}
                title="Hold to talk, or hold the space bar"
                className={`grid size-12 shrink-0 touch-none select-none place-items-center rounded-full transition ${
                  mic.preparing || mic.listening
                    ? 'solace-listening scale-110 bg-[#5cc9de] text-[#07222b]'
                    : 'bg-white text-[#0a2730] hover:scale-105'
                }`}
                aria-label="Hold to talk"
              >
                <Mic className="size-5" />
              </button>
            ) : null}
          </form>

          {mic.supported ? (
            <p
              className="mx-auto mt-2.5 max-w-2xl text-center text-[12px] text-white/35"
              aria-live="polite"
            >
              {mic.preparing
                ? 'Preparing on-device speech recognition…'
                : mic.listening
                  ? 'Listening — release to send'
                  : 'Hold the mic, or hold the space bar, and speak'}
            </p>
          ) : null}
        </div>
      </div>

      {state.error || mic.error ? (
        <p className="absolute inset-x-5 bottom-2 mx-auto max-w-xl rounded-xl border border-[#f2836b]/35 bg-[#f2836b]/12 px-3.5 py-2 text-center text-[12px] leading-snug text-[#ffd9cf]">
          {state.error ?? mic.error}
        </p>
      ) : null}
    </div>
  );
}
