/**
 * The care plan a clinician writes before handing the tablet to the patient.
 *
 * The shape mirrors the agreed prescription JSON one-to-one so the object the
 * form produces can be sent to the language model without a translation step.
 */

export type Gender = 'male' | 'female' | 'unspecified';

/** Age is captured as a band, never a number — it only tunes register. */
export type AgeBand = 'child' | 'teen' | 'adult' | 'senior';

export type ClinicalDirective =
  | 'NON_DIRECTIVE_SUPPORT'
  | 'GUIDED_REFLECTION'
  | 'DISTRACTION_FIRST'
  | 'SLEEP_WIND_DOWN';

export type PatientProfile = {
  patient_id: string;
  name: string;
  /** What the companion says out loud. Falls back to `name` when empty. */
  preferred_name: string;
  gender: Gender;
  age_band: AgeBand;
  primary_presentation: string[];
};

export type ClinicalGuardrails = {
  therapeutic_goal: string;
  hard_boundaries: string[];
  clinical_directive: ClinicalDirective;
  forbidden_actions: string[];
  safe_anchors: string[];
};

export type CustomExercise = {
  trigger_condition: string;
  action_script: string;
};

export type PrescribedInterventions = {
  approved_modalities: string[];
  custom_exercises: CustomExercise[];
};

/** One Perxona target plus the role the patient is told it plays. */
export type CompanionSlot = {
  presetId: string;
  /** "Papa", "Mama", "Kak Sara" — the name the patient uses. */
  calledName: string;
  avatarId: string;
  voiceId: string;
};

export type AvatarPersona = {
  /** One or two companions. The doctor decides. */
  companions: CompanionSlot[];
  sceneId: string;
  tone: string[];
  relationship_dynamic: string;
  style_constraints: string;
};

export type EmergencyAction = {
  break_character: boolean;
  provide_resource: string;
  notify_guardian: boolean;
  guardian_contact: string;
};

export type EscalationProtocol = {
  dashboard_alert_keywords: string[];
  emergency_threshold: string;
  emergency_action: EmergencyAction;
};

export type Prescription = {
  patient_profile: PatientProfile;
  clinical_guardrails: ClinicalGuardrails;
  prescribed_interventions: PrescribedInterventions;
  avatar_persona: AvatarPersona;
  escalation_protocol: EscalationProtocol;
};

/* -------------------------------------------------------------------------- */
/* Presentation metadata for the form controls                                 */
/* -------------------------------------------------------------------------- */

export const AGE_BANDS: Array<{
  value: AgeBand;
  label: string;
  hint: string;
}> = [
  {
    value: 'child',
    label: 'Child',
    hint: 'Short words, playful, lots of praise',
  },
  {
    value: 'teen',
    label: 'Teen',
    hint: 'Peer-like, never talks down, no jargon',
  },
  { value: 'adult', label: 'Adult', hint: 'Direct, respectful, unhurried' },
  {
    value: 'senior',
    label: 'Senior',
    hint: 'Slow pace, warm, memory-friendly',
  },
];

export const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Not specified' },
];

export const CLINICAL_DIRECTIVES: Array<{
  value: ClinicalDirective;
  label: string;
  hint: string;
}> = [
  {
    value: 'NON_DIRECTIVE_SUPPORT',
    label: 'Non-directive support',
    hint: 'Follow the patient. Never steer toward a topic.',
  },
  {
    value: 'GUIDED_REFLECTION',
    label: 'Guided reflection',
    hint: 'Gently invite the patient to name what they feel.',
  },
  {
    value: 'DISTRACTION_FIRST',
    label: 'Distraction first',
    hint: 'Lead with anchors and play before feelings.',
  },
  {
    value: 'SLEEP_WIND_DOWN',
    label: 'Sleep wind-down',
    hint: 'Lower arousal, lengthen pauses, head toward rest.',
  },
];
