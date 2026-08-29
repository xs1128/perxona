import { buildSystemPrompt } from './prompt';
import {
  emergencyScript,
  scanPatientUtterance,
  violatesBoundary,
} from './safety';
import {
  fillScript,
  isScriptedPlan,
  matchScriptBeat,
  playedBeats,
} from './script';
import type { Prescription } from './types';
import type {
  PresentationEmotion,
  PresentationIntensity,
} from '@/lib/perxona/types';

export type CompanionReply = {
  say: string;
  emotion: PresentationEmotion;
  intensity: PresentationIntensity;
  flag: 'none' | 'distress' | 'emergency';
  /** Set when a prescribed exercise fired, so the console can show which. */
  firedExercise?: string;
};

/**
 * Produces the companion's next turn.
 *
 * Three paths, in order of authority. The safety scan runs first and can end
 * the turn on its own. The rehearsed demo script answers next, so the stage
 * conversation in `script.ts` plays back exactly as written. Anything the
 * script does not cover falls through to the rule-based stand-in below.
 *
 * `localReply` is the piece to replace with a call to your own server route —
 * the prompt is already assembled by `buildSystemPrompt`, and the return shape
 * matches the JSON the model is asked to emit.
 */
export async function respond(
  prescription: Prescription,
  utterance: string,
  history: string[],
): Promise<CompanionReply> {
  const signal = scanPatientUtterance(utterance, prescription);

  if (signal.level === 'emergency') {
    return {
      say: emergencyScript(prescription),
      emotion: 'caring',
      intensity: 'high',
      flag: 'emergency',
    };
  }

  const reply =
    scriptedReply(prescription, utterance, history) ??
    localReply(prescription, utterance, history, signal.level);

  // The clinician's boundaries win over whatever the generator produced.
  const breached = violatesBoundary(reply.say, prescription);
  if (breached) {
    return {
      say: "I'm here. We don't have to talk about anything you don't want to.",
      emotion: 'caring',
      intensity: 'low',
      flag: reply.flag,
    };
  }

  return reply;
}

/**
 * The rehearsed turn for this utterance, or null when it is off-script.
 *
 * Which beats are already spent is replayed from `history` rather than held in
 * state, so this stays a pure function of the turn it is given.
 */
function scriptedReply(
  prescription: Prescription,
  utterance: string,
  history: string[],
): CompanionReply | null {
  if (!isScriptedPlan(prescription)) return null;

  const beat = matchScriptBeat(utterance, playedBeats(history));
  if (!beat) return null;

  // The escalation beat has no written line: the demo has to show the real
  // break-character path, not a rehearsed copy of it.
  const say =
    beat.flag === 'emergency'
      ? emergencyScript(prescription)
      : fillScript(beat.say, prescription);

  return {
    say,
    emotion: beat.emotion,
    intensity: beat.intensity,
    flag: beat.flag,
    firedExercise: beat.firedExercise,
  };
}

/** Exposed so the console can show the exact prompt a real model would get. */
export { buildSystemPrompt };

function localReply(
  prescription: Prescription,
  utterance: string,
  history: string[],
  level: 'none' | 'distress',
): CompanionReply {
  const text = utterance.toLowerCase();
  const anchors = prescription.clinical_guardrails.safe_anchors;
  const anchor = anchors[history.length % Math.max(anchors.length, 1)] ?? '';

  // A prescribed exercise outranks ordinary conversation.
  for (const exercise of prescription.prescribed_interventions
    .custom_exercises) {
    if (matchesTrigger(exercise.trigger_condition, text)) {
      return {
        say: scriptToSpeech(exercise.action_script, prescription),
        emotion: 'caring',
        intensity: 'high',
        flag: level,
        firedExercise: exercise.trigger_condition,
      };
    }
  }

  if (level === 'distress') {
    return {
      say: "That sounds really heavy. I'm not going anywhere — take your time, I'm listening.",
      emotion: 'caring',
      intensity: 'high',
      flag: 'distress',
    };
  }

  if (/\b(can'?t sleep|awake|tired|insomnia|3am|late)\b/.test(text)) {
    return {
      say: anchor
        ? `Nights are the hardest, aren't they. We don't have to fix it — tell me about ${anchor.toLowerCase()} instead.`
        : "Nights are the hardest, aren't they. We don't have to fix it. I'll just stay here.",
      emotion: 'caring',
      intensity: 'neutral',
      flag: 'none',
    };
  }

  if (/\b(miss|alone|lonely|nobody|empty)\b/.test(text)) {
    return {
      say: "I hear you. Missing someone doesn't get smaller, it just gets easier to carry some days. I'm right here tonight.",
      emotion: 'caring',
      intensity: 'high',
      flag: 'none',
    };
  }

  if (/\b(good|okay|fine|better|happy)\b/.test(text)) {
    return {
      say: anchor
        ? `That's really good to hear. Want to tell me what's been keeping you going — ${anchor.toLowerCase()}, maybe?`
        : "That's really good to hear. What's been keeping you going?",
      emotion: 'joy',
      intensity: 'neutral',
      flag: 'none',
    };
  }

  return {
    say: anchor
      ? `Mm. I'm listening. Do you want to keep going, or should we talk about ${anchor.toLowerCase()} for a while?`
      : "Mm. I'm listening — keep going whenever you're ready.",
    emotion: 'curiosity',
    intensity: 'low',
    flag: 'none',
  };
}

/** Loose keyword overlap between a clinician's trigger phrase and the utterance. */
function matchesTrigger(trigger: string, text: string) {
  const words = trigger
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((word) => text.includes(word)).length;
  return hits >= 2;
}

/** Turns a clinician's third-person instruction into something speakable. */
function scriptToSpeech(script: string, prescription: Prescription) {
  const name = prescription.patient_profile.preferred_name;
  if (/4-?7-?8/.test(script)) {
    return `${name ? `${name}, ` : ''}let's slow this down together. Breathe in through your nose while I count to four. Hold it for seven. Now let it out slowly for eight. I'll count with you again.`;
  }
  if (/sketch|draw/i.test(script)) {
    return `Do you still have your sketchbook near you? Put something on — anything you like — and draw what it makes you feel. I'll stay right here while you do.`;
  }
  return script;
}
