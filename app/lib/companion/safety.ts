import type { Prescription } from './types';

export type SafetyLevel = 'none' | 'distress' | 'emergency';

export type SafetySignal = {
  level: SafetyLevel;
  /** The phrase that matched, for the clinician dashboard. */
  matched: string[];
};

/*
 * A deliberately blunt keyword pass over what the patient said. It runs before
 * the model call so a flag is raised even if the model misses it, and it never
 * replaces clinical judgement — it only wakes a human up faster.
 */
const EMERGENCY_PATTERNS = [
  'kill myself',
  'end it',
  'want to die',
  "don't want to wake up",
  'dont want to wake up',
  'hurt myself',
  'cut myself',
  'no point',
  'better off without me',
  'disappear forever',
];

export function scanPatientUtterance(
  text: string,
  prescription: Prescription,
): SafetySignal {
  const haystack = text.toLowerCase();

  const emergency = EMERGENCY_PATTERNS.filter((pattern) =>
    haystack.includes(pattern),
  );
  if (emergency.length > 0) return { level: 'emergency', matched: emergency };

  const distress =
    prescription.escalation_protocol.dashboard_alert_keywords.filter(
      (keyword) => keyword && haystack.includes(keyword.toLowerCase()),
    );
  if (distress.length > 0) return { level: 'distress', matched: distress };

  return { level: 'none', matched: [] };
}

/**
 * Last line of defence on the model's output. A boundary the clinician wrote
 * must never be spoken back to the patient, whatever the model produced.
 */
export function violatesBoundary(
  reply: string,
  prescription: Prescription,
): string | null {
  const haystack = reply.toLowerCase();
  for (const boundary of prescription.clinical_guardrails.hard_boundaries) {
    const term = boundary.trim().toLowerCase();
    if (term.length > 3 && haystack.includes(term)) return boundary;
  }
  return null;
}

/** What the companion says when it must break character. */
export function emergencyScript(prescription: Prescription): string {
  const { emergency_action: action } = prescription.escalation_protocol;
  const name =
    prescription.patient_profile.preferred_name ||
    prescription.patient_profile.name ||
    '';

  const parts = [
    name
      ? `${name}, I want to stop pretending for a second.`
      : 'I want to stop pretending for a second.',
    "I'm an AI, and what you just said matters too much for me to be the only one hearing it.",
  ];

  if (action.provide_resource) {
    parts.push(`If you need someone right now: ${action.provide_resource}.`);
  }
  if (action.notify_guardian) {
    parts.push(
      "I'm letting a real person know, and I'm staying here with you.",
    );
  }

  return parts.join(' ');
}
