import type { PresentationResult, Region } from './types';

/**
 * The Presenter CDN and the Connect API must stay in the same region.
 * See `docs/perxona-connect-kit/03-integration-patterns.md`.
 */
export const PRESENTER_URLS: Record<Region, string> = {
  asia: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js',
  eu: 'https://cdn.perxona.ai/eu/prod/latest/widget/entry/presenter.js',
};

export function connectApiBaseUrl(region: Region) {
  return `https://console.perxona.ai/${region}/api/v1/connect`;
}

/** Presentation result codes from the 0.3.0 contract. */
export const RESULT_CODES: Record<number, string> = {
  0: 'OK',
  100: 'COMPONENT_UNMOUNTED',
  101: 'PRESENTER_NOT_READY',
  200: 'AUDIO_CONTEXT_UNAVAILABLE',
  300: 'VOICE_NOT_CONFIGURED',
  301: 'NOT_INITIALIZED',
  302: 'SPEECH_AUDIO_BUFFER_REQUIRED',
  303: 'PRESENTATION_INTERRUPTED',
  400: 'PRESENTATION_REQUEST_FAILED',
  900: 'NOT_IMPLEMENTED',
};

/** Turns an unsuccessful result into a message worth showing a human. */
export function describeResult(result: PresentationResult) {
  if (result.success) return null;
  const name = result.code === undefined ? null : RESULT_CODES[result.code];
  const hint =
    result.code === 300
      ? 'Add a Voice ID in Setup and launch again.'
      : result.code === 200
        ? 'Audio is locked. Interact with the page and retry.'
        : null;

  return [result.message, name && `(${name})`, hint]
    .filter(Boolean)
    .join(' ')
    .trim() || `Presentation failed with code ${result.code}`;
}

/**
 * Loads the regional Presenter module once and waits for the custom element to
 * be defined. The URL is configuration, not a credential.
 */
export async function loadPresenterRuntime(region: Region) {
  const selector = `script[data-perxona-presenter="${region}"]`;

  if (!document.querySelector<HTMLScriptElement>(selector)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = PRESENTER_URLS[region];
      script.dataset.perxonaPresenter = region;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Presenter engine failed to load from ${region}`));
      document.head.appendChild(script);
    });
  }

  await customElements.whenDefined('sv-presenter');
}

/* -------------------------------------------------------------------------- */
/* Motion Markup Language                                                      */
/* -------------------------------------------------------------------------- */

/** `[MOTION motion-id:priority]` with the optional `;face-id` extension. */
const MOTION_MARKUP = /\[MOTION\s+([^\s:\]]+):(\d+)(?:;([^\]]+))?\]/g;

export function motionMarkup(motionId: string, priority = 1) {
  return `[MOTION ${motionId}:${priority}]`;
}

export function extractMotionIds(content: string) {
  return [...content.matchAll(MOTION_MARKUP)].map((match) => match[1]);
}

/**
 * Strips motion tags whose ID is not in the selected Avatar's catalog.
 *
 * Motion IDs are avatar-specific, so generated text must never reach
 * `present()` with unvalidated markup.
 */
export function sanitizeMotionMarkup(
  content: string,
  allowedMotionIds: Iterable<string>,
) {
  const allowed = new Set(allowedMotionIds);
  const rejected: string[] = [];

  const sanitized = content
    .replace(MOTION_MARKUP, (tag, motionId: string) => {
      if (allowed.has(motionId)) return tag;
      rejected.push(motionId);
      return '';
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return { sanitized, rejected };
}
