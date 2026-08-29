'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * Push-to-talk microphone input.
 *
 * Perxona Connect Kit has no speech-to-text surface, so voice input comes from
 * the browser's Web Speech API. Support is uneven — Chrome and Safari ship it,
 * Firefox does not — so always check `supported` before offering the control.
 *
 * The DOM lib does not declare `SpeechRecognition`, only its result types.
 */
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Support never changes during a session, so the store never notifies. */
function subscribeToNothing() {
  return () => {};
}

export type SpeechRecognitionOptions = {
  lang?: string;
  /** Called once per finalized utterance. */
  onResult?: (transcript: string) => void;
};

export function useSpeechRecognition({
  lang = 'en-US',
  onResult,
}: SpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Read once on the client without a hydration mismatch: the server always
  // reports unsupported, and the client resubscribes with the real answer.
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => getConstructor() !== null,
    () => false,
  );

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback(() => {
    if (recognitionRef.current) return;

    const Recognition = getConstructor();
    if (!Recognition) {
      setError('This browser has no speech recognition support');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let pending = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += text;
        else pending += text;
      }

      setInterim(pending);

      if (finalText.trim()) {
        setTranscript((current) => `${current} ${finalText}`.trim());
        onResultRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied'
          : `Speech recognition error: ${event.error}`,
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    setError(null);
    setListening(true);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError('Could not start the microphone');
    }
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
