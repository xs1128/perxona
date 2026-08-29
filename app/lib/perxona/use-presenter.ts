"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { describeResult, loadPresenterRuntime } from "./presenter";
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
} from "./types";

export type PresenterPhase = "idle" | "connecting" | "live" | "error";

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
  phase: "idle",
  status: "Uninitialized",
  performanceState: "Idle",
  caption: "",
  progress: null,
  audioState: null,
  error: null,
  muted: false,
  cameraAngle: "fullbody",
  listening: false,
  thinking: false,
  speaking: false,
};

const PRESENTER_STATUSES: readonly PresenterStatus[] = [
  "Uninitialized",
  "Initializing",
  "Ready",
];

const PERFORMANCE_STATES: readonly PerformanceState[] = [
  "Idle",
  "Listening",
  "Thinking",
  "Talking",
];

/**
 * `initializeWithConnectKey()` resolves once the handshake succeeds, which is
 * well before the Avatar, Scene, and motion assets have finished downloading.
 * Presenting in that window fails with 101 PRESENTER_NOT_READY, so every call
 * waits for `PRESENTER_STATUS: Ready` first.
 */
const READY_TIMEOUT_MS = 60_000;

/** How long a later `present()` waits if readiness lapsed mid-session. */
const PRESENT_READY_TIMEOUT_MS = 15_000;

/**
 * How long a re-target waits for React to drop the old `<sv-presenter>` and
 * attach its replacement.
 */
const REMOUNT_TIMEOUT_MS = 10_000;

type ReadyGate = { promise: Promise<void>; open: () => void };

