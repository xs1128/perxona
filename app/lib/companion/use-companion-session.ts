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

/** The care plan allows two companions, so two stages are always mounted. */
const MAX_STAGES = 2;

export type SessionAlert = {
  level: 'distress' | 'emergency';
  detail: string;
};

/**
 * Owns the Perxona connections for the whole flow.
 *
 * It lives above the rail because `resumeAudioPlayback()` has to run inside
 * the click that starts the session, and that click happens on the console
 * screen — not on the stage the avatars render into.
 *
 * One Presenter renders exactly one `avatarId`, so two companions means two
 * elements, each initialized separately. Both are mounted unconditionally
 * because hooks cannot be called in a loop.
 */
export function useCompanionSession(prescription: Prescription) {
  const first = usePresenter();
  const second = usePresenter();
  const stages = [first, second];

  const [liveCount, setLiveCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastSaid, setLastSaid] = useState('');
  const [thinking, setThinking] = useState(false);
  const [alert, setAlert] = useState<SessionAlert | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const companions = prescription.avatar_persona.companions.slice(
    0,
    MAX_STAGES,
  );
  const sceneId =
    findScenePreset(prescription.avatar_persona.sceneId)?.sceneId ?? '';

  const cast = companions.map((slot, index) => ({
    ...slot,
    index,
    preset: findAvatarPreset(slot.presetId),
    stage: stages[index],
    live: index < liveCount,
  }));

  const active = cast[activeIndex] ?? cast[0];
  const live = liveCount > 0;

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

    if (active?.live) {
      await active.stage.actions.present(reply.say, {
        emotion: reply.emotion,
        intensity: reply.intensity,
      });
      return;
    }

    // Rehearsal: the browser voice stands in when no stage connected.
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply.say));
  };

  /**
   * Must be called directly from the user's click.
   *
   * Stages connect in order and stop at the first failure, so a second avatar
   * the runtime or the plan cannot support degrades to a single companion
   * rather than leaving a dead half-screen.
   */
  const begin = async () => {
    let connected = 0;

    if (CONNECT_KEY && sceneId) {
      for (const member of cast) {
        if (!member.avatarId) break;

        const ok = await member.stage.actions.connect(REGION, CONNECT_KEY, {
          avatarId: member.avatarId,
          sceneId,
          voiceId: member.voiceId || undefined,
        });

        if (!ok) break;

        member.stage.actions.setCameraAngle('halfbody');
        connected += 1;
      }
    }

    setLiveCount(connected);
    setActiveIndex(0);

    const opening = buildOpeningLine(prescription);
    setLastSaid(opening);

    if (connected > 0) {
      await stages[0].actions.present(opening, {
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
    active?.stage.actions.setThinking(true);
    try {
      const reply = await respond(prescription, utterance, history);
      setHistory((current) => [...current, utterance]);
      await say(reply);
    } finally {
      setThinking(false);
      active?.stage.actions.setThinking(false);
    }
  };

  /** Both companions look up when the child speaks; only one answers. */
  const setListening = (listening: boolean) => {
    for (const member of cast) {
      if (member.live) member.stage.actions.setListening(listening);
    }
  };

  const switchTo = (index: number) => {
    if (index === activeIndex || !cast[index]) return;
    for (const member of cast) {
      if (member.live) member.stage.actions.interrupt();
    }
    window.speechSynthesis.cancel();
    setActiveIndex(index);
  };

  const end = () => {
    window.speechSynthesis.cancel();
    for (const member of cast) {
      if (member.live) member.stage.actions.interrupt();
    }
    setAlert(null);
    setLastSaid('');
  };

  const status = stages[0].state;

  return {
    cast,
    active,
    activeIndex,
    switchTo,
    live,
    liveCount,
    state: status,
    caption:
      cast.find((member) => member.live && member.stage.state.caption)?.stage
        .state.caption ?? '',
    error: stages.map((stage) => stage.state.error).find(Boolean) ?? null,
    lastSaid,
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
