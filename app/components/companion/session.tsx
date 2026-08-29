"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, ShieldAlert, Square } from "lucide-react";

import { AvatarPortrait } from "./avatar-portrait";
import type { CompanionSession } from "@/lib/companion/use-companion-session";
import { useSpeechRecognition } from "@/lib/speech/use-speech-recognition";

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
    speaking,
    thinking,
    lastSaid,
    performing,
    setListening,
    dismissAlert,
    alert: alertState,
  } = session;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heard, setHeard] = useState("");

  const mic = useSpeechRecognition({
    // The avatar speaks out of the same speakers the microphone hears, so its
    // own voice would come back as the patient's next utterance.
    paused: thinking || speaking,
    onResult: (transcript) => {
      setHeard(transcript);
      void session.send(transcript);
    },
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

  /* One word for what the avatar is doing, plus how it is doing it. */
  const stage = thinking
    ? { label: "Thinking", tone: "#f5c563" }
    : mic.listening
    ? { label: "Listening", tone: "#5cc9de" }
    : state.phase === "connecting"
    ? {
        label: state.progress
          ? `Loading ${state.progress.asset} ${state.progress.percentage}%`
          : "Connecting",
        tone: "#f5c563",
      }
    : speaking
    ? { label: "Speaking", tone: "#5fcdc0" }
    : live
    ? { label: "Listening for you", tone: "#ffffff" }
    : { label: "Rehearsal mode", tone: "#ffffff" };

  return (
    <div className="solace-panel solace-ground relative overflow-hidden">
      {/*
        The Perxona stage. Always mounted so `begin()` has a live element, and
        never `display: none` — a hidden element gives the renderer a 0x0
        canvas, and the Presenter can stall at `Initializing` rather than
        reaching `Ready`. It fades in instead.
      */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          live ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
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
                speaking || thinking ? "" : "solace-breathe"
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
                {companion?.calledName || "Companion"}
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
                      thinking || mic.listening ? "animate-pulse" : ""
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
              </div>
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
              alertState.level === "emergency"
                ? "border-[#f2836b]/50 bg-[#f2836b]/16"
                : "border-[#f5c563]/40 bg-[#f5c563]/12"
            }`}
          >
            <ShieldAlert
              className={`mt-0.5 size-4 shrink-0 ${
                alertState.level === "emergency"
                  ? "text-[#ffb9a6]"
                  : "text-[#f5c563]"
              }`}
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">
                {alertState.level === "emergency"
                  ? "Emergency threshold crossed"
                  : "Distress flagged"}
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

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 solace-scrollbar flex flex-col justify-end">
          <div className="space-y-4 max-w-2xl mx-auto w-full">
            {session.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] ${
                    msg.role === "user"
                      ? "bg-[#5cc9de] text-[#07222b] rounded-br-sm"
                      : "bg-white text-black rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking || mic.interim ? (
              <div
                className={`flex ${
                  mic.interim ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] ${
                    mic.interim
                      ? "bg-[#5cc9de]/70 text-[#07222b] rounded-br-sm italic"
                      : "bg-white/80 text-black rounded-bl-sm animate-pulse shadow-sm"
                  }`}
                >
                  {mic.interim ? mic.interim : "..."}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-5 pb-8 sm:p-7 sm:pb-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem("text") as HTMLInputElement;
              const val = input.value;
              if (val && !thinking) {
                void session.send(val);
                input.value = "";
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
                onClick={() => (mic.listening ? mic.stop() : mic.start())}
                className={`grid size-12 shrink-0 place-items-center rounded-full transition ${
                  mic.listening
                    ? "solace-listening bg-[#5cc9de] text-[#07222b]"
                    : "bg-white text-[#0a2730] hover:scale-105"
                }`}
                aria-label={mic.listening ? "Stop listening" : "Talk"}
              >
                {mic.listening ? (
                  <Square className="size-4 fill-current" />
                ) : (
                  <Mic className="size-5" />
                )}
              </button>
            ) : null}
          </form>
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
