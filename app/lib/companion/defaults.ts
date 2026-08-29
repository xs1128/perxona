import type { Prescription } from './types';
import { KNOWN_AVATARS, KNOWN_SCENES } from '@/lib/perxona/catalog';

/*
 * Every preset below names one entry of `KNOWN_AVATARS` / `KNOWN_SCENES`. They
 * previously all pointed at one `.env.local` value, which is why choosing a
 * different companion or scene changed the label and nothing else.
 *
 * Deliberately NOT overridable from the environment: the catalog ID is also
 * the identity of the chip in the console, so an override that happened to
 * name another entry in the list produced two presets with the same ID —
 * duplicate React keys, two chips selected at once, and one avatar that could
 * never be picked. Another organization edits `KNOWN_AVATARS` instead.
 *
 * The Voice is a single value shared by every preset, so it has no such
 * collision and still reads from the environment.
 */
const ENV_VOICE = import.meta.env.VITE_PERXONA_VOICE_ID ?? '';

export type AvatarPreset = {
  id: string;
  name: string;
  blurb: string;
  /** Two stops for the placeholder portrait until real thumbnails exist. */
  gradient: [string, string];
  suggestedNames: string[];
  /** The Perxona catalog Avatar this preset renders. */
  avatarId: string;
  /** The catalog's own name for it, for anyone reconciling against Connect. */
  catalogName: string;
  voiceId: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'elder-sister',
    name: 'Sara',
    blurb: 'Older sister · warm, unhurried',
    gradient: ['#F2836B', '#F5B36B'],
    suggestedNames: ['Kakak', 'Sis', 'Sara'],
    avatarId: KNOWN_AVATARS[0].id,
    catalogName: KNOWN_AVATARS[0].name,
    voiceId: ENV_VOICE,
  },
  {
    id: 'grandmother',
    name: 'Nenek',
    blurb: 'Grandmother · slow, story-telling',
    gradient: ['#5FCDC0', '#8FE0C5'],
    suggestedNames: ['Nenek', 'Mama', 'Oma'],
    avatarId: KNOWN_AVATARS[1].id,
    catalogName: KNOWN_AVATARS[1].name,
    voiceId: ENV_VOICE,
  },
  {
    id: 'playmate',
    name: 'Pip',
    blurb: 'Playmate · bright, curious',
    gradient: ['#6C6FE8', '#8FA7F5'],
    suggestedNames: ['Pip', 'Kawan', 'Buddy'],
    avatarId: KNOWN_AVATARS[2].id,
    catalogName: KNOWN_AVATARS[2].name,
    voiceId: ENV_VOICE,
  },
];

export type ScenePreset = {
  id: string;
  name: string;
  hint: string;
  gradient: [string, string];
  /** The Perxona catalog Scene this preset renders. */
  sceneId: string;
};

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'lab',
    name: KNOWN_SCENES[0].name,
    hint: 'Cool light, clinical and bright',
    gradient: ['#1F4B58', '#2C6D7E'],
    sceneId: KNOWN_SCENES[0].id,
  },
  {
    id: 'valley',
    name: KNOWN_SCENES[1].name,
    hint: 'Warm daylight, open and calm',
    gradient: ['#2A6455', '#4E9A7C'],
    sceneId: KNOWN_SCENES[1].id,
  },
  {
    id: 'studio',
    name: KNOWN_SCENES[2].name,
    hint: 'Soft, indoor, quiet',
    gradient: ['#4A3F6B', '#6F5F9B'],
    sceneId: KNOWN_SCENES[2].id,
  },
];

/**
 * The hardcoded demo care plan. Loading it fills every field in the console,
 * which is what the presenter should do before walking on stage.
 */
export const MIA_PRESCRIPTION: Prescription = {
  patient_profile: {
    patient_id: 'P-84729',
    name: 'Mia Hartono',
    preferred_name: 'Mia',
    gender: 'female',
    age_band: 'teen',
    primary_presentation: [
      'acute_bereavement',
      'insomnia',
      'nighttime_anxiety',
    ],
  },
  clinical_guardrails: {
    therapeutic_goal:
      'De-escalate late-night anxiety, provide non-directive companionship, and bridge the gap until she can sleep.',
    hard_boundaries: [
      'Car accidents',
      'The night her parents died',
      'Hospital environments',
    ],
    clinical_directive: 'NON_DIRECTIVE_SUPPORT',
    forbidden_actions: [
      'Do not attempt cognitive restructuring',
      'Do not offer medical advice',
      'Do not force discussions about trauma',
    ],
    safe_anchors: [
      'Sketching',
      'Favorite bands/music',
      'Positive childhood memories',
    ],
  },
  prescribed_interventions: {
    approved_modalities: ['mindfulness_breathing', 'distraction_techniques'],
    custom_exercises: [
      {
        trigger_condition: 'Patient reports racing heart or panic',
        action_script:
          'Initiate 4-7-8 breathing exercise. Guide her through it step-by-step.',
      },
      {
        trigger_condition: 'Patient cannot sleep after 20 minutes of chat',
        action_script:
          'Prompt patient to get her sketchbook and draw how her favorite music makes her feel.',
      },
    ],
  },
  avatar_persona: {
    companions: [
      {
        presetId: AVATAR_PRESETS[0].id,
        calledName: 'Kak Sara',
        avatarId: AVATAR_PRESETS[0].avatarId,
        voiceId: AVATAR_PRESETS[0].voiceId,
      },
    ],
    sceneId: SCENE_PRESETS[0].sceneId,
    tone: ['warm', 'peer-like', 'gentle', 'observant'],
    relationship_dynamic: 'supportive_companion',
    style_constraints:
      'Avoid clinical jargon. Use short, conversational responses appropriate for a teenager.',
  },
  escalation_protocol: {
    dashboard_alert_keywords: [
      'heart hurting',
      'panic',
      "can't breathe",
      'crying',
      'hopeless',
    ],
    emergency_threshold:
      "Mentions of self-harm, extreme hopelessness, or statements like 'I don't want to wake up'",
    emergency_action: {
      break_character: true,
      provide_resource: 'Crisis Text Line (Text HOME to 741741)',
      notify_guardian: true,
      guardian_contact: 'Aunt_Mobile',
    },
  },
};

/**
 * Presets are looked up by the catalog ID the plan stores, not by the preset
 * slug beside it. The ID is what the Presenter is actually initialized with,
 * so resolving from it is what keeps the portrait honest about who is on stage.
 */
export function findAvatarPreset(avatarId: string) {
  return AVATAR_PRESETS.find((preset) => preset.avatarId === avatarId);
}

export function findScenePreset(sceneId: string) {
  return SCENE_PRESETS.find((preset) => preset.sceneId === sceneId);
}
