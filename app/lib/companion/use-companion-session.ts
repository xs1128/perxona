'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { respond, type CompanionReply } from './brain';
import type { BreathingPattern } from './breathing';
import { findAvatarPreset, findScenePreset } from './defaults';
import { buildOpeningLine } from './prompt';
import {
  fillScript,
  isScriptedPlan,
  nextScriptBeat,
  playedBeats,
} from './script';
import type { Prescription } from './types';
import { fetchMotions } from '@/lib/perxona/catalog';
import { loadPresenterRuntime, motionMarkup } from '@/lib/perxona/presenter';
import { usePresenter } from '@/lib/perxona/use-presenter';
import type {
  PresentationEmotion,
  PresentationIntensity,
} from '@/lib/perxona/types';

const REGION = 'asia' as const;

const CONNECT_KEY = import.meta.env.VITE_PERXONA_CONNECT_PUBLISHABLE_KEY ?? '';

export type SessionAlert = {
  level: 'distress' | 'emergency';
  detail: string;
  /** Who the plan says to reach on an emergency, shown on the red card. */
  contact?: string;
  /** The crisis line the plan named, offered next to the contact. */
  resource?: string;
  /** What the patient said that raised the flag, quoted for the clinician. */
  reason?: string;
};

/**
 * Owns the Perxona connection for the whole flow.
 *
 * It lives above the rail because `resumeAudioPlayback()` has to run inside
 * the click that starts the session, and that click happens on the console
 * screen — not on the stage the avatar renders into.
 *
 * One Presenter renders one `avatarId` into its own required `sceneId`, and
 * the catalog has no transparent scene, so two avatars cannot share a
 * background. A plan may prescribe two companions; the session speaks as the
 * first.
 */
