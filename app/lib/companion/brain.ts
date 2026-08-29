import { buildSystemPrompt } from './prompt';
import {
  emergencyScript,
  scanPatientUtterance,
  violatesBoundary,
} from './safety';
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
 * The turn comes from Gemini Flash through `/api/companion`, which assembles
 * the system prompt from the prescription and keeps the key server-side.
 * `localReply` stays as the fallback — a rehearsed, on-script answer keeps the
 * session alive when the key is missing, the network drops, or the model
 * returns something unusable.
 */
export async function respond(
  prescription: Prescription,
  utterance: string,
  history: string[],
): Promise<CompanionReply> {
  const signal = scanPatientUtterance(utterance, prescription);

  // The emergency script is local on purpose: it must fire word-for-word even
  // when the model is unreachable.
  if (signal.level === 'emergency') {
    return {
      say: emergencyScript(prescription),
      emotion: 'caring',
      intensity: 'high',
      flag: 'emergency',
    };
  }

  const reply =
    (await askModel(prescription, utterance, history)) ??
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

/** Exposed so the console can show the exact prompt the model gets. */
export { buildSystemPrompt };

/** Long enough for a Flash turn, short enough that "Thinking" never hangs. */
const MODEL_TIMEOUT_MS = 15_000;

/**
 * One turn from the model, or null for any failure — a missing key, a network
 * drop, a timeout, a malformed reply — so the caller can fall back seamlessly.
 */
async function askModel(
  prescription: Prescription,
  utterance: string,
  history: string[],
): Promise<CompanionReply | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const response = await fetch('/api/companion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prescription, utterance, history }),
      signal: controller.signal,
    });
    if (!response.ok) {
      /*
       * The scripted fallback below is seamless by design, which also hides
       * config problems — a depleted-key 429 looks identical to a working
       * model. Say why the fallback fired, so the browser console tells the
       * truth the avatar cannot.
       */
      const { error } = (await response
        .json()
        .catch(() => ({}))) as { error?: string };
      console.warn(
        `Companion model call failed (${response.status}): ${error ?? 'unknown error'} — using scripted reply`,
      );
      return null;
    }

    const { reply } = (await response.json()) as { reply?: CompanionReply };
    if (
      !reply?.say?.trim() ||
      !reply.emotion ||
      !reply.intensity ||
      !reply.flag
    ) {
      return null;
    }

    return { ...reply, say: reply.say.trim() };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

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
