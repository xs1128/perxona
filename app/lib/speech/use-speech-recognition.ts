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
  maxAlternatives: number;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable';

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionLike;
  available?: (options: {
    langs: string[];
    processLocally: boolean;
  }) => Promise<SpeechRecognitionAvailability>;
  install?: (options: {
    langs: string[];
    processLocally: boolean;
  }) => Promise<boolean>;
};

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

/**
 * `no-speech` and `aborted` are how the engine reports ordinary silence and a
 * deliberate stop. Showing them as failures makes a working microphone look
 * broken, so they end the turn quietly instead.
 */
const BENIGN_ERRORS = new Set(['no-speech', 'aborted']);
const NETWORK_RETRY_LIMIT = 2;

/**
 * Chrome can recognize on-device when its language pack is installed. Prefer
 * that path because hosted pages otherwise depend on the browser vendor's
 * remote recognition service, which is what reports the `network` error.
 */
async function prepareOnDeviceRecognition(
  Recognition: SpeechRecognitionConstructor,
  lang: string,
) {
  if (!Recognition.available) return false;

  try {
    const availability = await Recognition.available({
      langs: [lang],
      processLocally: true,
    });

    if (availability === 'available') return true;
    if (availability === 'unavailable' || !Recognition.install) return false;

    return await Recognition.install({
      langs: [lang],
      processLocally: true,
    });
  } catch {
    // Older implementations may expose part of the local API but reject the
    // availability request. Their cloud recognizer remains a valid fallback.
    return false;
  }
}

function describeError(code: string) {
  switch (code) {
    case 'not-allowed':
      return 'Microphone permission denied. Allow it in the address bar and press Talk again.';
    case 'service-not-allowed':
      return 'The browser refused speech recognition. It needs an https:// page or localhost.';
    case 'network':
      return 'Speech recognition lost its network connection. Check the connection and try again.';
    case 'audio-capture':
      return 'No microphone was found.';
    default:
      return `Speech recognition error: ${code}`;
  }
}

export type SpeechRecognitionOptions = {
  lang?: string;
  /**
   * Drops whatever is heard while true — used while the avatar is speaking so
   * its own voice out of the speakers is not transcribed back as the patient.
   */
  paused?: boolean;
  /** Called once per finalized utterance. */
  onResult?: (transcript: string) => void;
};

export function useSpeechRecognition({
  lang = 'en-US',
  paused = false,
  onResult,
}: SpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const pausedRef = useRef(paused);

  /*
   * Chrome ends a recognition session on its own after a few seconds of
   * silence, even with `continuous`. `wantedRef` is the user's intent, which
   * outlives any single session, so `onend` can restart transparently.
   */
  const wantedRef = useRef(false);
  const restartsRef = useRef(0);
  const networkRetriesRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingModeRef = useRef<'unknown' | 'local' | 'remote'>('unknown');

  /** Lets a session's `onend` relaunch without `launch` referring to itself. */
  const launchRef = useRef<() => Promise<boolean>>(async () => false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Read once on the client without a hydration mismatch: the server always
  // reports unsupported, and the client resubscribes with the real answer.
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => getConstructor() !== null,
    () => false,
  );

  const [listening, setListening] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const launch = useCallback(async () => {
    if (recognitionRef.current) return true;

    const Recognition = getConstructor();
    if (!Recognition) {
      setPreparing(false);
      setError('This browser has no speech recognition support');
      return false;
    }

    setPreparing(true);

    if (processingModeRef.current === 'unknown') {
      const local = await prepareOnDeviceRecognition(Recognition, lang);
      processingModeRef.current = local ? 'local' : 'remote';
    }

    // The user may release Talk while a language pack is being prepared.
    if (!wantedRef.current) {
      setPreparing(false);
      return true;
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    // Push-to-talk is made of short sessions. Ending after an utterance avoids
    // keeping a fragile remote recognition stream open unnecessarily; onend
    // starts another short session if the user is still holding the control.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    if (processingModeRef.current === 'local') {
      recognition.processLocally = true;
    }

    recognition.onstart = () => {
      if (!wantedRef.current) {
        recognition.stop();
        return;
      }
      setPreparing(false);
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let pending = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += text;
        else pending += text;
      }

      if (pausedRef.current) {
        setInterim('');
        return;
      }

      setInterim(pending);

      if (finalText.trim()) {
        restartsRef.current = 0;
        networkRetriesRef.current = 0;
        setError(null);
        setInterim('');
        setTranscript(finalText.trim());
        onResultRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      if (BENIGN_ERRORS.has(event.error)) return;

      if (
        event.error === 'network' &&
        wantedRef.current &&
        processingModeRef.current === 'remote' &&
        networkRetriesRef.current < NETWORK_RETRY_LIMIT
      ) {
        networkRetriesRef.current += 1;
        setError('Speech service interrupted — reconnecting…');
        return;
      }

      // Permission, device, and persistent service failures need user action.
      wantedRef.current = false;
      setError(describeError(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setPreparing(false);
      setInterim('');

      if (!wantedRef.current) {
        setListening(false);
        return;
      }

      /*
       * Guard against a session that ends the instant it starts — without a
       * ceiling a permanently failing engine would restart forever.
       */
      restartsRef.current += 1;
      if (restartsRef.current > 5) {
        wantedRef.current = false;
        setListening(false);
        setError('The microphone kept dropping. Press Talk to try again.');
        return;
      }

      restartTimerRef.current = setTimeout(
        () => {
          if (wantedRef.current) void launchRef.current();
        },
        networkRetriesRef.current > 0
          ? 400 * 2 ** (networkRetriesRef.current - 1)
          : 250,
      );
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      // `start()` throws if a session is somehow still running; abandon it.
      recognitionRef.current = null;
      wantedRef.current = false;
      setPreparing(false);
      setListening(false);
      setError('Could not start the microphone');
      return false;
    }
  }, [lang]);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const start = useCallback(() => {
    if (wantedRef.current) return;
    wantedRef.current = true;
    restartsRef.current = 0;
    networkRetriesRef.current = 0;
    setError(null);
    setPreparing(true);
    void launch()
      .then((started) => {
        if (!started) wantedRef.current = false;
      })
      .catch(() => {
        wantedRef.current = false;
        setPreparing(false);
        setListening(false);
        setError('Could not start the microphone');
      });
  }, [launch]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    setPreparing(false);
    setListening(false);
    setInterim('');
    recognitionRef.current?.stop();
  }, []);

  useEffect(
    () => () => {
      wantedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognitionRef.current?.abort();
    },
    [],
  );

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return {
    supported,
    preparing,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  };
}
