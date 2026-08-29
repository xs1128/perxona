import type { Prescription } from './types';

/*
 * Catalog IDs are organization-specific, so the presets below read from the
 * ignored `.env.local` and degrade to an empty string when a value is absent.
 * An empty avatar or scene ID keeps the console usable in rehearsal mode; only
 * a live session requires the real values.
 */
const ENV_AVATAR = import.meta.env.VITE_PERXONA_AVATAR_ID ?? '';
const ENV_SCENE = import.meta.env.VITE_PERXONA_SCENE_ID ?? '';
const ENV_VOICE = import.meta.env.VITE_PERXONA_VOICE_ID ?? '';

export type AvatarPreset = {
  id: string;
  name: string;
  blurb: string;
  /** Two stops for the placeholder portrait until real thumbnails exist. */
  gradient: [string, string];
  suggestedNames: string[];
  avatarId: string;
  voiceId: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'elder-sister',
    name: 'Sara',
    blurb: 'Older sister · warm, unhurried',
    gradient: ['#F2836B', '#F5B36B'],
    suggestedNames: ['Kakak', 'Sis', 'Sara'],
    avatarId: ENV_AVATAR,
    voiceId: ENV_VOICE,
  },
  {
    id: 'elder-brother',
    name: 'Adam',
    blurb: 'Older brother · steady, plain-spoken',
    gradient: ['#6C6FE8', '#8FA7F5'],
    suggestedNames: ['Abang', 'Bro', 'Adam'],
    avatarId: ENV_AVATAR,
    voiceId: ENV_VOICE,
  },
  {
    id: 'grandmother',
    name: 'Nenek',
    blurb: 'Grandmother · slow, story-telling',
    gradient: ['#5FCDC0', '#8FE0C5'],
    suggestedNames: ['Nenek', 'Mama', 'Oma'],
    avatarId: ENV_AVATAR,
    voiceId: ENV_VOICE,
  },
  {
    id: 'grandfather',
    name: 'Atok',
    blurb: 'Grandfather · calm, patient',
    gradient: ['#F5C563', '#EFA45B'],
    suggestedNames: ['Atok', 'Papa', 'Opa'],
    avatarId: ENV_AVATAR,
    voiceId: ENV_VOICE,
  },
];

export type ScenePreset = {
  id: string;
  name: string;
  hint: string;
  gradient: [string, string];
  sceneId: string;
};

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'bedroom',
    name: 'Bedroom',
    hint: 'Low light, for night sessions',
    gradient: ['#1F4B58', '#2C6D7E'],
    sceneId: ENV_SCENE,
  },
  {
    id: 'garden',
    name: 'Garden',
    hint: 'Daylight, open and calm',
    gradient: ['#2A6455', '#4E9A7C'],
    sceneId: ENV_SCENE,
  },
  {
    id: 'reading-room',
    name: 'Reading room',
    hint: 'Soft, indoor, quiet',
    gradient: ['#4A3F6B', '#6F5F9B'],
    sceneId: ENV_SCENE,
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
        presetId: 'elder-sister',
        calledName: 'Kak Sara',
        avatarId: ENV_AVATAR,
        voiceId: ENV_VOICE,
      },
    ],
    sceneId: 'bedroom',
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

export function findAvatarPreset(id: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === id);
}

export function findScenePreset(id: string) {
  return SCENE_PRESETS.find((preset) => preset.id === id);
}
