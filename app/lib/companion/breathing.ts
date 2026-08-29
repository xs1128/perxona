/**
 * Breathing patterns, read out of the clinician's own words.
 *
 * A care plan writes an exercise as prose — "Initiate 4-7-8 breathing
 * exercise" — so the counts the patient sees on screen are parsed back out of
 * that instruction rather than hardcoded here. A clinician who prescribes
 * 5-5-5 gets a 5-5-5 guide without anyone touching this file.
 */

export type BreathingPattern = {
  /** Seconds. */
  inhale: number;
  hold: number;
  exhale: number;
};

/** Beyond this a "pattern" is more likely a date or a dose than a count. */
const MAX_PHASE_SECONDS = 20;

const PATTERN = /(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})/;

export function parseBreathingPattern(
  actionScript: string,
): BreathingPattern | null {
  if (!/breath/i.test(actionScript)) return null;

  const match = PATTERN.exec(actionScript);
  if (!match) return null;

  const [inhale, hold, exhale] = match.slice(1, 4).map(Number);

  const sane = [inhale, hold, exhale].every(
    (seconds) => seconds > 0 && seconds <= MAX_PHASE_SECONDS,
  );
  if (!sane) return null;

  return { inhale, hold, exhale };
}
