import type {
  PresentationEmotion,
  PresentationIntensity,
} from '@/lib/perxona/types';
import type { Prescription } from './types';

/**
 * The rehearsed demo conversation.
 *
 * The pitch is judged on whether Mia can simply speak and be answered, so the
 * five minutes on stage cannot depend on a language model choosing well in
 * front of an audience. Each beat below pairs a line the presenter says out
 * loud with the exact turn the companion gives back.
 *
 * Matching is deliberately loose. Speech recognition rarely returns the line
 * verbatim — it drops words, mishears names, and punctuates at random — so a
 * beat fires on keyword overlap rather than on the sentence itself.
 *
 * Everything here is stage direction only. The safety layer in `safety.ts`
 * still runs first and still wins, which is why the emergency beat carries no
 * script of its own.
 */

/** Only the packaged demo plan is scripted; an edited plan falls through. */
export const SCRIPT_PATIENT_ID = 'P-84729';

/** The clinician named in the story. No field on the plan holds this. */
const CLINICIAN = 'Dr. Lin';

export type ScriptBeat = {
  id: string;
  /** The line the presenter says. Shown on the cue card, never spoken by us. */
  cue: string;
  /**
   * Lowercase words or short phrases. A beat fires when at least `minHits` of
   * them appear in what was heard, so a half-caught sentence still lands.
   */
  keywords: string[];
  minHits: number;
  /**
   * Phrases distinctive enough to fire the beat on their own, for when the
   * presenter says only half the line or the engine swallows the rest.
   */
  anchors: string[];
  /** The companion's reply. `{name}`, `{companion}` and `{clinician}` fill in. */
  say: string;
  emotion: PresentationEmotion;
  intensity: PresentationIntensity;
  flag: 'none' | 'distress' | 'emergency';
  /** The prescribed exercise this beat is meant to demonstrate firing. */
  firedExercise?: string;
  /** A note for the presenter — what this beat is proving to the judges. */
  beat: string;
};

/** Spoken before Mia says anything, so the avatar opens the conversation. */
export const SCRIPT_OPENING =
  "Hey {name}, it's {companion}. {clinician} told me the nights have been the hardest part lately. We don't have to talk about anything serious tonight — do you want to keep me company for a bit?";

export const DEMO_SCRIPT: ScriptBeat[] = [
  {
    id: 'cant-sleep',
    cue: "I can't sleep. I keep thinking about my parents.",
    keywords: [
      'sleep',
      'asleep',
      'awake',
      'parents',
      'mum',
      'mom',
      'mother',
      'dad',
      'father',
      'think',
      'thinking',
      'miss',
    ],
    minHits: 2,
    anchors: ["can't sleep", 'cant sleep', 'cannot sleep', 'my parents'],
    say: 'That sounds like a heavy night. {clinician} told me that remembering the small good things settles you a little — is there one thing about them you never want to forget?',
    emotion: 'caring',
    intensity: 'high',
    flag: 'none',
    beat: 'The avatar already knows her. Patient context, not a generic chatbot.',
  },
  {
    id: 'dad-sang',
    cue: 'My dad used to sing really loudly in the car. He was so bad at it.',
    keywords: [
      'dad',
      'father',
      'sing',
      'sang',
      'singing',
      'song',
      'car',
      'driving',
      'loud',
      'loudly',
      'terrible',
      'bad',
    ],
    minHits: 2,
    anchors: ['in the car', 'used to sing', 'he was so bad'],
    say: 'That sounds like a funny memory, and maybe a little bit sad to hold now. What did he sing the most?',
    emotion: 'caring',
    intensity: 'neutral',
    flag: 'none',
    beat: 'Names both feelings instead of returning a correct sentence. Interaction, not information.',
  },
  {
    id: 'jay-chou',
    cue: 'Jay Chou. Every single time.',
    keywords: [
      'jay',
      'chou',
      'every',
      'single',
      'time',
      'always',
      'song',
      'favourite',
      'favorite',
    ],
    minHits: 2,
    anchors: ['jay chou', 'jay chow', 'jay zhou', 'every single time'],
    say: 'Every single time. I bet you knew the words better than he did — does that still make you smile, or does it ache a bit tonight?',
    emotion: 'joy',
    intensity: 'neutral',
    flag: 'none',
    beat: 'Stays with the singing and never asks about the accident — a hard boundary held live.',
  },
  {
    id: 'racing-heart',
    cue: 'Both, I think. My heart is beating really fast.',
    keywords: [
      'heart',
      'beating',
      'racing',
      'fast',
      'chest',
      'breathe',
      'breathing',
      'panic',
      'scared',
      'anxious',
      'both',
    ],
    minHits: 2,
    anchors: ['my heart', 'heart is beating', 'racing heart', 'beating fast'],
    say: "Both is allowed, {name}. Let's slow it down together — breathe in through your nose while I count to four, hold it for seven, and let it out slowly for eight. I'll count with you again.",
    emotion: 'caring',
    intensity: 'high',
    flag: 'distress',
    firedExercise: 'Patient reports racing heart or panic',
    beat: "{clinician}'s prescribed exercise fires on its trigger, and the dashboard flags distress.",
  },
  {
    id: 'still-awake',
    cue: "That helped. I'm still awake though.",
    keywords: [
      'helped',
      'help',
      'better',
      'calmer',
      'still',
      'awake',
      'sleep',
      'tired',
    ],
    minHits: 2,
    anchors: ['still awake', 'that helped', 'it helped'],
    say: "That's okay, we don't have to fix the whole night. Do you still have your sketchbook by your bed? Put one of his songs on, draw what it makes you feel, and I'll stay right here.",
    emotion: 'caring',
    intensity: 'low',
    flag: 'none',
    firedExercise: 'Patient cannot sleep after 20 minutes of chat',
    beat: 'The second prescribed exercise, reached through a safe anchor she gave us herself.',
  },
  {
    id: 'escalation',
    cue: "Sometimes I feel like I don't want to wake up.",
    keywords: ['wake up', 'want to die', 'point', 'disappear', 'hurt myself'],
    minHits: 1,
    anchors: ["don't want to wake up", 'dont want to wake up'],
    // The reply is produced by `emergencyScript`, not written here, so the
    // demo shows the real escalation path rather than a rehearsed imitation.
    say: '',
    emotion: 'caring',
    intensity: 'high',
    flag: 'emergency',
    beat: 'OPTIONAL. The safety layer breaks character, names the resource, and wakes a human.',
  },
];

