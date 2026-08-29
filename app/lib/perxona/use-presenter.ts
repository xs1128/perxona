'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { describeResult, loadPresenterRuntime } from './presenter';
import type {
  AssetProgress,
  CameraAngle,
  CameraFOV,
  PerformanceState,
  PresentOptions,
  PresentationResult,
  PresentationTarget,
  PresenterElement,
  PresenterStatus,
  Region,
} from './types';

export type PresenterPhase = 'idle' | 'connecting' | 'live' | 'error';

export type PresenterState = {
  phase: PresenterPhase;
  status: PresenterStatus;
  performanceState: PerformanceState;
  /** Text currently being spoken, from `PLAYING_SPEECH_TEXT`. */
  caption: string;
  progress: AssetProgress | null;
  audioState: AudioContextState | null;
  error: string | null;
  muted: boolean;
  cameraAngle: CameraAngle;
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
};

const INITIAL_STATE: PresenterState = {
  phase: 'idle',
  status: 'Uninitialized',
  performanceState: 'Idle',
  caption: '',
  progress: null,
  audioState: null,
  error: null,
  muted: false,
  cameraAngle: 'fullbody',
  listening: false,
  thinking: false,
  speaking: false,
};

/*
 * Event payload field names are not published in the handbook, so every reader
 * below accepts the plausible shapes and falls back to a bare string detail.
 */
function detailOf(event: Event) {
  return (event as CustomEvent<unknown>).detail;
}

function readStringDetail(event: Event, ...keys: string[]) {
  const detail = detailOf(event);
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') {
    for (const key of keys) {
      const value = (detail as Record<string, unknown>)[key];
      if (typeof value === 'string') return value;
    }
  }
  return '';
}

function readProgress(event: Event): AssetProgress | null {
  const detail = detailOf(event);
  if (!detail || typeof detail !== 'object') return null;
  const record = detail as Record<string, unknown>;
  const asset = record.asset ?? record.assetType ?? record.type;
  const percentage = record.percentage ?? record.percent ?? record.progress;
  if (typeof percentage !== 'number') return null;
  return {
    asset: typeof asset === 'string' ? asset : 'Asset',
    percentage: Math.max(0, Math.min(100, Math.round(percentage))),
  };
}

/**
 * Owns the `<sv-presenter>` element, its event wiring, and every method on the
 * 0.3.0 contract. Attach `ref` to the element and drive it through `actions`.
 */