function createReadyGate(): ReadyGate {
  let open: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** Resolves true when the gate opens, false if it times out first. */
async function waitForGate(gate: ReadyGate, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([
      gate.promise.then(() => true as const),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Identity of a Presenter target.
 *
 * `initializeWithConnectKey()` binds an element to one Avatar, Scene, and Voice
 * for the element's lifetime, so this is what `connect()` compares to decide
 * whether it is joining the live session or replacing it.
 */
function targetKey(target: PresentationTarget) {
  return `${target.avatarId}|${target.sceneId}|${target.voiceId ?? ""}`;
}

/*
 * Event payload field names are not published in the handbook, so every reader
 * below accepts the plausible shapes and falls back to a bare string detail.
 */
function detailOf(event: Event) {
  return (event as CustomEvent<unknown>).detail;
}

function readStringDetail(event: Event, ...keys: string[]) {
  const detail = detailOf(event);
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    for (const key of keys) {
      const value = (detail as Record<string, unknown>)[key];
      if (typeof value === "string") return value;
    }
  }
  return "";
}

/**
 * Finds a known enum member anywhere in the payload.
 *
 * Reading by key name would silently drop the status if the runtime nests it
 * or names the field something else — and a missed `Ready` strands the whole
 * session at `Initializing`.
 */
function readEnumDetail<T extends string>(
  event: Event,
  allowed: readonly T[]
): T | null {
  const detail = detailOf(event);

  const match = (value: unknown): value is T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value);

  if (match(detail)) return detail;

  if (detail && typeof detail === "object") {
    for (const value of Object.values(detail as Record<string, unknown>)) {
      if (match(value)) return value;
    }
  }

  return null;
}

function readProgress(event: Event): AssetProgress | null {
  const detail = detailOf(event);
  if (!detail || typeof detail !== "object") return null;
  const record = detail as Record<string, unknown>;
  const asset = record.asset ?? record.assetType ?? record.type;
  const percentage = record.percentage ?? record.percent ?? record.progress;
  if (typeof percentage !== "number") return null;
  return {
    asset: typeof asset === "string" ? asset : "Asset",
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

  /**
   * Bumped to make React throw the `<sv-presenter>` away and mount a fresh one.
   *
   * The runtime has no way to re-target a live element, so switching Avatar or
   * Scene means replacing it. Consumers MUST pass this as the element's `key`
   * or `connect()` can never change the target.
   */
  const [instanceKey, setInstanceKey] = useState(0);

  // Opened by `PRESENTER_STATUS: Ready`; awaited by everything that performs.
  const gateRef = useRef<ReadyGate | null>(null);
  const readyRef = useRef(false);

  /** `targetKey()` of whatever the mounted element was initialized with. */
  const activeTargetRef = useRef<string | null>(null);

  /**
   * Whether `initializeWithConnectKey()` has been called on the element now
   * mounted. An element may only be initialized once, so this — not the active
   * target — is what decides whether the next attempt needs a fresh element.
   */
  const initializedRef = useRef(false);

  /** Opened by the ref callback once a replacement element is attached. */
  const mountGateRef = useRef<ReadyGate | null>(null);

  /** Identifies the newest `connect()`; older ones retire when they see it. */
  const connectSeqRef = useRef(0);

  /**
   * The `connect()` currently in flight. A new target aborts it and waits for
   * it to retire, so only one attempt ever owns the element at a time.
   */
  const runRef = useRef<{ done: Promise<boolean>; abort: () => void } | null>(
    null
  );

  const patch = useCallback((next: Partial<PresenterState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const gate = useCallback(() => {
    gateRef.current ??= createReadyGate();
    return gateRef.current;
  }, []);

  const markReady = useCallback(() => {
    readyRef.current = true;
    gate().open();
  }, [gate]);

  const ref = useCallback(
    (element: PresenterElement | null) => {
      elementRef.current = element;
      if (!element) return;

      // A re-target parks here until its replacement element exists.
      mountGateRef.current?.open();

      // Listeners survive custom-element upgrade, so they can be attached
      // before the Presenter runtime script has finished loading.
      const listeners: Array<[string, EventListener]> = [
        [
          "PRESENTER_STATUS",
          (event) => {
            const status = readEnumDetail(event, PRESENTER_STATUSES);
            if (!status) return;

            patch({ status });

            if (status === "Ready") markReady();
            else if (status === "Uninitialized" && readyRef.current) {
              /*
               * Only meaningful once a session has actually been established.
               * A fresh element reports `Uninitialized` on the way up, and
               * replacing the gate there would strand the `connect()` that is
               * waiting on it — nothing would ever open the gate it holds.
               */
              readyRef.current = false;
              gateRef.current = createReadyGate();
            }
          },
        ],
        [
          "ASSET_LOADING_PROGRESS",
          (event) => {
            const progress = readProgress(event);
            if (progress) patch({ progress });
          },
        ],
        [
          "AUDIO_PLAYBACK_STATE",
          (event) => {
            const audioState = readStringDetail(event, "state", "status");
            if (audioState) {
              patch({ audioState: audioState as AudioContextState });
            }
          },
        ],
        [
          "PERFORMANCE_STATE",
          (event) => {
            const next = readEnumDetail(event, PERFORMANCE_STATES);
            if (!next) return;

            /*
             * `Talking`/`Idle` double as a second opinion on `speaking`. If
             * `ALL_PERFORMANCE_FINISHED` is ever missed, `speaking` would stay
             * true for the rest of the session — and the microphone, which
             * pauses on it, would discard everything it hears from then on.
             */
            patch(
              next === "Talking"
                ? { performanceState: next, speaking: true }
                : next === "Idle"
                ? { performanceState: next, speaking: false }
                : { performanceState: next }
            );
          },
        ],
        [
          "PLAYING_SPEECH_TEXT",
          (event) => {
            patch({ caption: readStringDetail(event, "text", "content") });
          },
        ],
        ["PERFORMANCE_START", () => patch({ speaking: true })],
        [
          "ALL_PERFORMANCE_FINISHED",
          () => patch({ speaking: false, caption: "" }),
        ],
        [
          "CONNECT_KEY_REJECTED",
          () =>
            patch({
              phase: "error",
              error:
                "Connect key rejected. It may be revoked, expired, scoped to another region, or missing this hostname in its allowed domains.",
            }),
        ],
        [
          "SPEECH_TOKEN_EXPIRED",
          () =>
            patch({
              error: "Speech token expired. Launch the avatar again.",
            }),
        ],
        [
          "CONNECT_TOKEN_EXPIRED",
          () => patch({ error: "Legacy Connect token expired." }),
        ],
      ];

      for (const [name, listener] of listeners) {
        element.addEventListener(name, listener);
      }

      return () => {
        for (const [name, listener] of listeners) {
          element.removeEventListener(name, listener);
        }

        /*
         * React 19 runs this cleanup *instead of* calling the ref with `null`,
         * so nothing else clears the pointer. Left set, every later call would
         * be made against an element that is no longer in the document.
         */
        if (elementRef.current === element) elementRef.current = null;
      };
    },
    [markReady, patch]
  );

  /** Blocks until the Presenter reports `Ready`, or the wait runs out. */
  const awaitReady = useCallback(async (timeoutMs: number) => {
    if (readyRef.current) return true;
    if (!gateRef.current) return false;
    return waitForGate(gateRef.current, timeoutMs);
  }, []);

  /** Wraps a Presenter call so a failed result surfaces instead of vanishing. */
  const run = useCallback(
    async (
      action: (presenter: PresenterElement) => Promise<PresentationResult>
    ): Promise<PresentationResult> => {
      const presenter = elementRef.current;
      if (!presenter) {
        const message = "Presenter is not mounted";
        patch({ error: message });
        return { success: false, code: 100, message };
      }

      // A performance issued before the assets land returns 101, so wait it out
      // rather than handing the caller an avoidable PRESENTER_NOT_READY.
      if (!readyRef.current && gateRef.current) {
        await awaitReady(PRESENT_READY_TIMEOUT_MS);
      }

      try {
        const result = await action(presenter);
        const failure = describeResult(result);
        patch({ error: failure });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Presenter call failed";
        patch({ error: message });
        return { success: false, message };
      }
    },
    [awaitReady, patch]
  );

  const actions = useMemo(() => {
    const element = () => elementRef.current;

    return {
      /**
       * Loads the regional runtime and initializes with a Publishable key.
       *
       * Calling this with a target that differs from the live one re-targets
       * the stage: the element is replaced and initialized again, because
       * `initializeWithConnectKey()` binds an element to one Avatar and Scene
       * for its lifetime and the contract exposes no way to change them.
       */
      async connect(
        region: Region,
        connectKey: string,
        target: PresentationTarget
      ) {
        const key = targetKey(target);

        // Already on this exact target, or already on the way to it.
        if (activeTargetRef.current === key) {
          if (readyRef.current) return true;
          if (gateRef.current) return awaitReady(READY_TIMEOUT_MS);
        }

        const seq = ++connectSeqRef.current;
        const superseded = () => connectSeqRef.current !== seq;

        const previous = runRef.current;
        const readyGate = createReadyGate();
        let mountGate: ReadyGate | null = null;

        // Opens whatever the outgoing attempt is blocked on so it retires at
        // its next checkpoint instead of holding the element for a full
        // timeout. `superseded()` is what actually stops it.
        const abort = () => {
          readyGate.open();
          mountGate?.open();
        };

        const done = (async () => {
          if (previous) {
            previous.abort();
            await previous.done.catch(() => {});
          }
          if (superseded()) return false;

          activeTargetRef.current = key;
          readyRef.current = false;
          gateRef.current = readyGate;

          patch({
            phase: "connecting",
            error: null,
            progress: null,
            status: "Initializing",
            // The outgoing avatar's last line does not belong to this one.
            caption: "",
            speaking: false,
            performanceState: "Idle",
          });

          try {
            await loadPresenterRuntime(region);
            if (superseded()) return false;

            // An element that has already been initialized — even by an
            // attempt that then failed — cannot be initialized again.
            if (initializedRef.current) {
              // Cut the outgoing voice off rather than letting its audio
              // outlive the element that owns it.
              elementRef.current?.interruptPresentation();

              mountGate = createReadyGate();
              mountGateRef.current = mountGate;
              setInstanceKey((current) => current + 1);

              const mounted = await waitForGate(mountGate, REMOUNT_TIMEOUT_MS);
              mountGateRef.current = null;
              if (superseded()) return false;
              if (!mounted) {
                throw new Error(
                  "The Presenter element never remounted for the new Avatar and Scene."
                );
              }
              initializedRef.current = false;
            }

            const presenter = elementRef.current;
            if (!presenter) throw new Error("Presenter is not mounted");

            initializedRef.current = true;
            await presenter.initializeWithConnectKey(connectKey, target);
            if (superseded()) return false;

            const ready = await waitForGate(readyGate, READY_TIMEOUT_MS);
            if (superseded()) return false;

            if (!ready) {
              throw new Error(
                "The avatar never finished initializing. Check that the Avatar, Scene, and Voice IDs belong to this Connect key’s organization and region."
              );
            }

            readyRef.current = true;
            patch({ phase: "live", status: "Ready", progress: null });
            return true;
          } catch (error) {
            if (superseded()) return false;

            // Forget the target so a retry re-initializes instead of treating
            // the one that just failed as the live session.
            activeTargetRef.current = null;
            patch({
              phase: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not connect to Perxona",
            });
            return false;
          }
        })();

        runRef.current = { done, abort };
        return done;
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
        options?: PresentOptions
      ) {
        return run((presenter) =>
          presenter.presentWithAudio(audio, content, options)
        );
      },

      /** Fires one body motion independently of speech. */
      playMotion(motionId: string) {
        return run((presenter) => presenter.playMotion(motionId));
      },

      interrupt() {
        element()?.interruptPresentation();
        patch({ speaking: false, caption: "" });
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
        // Retires any attempt in flight so it cannot report back into a
        // session that no longer exists.
        connectSeqRef.current += 1;
        runRef.current?.abort();
        runRef.current = null;

        readyRef.current = false;
        gateRef.current = null;
        mountGateRef.current = null;
        activeTargetRef.current = null;
        initializedRef.current = false;
        setState(INITIAL_STATE);
      },
    };
  }, [patch, run]);

  return { ref, instanceKey, state, actions };
}

export type PresenterActions = ReturnType<typeof usePresenter>["actions"];
