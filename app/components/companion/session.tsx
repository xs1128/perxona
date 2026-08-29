'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, PhoneOff, ShieldAlert, Square } from 'lucide-react';

import { AvatarPortrait } from './avatar-portrait';
import { respond, type CompanionReply } from '@/lib/companion/brain';
import { findAvatarPreset, findScenePreset } from '@/lib/companion/defaults';
import { buildOpeningLine } from '@/lib/companion/prompt';
import type { Prescription } from '@/lib/companion/types';
import { usePresenter } from '@/lib/perxona/use-presenter';
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

type Alert = {
  level: 'distress' | 'emergency';
  detail: string;
};

export function Session({
  prescription,
  onExit,
}: {
  prescription: Prescription;
  onExit: () => void;
}) {
  const { ref, state, actions } = usePresenter();
  const [started, setStarted] = useState(false);
  const [live, setLive] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [lastSaid, setLastSaid] = useState('');
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const historyRef = useRef<string[]>([]);
  /* `live` as state drives the render; the ref is what `speak` can read
     synchronously in the same tick that `start` connects. */
  const liveRef = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guardianContact =
    prescription.escalation_protocol.emergency_action.guardian_contact;
  const companion = prescription.avatar_persona.companions[0];
  const preset = companion ? findAvatarPreset(companion.presetId) : undefined;
  const scene = findScenePreset(prescription.avatar_persona.sceneId);

  const speak = async (reply: CompanionReply) => {
    setLastSaid(reply.say);

    if (reply.flag !== 'none') {
      setAlert({
        level: reply.flag,
        detail:
          reply.flag === 'emergency'
            ? `${guardianContact || 'Guardian'} notified`
            : 'Flagged on the clinician dashboard',
      });
    }

    if (liveRef.current) {
      await actions.resumeAudio();
      await actions.present(reply.say, {
        emotion: reply.emotion,
        intensity: reply.intensity,
      });
      return;
    }

    // Rehearsal mode: the browser voice stands in for the Perxona avatar.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply.say));
  };

  const handleUtterance = async (text: string) => {
    const utterance = text.trim();
    if (!utterance) return;

    setThinking(true);
    actions.setThinking(true);
    try {
      const reply = await respond(prescription, utterance, historyRef.current);
      historyRef.current = [...historyRef.current, utterance];
      await speak(reply);
    } finally {
      setThinking(false);
      actions.setThinking(false);
    }
  };

  const mic = useSpeechRecognition({
    onResult: (transcript) => void handleUtterance(transcript),
  });

  useEffect(() => {
    if (live) actions.setListening(mic.listening);
  }, [actions, live, mic.listening]);

  /* Connecting must happen inside the tap, or the browser blocks audio. */
  const start = async () => {
    setStarted(true);

    const avatarId = companion?.avatarId ?? '';
    const sceneId = scene?.sceneId ?? '';
    const connectKey =
      import.meta.env.VITE_PERXONA_CONNECT_PUBLISHABLE_KEY ?? '';

    if (connectKey && avatarId && sceneId) {
      const connected = await actions.connect('asia', connectKey, {
        avatarId,
        sceneId,
        voiceId: companion?.voiceId || undefined,
      });
      liveRef.current = connected;
      setLive(connected);
      if (connected) actions.setCameraAngle('halfbody');
    } else {
      setNote(
        'Rehearsal mode — set VITE_PERXONA_CONNECT_PUBLISHABLE_KEY, VITE_PERXONA_AVATAR_ID and VITE_PERXONA_SCENE_ID in app/.env.local, then reload.',
      );
    }

    await speak({
      say: buildOpeningLine(prescription),
      emotion: 'caring',
      intensity: 'neutral',
      flag: 'none',
    });
  };

  /* The exit is deliberately awkward so a child cannot reach the console. */
  const beginHold = () => {
    holdTimer.current = setTimeout(() => {
      window.speechSynthesis.cancel();
      actions.interrupt();
      onExit();
    }, 2500);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const statusLabel = useMemo(() => {
    if (thinking) return 'Thinking…';
    if (mic.listening) return 'Listening…';
    if (state.phase === 'connecting') {
      return state.progress
        ? `Loading ${state.progress.asset} ${state.progress.percentage}%`
        : 'Connecting…';
    }
    return live ? state.performanceState : 'Rehearsal mode';
  }, [thinking, mic.listening, state, live]);

  return (
    <div className="solace-panel solace-ground relative overflow-hidden">
      {/* Perxona stage. Faded rather than `hidden`: the Presenter measures its
          host when it initializes, and a `display:none` host hands the renderer
          a 0x0 canvas that never resizes once the class flips back. */}
      <div
        aria-hidden={!live}
        className={`absolute inset-0 transition-opacity duration-700 ${
          live ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* @ts-expect-error sv-presenter is provided by the Perxona runtime. */}
        <sv-presenter ref={ref} className="block h-full w-full" />
      </div>

      {/* Stand-in stage for rehearsal without catalog IDs. */}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/72 to-transparent" />

      {/* -------------------------------------------------------------- */}
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
                {statusLabel}
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

        {alert ? (
          <div
            className={`mx-5 flex items-start gap-3 rounded-2xl border px-4 py-3 sm:mx-7 ${
              alert.level === 'emergency'
                ? 'border-[#f2836b]/50 bg-[#f2836b]/16'
                : 'border-[#f5c563]/40 bg-[#f5c563]/12'
            }`}
          >
            <ShieldAlert
              className={`mt-0.5 size-4 shrink-0 ${
                alert.level === 'emergency'
                  ? 'text-[#ffb9a6]'
                  : 'text-[#f5c563]'
              }`}
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">
                {alert.level === 'emergency'
                  ? 'Emergency threshold crossed'
                  : 'Distress flagged'}
              </p>
              <p className="text-[12px] text-white/65">{alert.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="text-[12px] text-white/50 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {/* Connection failures used to vanish into hook state; a blank stage
            with no explanation is the worst possible failure mode here. */}
        {state.error || note ? (
          <p className="mx-5 mt-3 rounded-2xl border border-[#f2836b]/40 bg-[#f2836b]/12 px-4 py-3 text-[12.5px] leading-relaxed text-[#ffb9a6] sm:mx-7">
            {state.error || note}
          </p>
        ) : null}

        <div className="flex-1" />

        <div className="space-y-5 p-5 pb-8 sm:p-7 sm:pb-10">
          {(state.caption || lastSaid) && (
            <p className="mx-auto max-w-2xl text-center text-[19px] leading-relaxed font-medium text-white/92 sm:text-[22px]">
              {state.caption || lastSaid}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_REPLIES.map((quick) => (
              <button
                key={quick.label}
                type="button"
                disabled={thinking}
                onClick={() => void handleUtterance(quick.text)}
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

      {/* -------------------------------------------------------------- */}
      {started ? null : (
        <Handoff prescription={prescription} onStart={() => void start()} />
      )}
    </div>
  );
}

/**
 * The privacy boundary between clinician and patient. It also supplies the
 * user gesture the browser requires before any audio can play.
 */
function Handoff({
  prescription,
  onStart,
}: {
  prescription: Prescription;
  onStart: () => void;
}) {
  const name =
    prescription.patient_profile.preferred_name ||
    prescription.patient_profile.name;
  const companion = prescription.avatar_persona.companions[0];
  const preset = companion ? findAvatarPreset(companion.presetId) : undefined;

  return (
    <div className="solace-ground absolute inset-0 z-30 grid place-items-center p-6">
      <div className="solace-rise solace-glass w-full max-w-md p-8 text-center">
        {preset ? (
          <AvatarPortrait
            gradient={preset.gradient}
            className="mx-auto size-24"
          />
        ) : null}

        <h2 className="mt-6 text-[27px] leading-tight font-semibold tracking-[-0.02em] text-white">
          Ready for {name || 'your patient'}
        </h2>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/60">
          Hand over the tablet, then tap to begin. The care plan leaves the
          screen from here.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          <Badge
            label={`${prescription.clinical_guardrails.hard_boundaries.length} topics blocked`}
            color="#f2836b"
          />
          <Badge
            label={`${prescription.escalation_protocol.dashboard_alert_keywords.length} phrases watched`}
            color="#f5c563"
          />
          {prescription.escalation_protocol.emergency_action.notify_guardian ? (
            <Badge label="Guardian on call" color="#5fcdc0" />
          ) : null}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 w-full rounded-2xl bg-white py-4 text-[16px] font-semibold text-[#0a2730] transition hover:bg-white/90"
        >
          Start the session
        </button>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