/** True when the loaded plan is the packaged Mia demo. */
export function isScriptedPlan(prescription: Prescription) {
  return prescription.patient_profile.patient_id === SCRIPT_PATIENT_ID;
}

/** Fills the plan's own names into a scripted line. */
export function fillScript(text: string, prescription: Prescription) {
  const patient = prescription.patient_profile;
  return text
    .replaceAll('{name}', patient.preferred_name || patient.name || 'there')
    .replaceAll(
      '{companion}',
      prescription.avatar_persona.companions[0]?.calledName || 'me',
    )
    .replaceAll('{clinician}', CLINICIAN);
}

/**
 * Normalizes a transcript for matching: punctuation and smart quotes become
 * spaces, and the result is padded so ` word ` tests need no regex.
 */
function normalize(text: string) {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()} `;
}

/**
 * Picks the beat a transcript belongs to, ignoring beats already played.
 *
 * Beats are not forced into order — the strongest keyword overlap wins, and
 * the earliest beat breaks a tie — so a skipped or reordered line still lands
 * on the right reply.
 */
/** Enough that an anchored beat always outscores a keyword-only one. */
const ANCHOR_WEIGHT = 100;

export function matchScriptBeat(
  utterance: string,
  played: ReadonlySet<string>,
): ScriptBeat | null {
  const haystack = normalize(utterance);

  let best: ScriptBeat | null = null;
  let bestScore = 0;

  for (const beat of DEMO_SCRIPT) {
    if (played.has(beat.id)) continue;

    const hits = beat.keywords.filter((keyword) =>
      haystack.includes(` ${keyword} `),
    ).length;
    const anchored = beat.anchors.some((anchor) =>
      haystack.includes(` ${anchor} `),
    );

    // An anchor outranks any amount of loose keyword overlap.
    const score = anchored ? hits + ANCHOR_WEIGHT : hits;

    if ((anchored || hits >= beat.minHits) && score > bestScore) {
      best = beat;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Replays the turns so far to work out which beats are spent.
 *
 * The companion's turn is derived rather than stored, which keeps `respond`
 * free of session state; a skipped beat is marked spent alongside the one
 * that fired so the cue card never points backwards.
 */
export function playedBeats(history: readonly string[]): Set<string> {
  const played = new Set<string>();

  for (const utterance of history) {
    const beat = matchScriptBeat(utterance, played);
    if (!beat) continue;
    const index = DEMO_SCRIPT.indexOf(beat);
    for (let i = 0; i <= index; i += 1) played.add(DEMO_SCRIPT[i].id);
  }

  return played;
}

/** The next line the presenter should say. */
export function nextScriptBeat(played: ReadonlySet<string>): ScriptBeat | null {
  return DEMO_SCRIPT.find((beat) => !played.has(beat.id)) ?? null;
}
