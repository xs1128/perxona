import { REPLY_EMOTIONS, buildSystemPrompt } from '@/lib/companion/prompt';
import type { Prescription } from '@/lib/companion/types';
import type {
  PresentationEmotion,
  PresentationIntensity,
} from '@/lib/perxona/types';

/**
 * The companion's brain, kept on the server because the Gemini key is a
 * secret. The browser posts the prescription, the patient's utterance, and the
 * conversation so far; this route assembles the system prompt, calls the
 * model, and hands back one validated turn. Any failure is reported as an
 * error status so the client can fall back to its local script.
 */

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

/** The latest stable Flash model; override with GEMINI_MODEL in `.env`. */
const DEFAULT_MODEL = 'gemini-3.7-flash';

const INTENSITIES = ['low', 'neutral', 'high'] as const;
const FLAGS = ['none', 'distress', 'emergency'] as const;

type CompanionRequestBody = {
  prescription?: Prescription;
  utterance?: string;
  /** Alternating turns — patient, companion, patient… — newest last. */
  history?: string[];
};

/** Keeps a long session from growing the request without bound. */
const MAX_HISTORY_TURNS = 20;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Accepts only what the schema promised, so a stray value cannot reach the avatar. */
function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError(
      'GEMINI_API_KEY is not set. Add it to .env and restart the dev server.',
      503,
    );
  }

  let body: CompanionRequestBody;
  try {
    body = (await request.json()) as CompanionRequestBody;
  } catch {
    return jsonError('The request body must be JSON', 400);
  }

  const { prescription, utterance, history } = body;
  if (!prescription || typeof utterance !== 'string' || !utterance.trim()) {
    return jsonError('prescription and utterance are required', 400);
  }

  /*
   * History alternates patient/companion, which maps onto the API's
   * user/model roles by position. The current utterance is the final turn.
   */
  const priorTurns = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY_TURNS)
    .map((text, index) => ({
      role: index % 2 === 0 ? 'user' : 'model',
      parts: [{ text }],
    }));

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_API}/${process.env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(prescription) }],
          },
          contents: [...priorTurns, { role: 'user', parts: [{ text: utterance }] }],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                say: { type: 'string' },
                emotion: { type: 'string', enum: [...REPLY_EMOTIONS] },
                intensity: { type: 'string', enum: [...INTENSITIES] },
                flag: { type: 'string', enum: [...FLAGS] },
              },
              required: ['say', 'emotion', 'intensity', 'flag'],
            },
          },
        }),
      },
    );
  } catch {
    return jsonError('Could not reach the Gemini API', 502);
  }

  if (!response.ok) {
    return jsonError(`Gemini responded with ${response.status}`, 502);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text ?? '') as Record<string, unknown>;
  } catch {
    return jsonError('The model reply was not valid JSON', 502);
  }

  const say = typeof parsed.say === 'string' ? parsed.say.trim() : '';
  if (!say) return jsonError('The model reply had nothing to say', 502);

  return Response.json({
    reply: {
      say,
      emotion: pick<PresentationEmotion>(
        parsed.emotion,
        REPLY_EMOTIONS,
        'caring',
      ),
      intensity: pick<PresentationIntensity>(
        parsed.intensity,
        INTENSITIES,
        'neutral',
      ),
      flag: pick(parsed.flag, FLAGS, 'none'),
    },
  });
}