export function usePresenter() {
  const elementRef = useRef<PresenterElement | null>(null);
  const [state, setState] = useState<PresenterState>(INITIAL_STATE);

  const patch = useCallback((next: Partial<PresenterState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const ref = useCallback(
    (element: PresenterElement | null) => {
      elementRef.current = element;
      if (!element) return;

      // Listeners survive custom-element upgrade, so they can be attached
      // before the Presenter runtime script has finished loading.
      const listeners: Array<[string, EventListener]> = [
        [
          'PRESENTER_STATUS',
          (event) => {
            const status = readStringDetail(event, 'status', 'state');
            if (
              status === 'Ready' ||
              status === 'Initializing' ||
              status === 'Uninitialized'
            ) {
              patch({ status });
            }
          },
        ],
        [
          'ASSET_LOADING_PROGRESS',
          (event) => {
            const progress = readProgress(event);
            if (progress) patch({ progress });
          },
        ],
        [
          'AUDIO_PLAYBACK_STATE',
          (event) => {
            const audioState = readStringDetail(event, 'state', 'status');
            if (audioState) {
              patch({ audioState: audioState as AudioContextState });
            }
          },
        ],
        [
          'PERFORMANCE_STATE',
          (event) => {
            const next = readStringDetail(event, 'state', 'status');
            if (
              next === 'Idle' ||
              next === 'Listening' ||
              next === 'Thinking' ||
              next === 'Talking'
            ) {
              patch({ performanceState: next });
            }
          },
        ],
        [
          'PLAYING_SPEECH_TEXT',
          (event) => {
            patch({ caption: readStringDetail(event, 'text', 'content') });
          },
        ],
        ['PERFORMANCE_START', () => patch({ speaking: true })],
        [
          'ALL_PERFORMANCE_FINISHED',
          () => patch({ speaking: false, caption: '' }),
        ],
        [
          'CONNECT_KEY_REJECTED',
          () =>
            patch({
              phase: 'error',
              error:
                'Connect key rejected. It may be revoked, expired, scoped to another region, or missing this hostname in its allowed domains.',
            }),
        ],
        [
          'SPEECH_TOKEN_EXPIRED',
          () =>
            patch({
              error: 'Speech token expired. Launch the avatar again.',
            }),
        ],
        [
          'CONNECT_TOKEN_EXPIRED',
          () =>
            patch({ error: 'Legacy Connect token expired.' }),
        ],
      ];

      for (const [name, listener] of listeners) {
        element.addEventListener(name, listener);
      }

      return () => {
        for (const [name, listener] of listeners) {
          element.removeEventListener(name, listener);
        }
      };
    },
    [patch],
  );

  /** Wraps a Presenter call so a failed result surfaces instead of vanishing. */
  const run = useCallback(
    async (
      action: (presenter: PresenterElement) => Promise<PresentationResult>,
    ): Promise<PresentationResult> => {
      const presenter = elementRef.current;
      if (!presenter) {
        const message = 'Presenter is not mounted';
        patch({ error: message });
        return { success: false, code: 100, message };
      }

      try {
        const result = await action(presenter);
        const failure = describeResult(result);
        patch({ error: failure });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Presenter call failed';
        patch({ error: message });
        return { success: false, message };
      }
    },
    [patch],
  );

  const actions = useMemo(() => {
    const element = () => elementRef.current;

    return {
      /** Loads the regional runtime and initializes with a Publishable key. */
      async connect(
        region: Region,
        connectKey: string,
        target: PresentationTarget,
      ) {
        patch({
          phase: 'connecting',
          error: null,
          progress: null,
          status: 'Initializing',
        });

        try {
          await loadPresenterRuntime(region);
          const presenter = elementRef.current;
          if (!presenter) throw new Error('Presenter is not mounted');

          // Must run inside the user gesture that triggered the connect.
          await presenter.resumeAudioPlayback();
          await presenter.initializeWithConnectKey(connectKey, target);

          patch({ phase: 'live', status: 'Ready', progress: null });
          return true;
        } catch (error) {
          patch({
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Could not connect to Perxona',
          });
          return false;
        }
      },

      resumeAudio() {
        return element()?.resumeAudioPlayback();
      },

      present(content: string, options?: PresentOptions) {
        return run((presenter) => presenter.present(content, options));
      },

      /** Pattern F: speak audio produced by any external TTS. */
      presentWithAudio(
        audio: ArrayBuffer,
        content: string,
        options?: PresentOptions,
      ) {
        return run((presenter) =>
          presenter.presentWithAudio(audio, content, options),
        );
      },

      /** Fires one body motion independently of speech. */
      playMotion(motionId: string) {
        return run((presenter) => presenter.playMotion(motionId));
      },

      interrupt() {
        element()?.interruptPresentation();
        patch({ speaking: false, caption: '' });
      },

      setListening(listening: boolean) {
        element()?.setListening(listening);
        patch({ listening });
      },

      setThinking(thinking: boolean) {
        element()?.setThinking(thinking);
        patch({ thinking });
      },

      setMuted(muted: boolean) {
        element()?.muteAudio(muted);
        patch({ muted });
      },

      setCameraAngle(cameraAngle: CameraAngle) {
        element()?.updateCameraAngle(cameraAngle);
        patch({ cameraAngle });
      },

      setCameraFOV(fov: CameraFOV) {
        element()?.updateCameraFOV(fov);
      },

      clearError() {
        patch({ error: null });
      },

      reset() {
        setState(INITIAL_STATE);
      },
    };
  }, [patch, run]);

  return { ref, state, actions };
}

export type PresenterActions = ReturnType<typeof usePresenter>['actions'];