export function useCompanionSession(prescription: Prescription) {
  const { ref, state, actions } = usePresenter();
  const [live, setLive] = useState(false);
  const [lastSaid, setLastSaid] = useState('');
  const [thinking, setThinking] = useState(false);
  const [alert, setAlert] = useState<SessionAlert | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [messages, setMessages] = useState<
    { id: string; role: 'user' | 'ai'; text: string }[]
  >([]);
  const [performing, setPerforming] = useState<{
    emotion: PresentationEmotion;
    intensity: PresentationIntensity;
  } | null>(null);
  /**
   * The prescribed exercise the last turn ran, if any. Shown on the stage so
   * the audience can see the clinician's own instruction firing on its trigger
   * rather than being told that it did.
   */
  const [firedExercise, setFiredExercise] = useState<string | null>(null);
  /**
   * The paced breath currently on screen. It outlives the turn that started
   * it — the patient is meant to keep breathing after the avatar stops
   * talking — so only her next turn or the end of the session clears it.
   */
  const [breathing, setBreathing] = useState<BreathingPattern | null>(null);
  /** Rehearsal has no `PERFORMANCE_START`, so the browser voice reports itself. */
  const [rehearsalSpeaking, setRehearsalSpeaking] = useState(false);
  /**
   * True from the moment a turn is handed to the avatar until its voice picks
   * the turn up.
   *
   * `state.speaking` only goes true on `PERFORMANCE_START`, which lands well
   * after the reply text exists — a wide enough gap for the transcript to flash
   * back on screen between the reply arriving and the avatar saying it. This
   * latches at the start of the turn to close that window, and hands over to
   * `speaking` as soon as the runtime confirms the voice has started.
   */
  const [delivering, setDelivering] = useState(false);
  /** Frees the transcript if a turn is never spoken at all. */
  const deliverWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Chrome can swallow an utterance started in the same tick as `cancel()` —
   * neither `onend` nor `onerror` ever fires. The watchdog clears the speaking
   * flag on that silence, or the microphone would stay paused forever.
   */
  const rehearsalWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /*
   * Mirrors `live` for callbacks that must keep a stable identity. Without it
   * `setListening` is a new function every render, its effect in `Session`
   * re-runs, `actions.setListening` patches Presenter state, and the render
   * loop never settles.
   */
  const liveRef = useRef(live);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  const speaking = live ? state.speaking : rehearsalSpeaking;

  /*
   * Once the voice is audible, `speaking` is the better signal and the latch
   * has done its job. Releasing it here is what lets the transcript come back
   * the moment the avatar stops rather than when the watchdog expires.
   *
   * The runtime reports speech as events, so this reacts to a transition, not
   * to a value. React's documented answer to that is to adjust state during
   * render; an effect would paint the intermediate state first.
   */
  const [spoke, setSpoke] = useState(false);
  if (speaking !== spoke) {
    setSpoke(speaking);
    // The watchdog is left to expire on its own rather than cleared here:
    // re-setting a flag that is already false is a no-op, and the next turn
    // clears the pending timer before arming a new one.
    if (speaking && delivering) setDelivering(false);
  }

  const setListening = useCallback(
    (listening: boolean) => {
      /*
       * Presenter methods only exist once the runtime has upgraded the element,
       * and optional chaining guards a null element, not a missing method. Every
       * call is therefore gated on a live connection.
       */
      if (liveRef.current) actions.setListening(listening);
    },
    [actions],
  );

  /**
   * The line the presenter should say next, and what that beat is meant to
   * prove. Derived from the same replay the brain uses, so the cue card can
   * never disagree with the reply that will actually fire.
   */
  const scripted = isScriptedPlan(prescription);
  const cue = useMemo(() => {
    const beat = scripted ? nextScriptBeat(playedBeats(history)) : null;
    if (!beat) return null;
    // The card is read on stage, so it shows the names the plan actually uses.
    return {
      ...beat,
      cue: fillScript(beat.cue, prescription),
      say: fillScript(beat.say, prescription),
      beat: fillScript(beat.beat, prescription),
    };
  }, [scripted, history, prescription]);

  const companion = prescription.avatar_persona.companions[0];
  const preset = companion ? findAvatarPreset(companion.presetId) : undefined;
  const avatarId = companion?.avatarId ?? '';
  const sceneId =
    findScenePreset(prescription.avatar_persona.sceneId)?.sceneId ?? '';

  /**
   * Rehearsal voice. Tracked because the microphone has to ignore whatever the
   * speakers are playing, or the companion transcribes itself.
   */
  const speakLocally = (text: string) => {
    window.speechSynthesis.cancel();

    const settle = () => {
      if (rehearsalWatchdogRef.current) {
        clearTimeout(rehearsalWatchdogRef.current);
        rehearsalWatchdogRef.current = null;
      }
      setRehearsalSpeaking(false);
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = settle;
    utterance.onerror = settle;

    setRehearsalSpeaking(true);
    window.speechSynthesis.speak(utterance);

    // ~90ms per character sits well above typical speech rate, so the
    // watchdog only fires when the utterance was never really started.
    rehearsalWatchdogRef.current = setTimeout(
      settle,
      Math.max(4000, text.length * 90),
    );
  };

  /**
   * Opens the delivery window for a turn about to be spoken. The watchdog is
   * sized off the text so a `present()` that never reaches the speakers cannot
   * leave the transcript hidden for the rest of the session.
   */
  const beginDelivery = (text: string) => {
    if (deliverWatchdogRef.current) clearTimeout(deliverWatchdogRef.current);
    setDelivering(true);
    deliverWatchdogRef.current = setTimeout(
      () => setDelivering(false),
      Math.max(6000, text.length * 120),
    );
  };

  /** Warms the runtime while the clinician is still filling the form. */
  const preload = () => {
    if (CONNECT_KEY && avatarId && sceneId) {
      // Calling connect here initializes the runtime and starts downloading the heavy 3D assets early.
      // Audio playback won't be resumed until the user clicks 'Begin Session'.
      void actions.connect(REGION, CONNECT_KEY, {
        avatarId,
        sceneId,
        voiceId: companion?.voiceId || undefined,
      });
    } else {
      void loadPresenterRuntime(REGION).catch(() => {
        // A failed preload is not fatal; `begin()` retries and reports.
      });
    }
  };

  const say = async (reply: CompanionReply) => {
    beginDelivery(reply.say);
    setBreathing(reply.breathing ?? null);
    setLastSaid(reply.say);
    setFiredExercise(reply.firedExercise ?? null);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'ai', text: reply.say },
    ]);

    if (reply.flag !== 'none') {
      const { guardian_contact: guardian, provide_resource: resource } =
        prescription.escalation_protocol.emergency_action;
      setAlert({
        level: reply.flag,
        detail:
          reply.flag === 'emergency'
            ? 'The companion broke character. A human has to take this turn.'
            : 'Flagged on the clinician dashboard',
        contact: guardian || undefined,
        resource: resource || undefined,
        reason: reply.flagReason,
      });
    }

    if (live) {
      if (reply.intensity === 'high') actions.setCameraAngle('halfbody');
      else if (reply.intensity === 'low') actions.setCameraAngle('fullbody');

      setPerforming({ emotion: reply.emotion, intensity: reply.intensity });
      await actions.present(reply.say, {
        emotion: reply.emotion,
        intensity: reply.intensity,
      });
      return;
    }

    setPerforming({ emotion: reply.emotion, intensity: reply.intensity });

    // Rehearsal: the browser voice stands in when no catalog IDs are set.
    speakLocally(reply.say);
  };

  /** Must be called directly from the user's click. */
  const begin = async () => {
    // Must run inside the user gesture that triggered the session.
    if (CONNECT_KEY && avatarId && sceneId) {
      await actions.resumeAudio();
    }

    const connected =
      CONNECT_KEY && avatarId && sceneId
        ? await actions.connect(REGION, CONNECT_KEY, {
            avatarId,
            sceneId,
            voiceId: companion?.voiceId || undefined,
          })
        : false;

    setLive(connected);

    const opening = buildOpeningLine(prescription);
    beginDelivery(opening);
    setLastSaid(opening);
    setMessages([{ id: crypto.randomUUID(), role: 'ai', text: opening }]);
    setFiredExercise(null);
    setPerforming({ emotion: 'caring', intensity: 'neutral' });

    if (connected) {
      actions.setCameraAngle('halfbody');

      /*
       * Motion IDs are avatar-specific, so the greeting is resolved from this
       * Avatar's own catalog at runtime rather than hardcoded. An Avatar with
       * no greeting motion simply speaks without one.
       */
      let spoken = opening;
      try {
        const motions = await fetchMotions(
          { region: REGION, publishableKey: CONNECT_KEY },
          avatarId,
        );
        const greeting = motions.find(
          (motion) => motion.category.toLowerCase() === 'greeting',
        );
        if (greeting) spoken = `${motionMarkup(greeting.id)} ${opening}`;
      } catch {
        // Motion lookup is decorative; never block the opening line on it.
      }

      await actions.present(spoken, {
        emotion: 'caring',
        intensity: 'neutral',
      });
    } else {
      speakLocally(opening);
    }
  };

  const send = async (text: string) => {
    const utterance = text.trim();
    if (!utterance) return;

    setThinking(true);
    // Her answering is the signal that the breath is over.
    setBreathing(null);
    if (live) actions.setThinking(true);
    try {
      const reply = await respond(prescription, utterance, history);
      setHistory((current) => [...current, utterance]);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'user', text: utterance },
      ]);
      await say(reply);
    } finally {
      setThinking(false);
      if (live) actions.setThinking(false);
    }
  };

  const end = () => {
    window.speechSynthesis.cancel();
    if (rehearsalWatchdogRef.current) {
      clearTimeout(rehearsalWatchdogRef.current);
      rehearsalWatchdogRef.current = null;
    }
    setRehearsalSpeaking(false);
    if (live) actions.interrupt();
    setAlert(null);
    setLastSaid('');
    setPerforming(null);
    setFiredExercise(null);
    setBreathing(null);
    if (deliverWatchdogRef.current) {
      clearTimeout(deliverWatchdogRef.current);
      deliverWatchdogRef.current = null;
    }
    setDelivering(false);
  };

  return {
    ref,
    state,
    live,
    /** True whichever voice is talking — the Presenter's or the browser's. */
    speaking,
    /** True between a turn being handed over and its voice starting. */
    delivering,
    messages,
    preset,
    companion,
    lastSaid,
    performing,
    firedExercise,
    breathing,
    thinking,
    /** True when the packaged demo plan is loaded and the script is armed. */
    scripted,
    cue,
    alert,
    dismissAlert: () => setAlert(null),
    setListening,
    preload,
    begin,
    send,
    end,
  };
}

export type CompanionSession = ReturnType<typeof useCompanionSession>;
