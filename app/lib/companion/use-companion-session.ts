'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { respond, type CompanionReply } from './brain';
import { findAvatarPreset, findScenePreset } from './defaults';
import { buildOpeningLine } from './prompt';
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
  const [performing, setPerforming] = useState<{
    emotion: PresentationEmotion;
    intensity: PresentationIntensity;
  } | null>(null);
  /** Rehearsal has no `PERFORMANCE_START`, so the browser voice reports itself. */
  const [rehearsalSpeaking, setRehearsalSpeaking] = useState(false);
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

  /** Warms the runtime while the clinician is still filling the form. */
  const preload = () => {
    void loadPresenterRuntime(REGION).catch(() => {
      // A failed preload is not fatal; `begin()` retries and reports.
    });
  };

  const say = async (reply: CompanionReply) => {
    setLastSaid(reply.say);

    if (reply.flag !== 'none') {
      const guardian =
        prescription.escalation_protocol.emergency_action.guardian_contact;
      setAlert({
        level: reply.flag,
        detail:
          reply.flag === 'emergency'
            ? `${guardian || 'Guardian'} notified`
            : 'Flagged on the clinician dashboard',
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
    setLastSaid(opening);
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
    if (live) actions.setThinking(true);
    try {
      const reply = await respond(prescription, utterance, history);
      setHistory((current) => [...current, utterance]);
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
  };

  return {
    ref,
    state,
    live,
    /** True whichever voice is talking — the Presenter's or the browser's. */
    speaking: live ? state.speaking : rehearsalSpeaking,
    preset,
    companion,
    lastSaid,
    performing,
    thinking,
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
