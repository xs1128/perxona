'use client';

import { useState } from 'react';

import { respond, type CompanionReply } from './brain';
import { findAvatarPreset, findScenePreset } from './defaults';
import { buildOpeningLine } from './prompt';
import type { Prescription } from './types';
import { loadPresenterRuntime } from '@/lib/perxona/presenter';
import { usePresenter } from '@/lib/perxona/use-presenter';

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

  const companion = prescription.avatar_persona.companions[0];
  const preset = companion ? findAvatarPreset(companion.presetId) : undefined;
  const avatarId = companion?.avatarId ?? '';
  const sceneId =
    findScenePreset(prescription.avatar_persona.sceneId)?.sceneId ?? '';

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
      await actions.present(reply.say, {
        emotion: reply.emotion,
        intensity: reply.intensity,
      });
      return;
    }

    // Rehearsal: the browser voice stands in when no catalog IDs are set.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply.say));
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
    if (connected) actions.setCameraAngle('halfbody');

    const opening = buildOpeningLine(prescription);
    setLastSaid(opening);

    if (connected) {
      await actions.present(opening, {
        emotion: 'caring',
        intensity: 'neutral',
      });
    } else {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(opening));
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
    if (live) actions.interrupt();
    setAlert(null);
    setLastSaid('');
  };

  return {
    ref,
    state,
    live,
    preset,
    companion,
    lastSaid,
    thinking,
    alert,
    dismissAlert: () => setAlert(null),
    /*
     * Presenter methods only exist once the runtime has upgraded the element,
     * and optional chaining guards a null element, not a missing method. Every
     * call is therefore gated on a live connection.
     */
    setListening: (listening: boolean) => {
      if (live) actions.setListening(listening);
    },
    preload,
    begin,
    send,
    end,
  };
}

export type CompanionSession = ReturnType<typeof useCompanionSession>;
