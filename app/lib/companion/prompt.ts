import { fillScript, isScriptedPlan, SCRIPT_OPENING } from './script';
import { AGE_BANDS, CLINICAL_DIRECTIVES, type Prescription } from './types';

/**
 * Renders the prescription into the system prompt sent to the language model.
 *
 * The console shows this verbatim so a clinician can read exactly what their
 * care plan instructs the companion to do. Nothing is added here that the
 * clinician did not enter.
 */
export function buildSystemPrompt(prescription: Prescription): string {
  const { patient_profile: patient } = prescription;
  const { clinical_guardrails: guardrails } = prescription;
  const { prescribed_interventions: interventions } = prescription;
  const { avatar_persona: persona } = prescription;
  const { escalation_protocol: escalation } = prescription;

  const callThem = patient.preferred_name || patient.name || 'the patient';
  const band = AGE_BANDS.find((entry) => entry.value === patient.age_band);
  const directive = CLINICAL_DIRECTIVES.find(
    (entry) => entry.value === guardrails.clinical_directive,
  );

  const companion = persona.companions
    .map((slot) => slot.calledName)
    .filter(Boolean)
    .join(' and ');

  const lines: string[] = [];

  lines.push(
    `You are ${companion || 'a companion'}, a ${persona.relationship_dynamic.replace(/_/g, ' ')} speaking with ${callThem}.`,
    `You are not a therapist and not a clinician. You provide emotional companionship only.`,
    '',
    '## Who you are speaking with',
    `- Name to use out loud: ${callThem}`,
    `- Register: ${band ? `${band.label} — ${band.hint}` : patient.age_band}`,
  );

  if (patient.primary_presentation.length > 0) {
    lines.push(
      `- Presenting concerns: ${patient.primary_presentation.map(humanize).join(', ')}`,
    );
  }

  lines.push('', '## Your goal', guardrails.therapeutic_goal || '(not set)');

  if (directive) {
    lines.push(
      '',
      '## Clinical directive',
      `${directive.label.toUpperCase()} — ${directive.hint}`,
    );
  }

  if (guardrails.hard_boundaries.length > 0) {
    lines.push(
      '',
      '## Hard boundaries — never raise these, and never ask about them',
      ...guardrails.hard_boundaries.map((item) => `- ${item}`),
      'If the patient raises one of these themselves, stay with the feeling, do not pursue the detail, and do not ask a follow-up question about it.',
    );
  }

  if (guardrails.forbidden_actions.length > 0) {
    lines.push(
      '',
      '## Forbidden actions',
      ...guardrails.forbidden_actions.map((item) => `- ${item}`),
    );
  }

  if (guardrails.safe_anchors.length > 0) {
    lines.push(
      '',
      '## Safe anchors — return here when the conversation stalls',
      ...guardrails.safe_anchors.map((item) => `- ${item}`),
    );
  }

  if (interventions.approved_modalities.length > 0) {
    lines.push(
      '',
      '## Approved techniques',
      ...interventions.approved_modalities.map((item) => `- ${humanize(item)}`),
      'Use nothing outside this list.',
    );
  }

  if (interventions.custom_exercises.length > 0) {
    lines.push('', '## Prescribed exercises');
    for (const exercise of interventions.custom_exercises) {
      lines.push(
        `- WHEN ${exercise.trigger_condition} → ${exercise.action_script}`,
      );
    }
  }

  lines.push(
    '',
    '## Voice',
    `- Tone: ${persona.tone.join(', ') || 'warm'}`,
    `- ${persona.style_constraints || 'Keep responses short and conversational.'}`,
    '- One or two sentences per turn. Ask at most one question.',
  );

  lines.push('', '## Escalation');
  if (escalation.dashboard_alert_keywords.length > 0) {
    lines.push(
      `- Flag "distress" if the patient says anything like: ${escalation.dashboard_alert_keywords.join(', ')}.`,
    );
  }
  if (escalation.emergency_threshold) {
    lines.push(`- Flag "emergency" if: ${escalation.emergency_threshold}.`);
    if (escalation.emergency_action.break_character) {
      lines.push(
        `- On "emergency", stop playing the character. Say plainly that you are an AI, that you are staying with them, and share: ${escalation.emergency_action.provide_resource}.`,
      );
    }
    if (escalation.emergency_action.notify_guardian) {
      lines.push(
        `- On "emergency", the console alerts ${escalation.emergency_action.guardian_contact || 'the listed guardian'}. Tell the patient a real person is being asked to come.`,
      );
    }
  }

  lines.push(
    '',
    '## Response format',
    'Reply with JSON only:',
    '{ "say": string, "emotion": "caring"|"joy"|"curiosity"|"gratitude"|"admiration"|"realization"|"sadness", "intensity": "low"|"neutral"|"high", "flag": "none"|"distress"|"emergency" }',
  );

  return lines.join('\n');
}

function humanize(value: string) {
  return value.replace(/_/g, ' ');
}

/** The first thing the companion says, built from the plan's safe anchors. */
export function buildOpeningLine(prescription: Prescription): string {
  // The demo plan opens on its rehearsed line, which already carries the
  // clinician's name — that is what proves the avatar arrives knowing her.
  if (isScriptedPlan(prescription)) {
    return fillScript(SCRIPT_OPENING, prescription);
  }

  const name =
    prescription.patient_profile.preferred_name ||
    prescription.patient_profile.name ||
    'there';
  const anchor = prescription.clinical_guardrails.safe_anchors[0];
  const called = prescription.avatar_persona.companions[0]?.calledName;

  const greeting = called ? `Hey ${name}. It's ${called}.` : `Hey ${name}.`;

  if (anchor) {
    return `${greeting} I'm not going anywhere tonight. Want to just talk, or should we start with ${anchor.toLowerCase()}?`;
  }

  return `${greeting} I'm right here with you. How are you doing tonight?`;
}
