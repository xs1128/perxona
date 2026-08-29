/**
 * Types for the Perxona Connect Kit browser surface.
 *
 * Method shapes follow the `@perxona/presenter-types` 0.3.0 contract described
 * in `docs/perxona-connect-kit/01-presenter-sdk.md`. Where the handbook and the
 * type package disagree, the type package wins.
 */

export type Region = 'asia' | 'eu';

export type PresentationEmotion =
  | 'joy'
  | 'excitement'
  | 'admiration'
  | 'caring'
  | 'gratitude'
  | 'sadness'
  | 'disappointment'
  | 'annoyance'
  | 'embarrassment'
  | 'curiosity'
  | 'surprise'
  | 'realization'
  | 'confusion';

export const PRESENTATION_EMOTIONS: PresentationEmotion[] = [
  'joy',
  'excitement',
  'admiration',
  'caring',
  'gratitude',
  'sadness',
  'disappointment',
  'annoyance',
  'embarrassment',
  'curiosity',
  'surprise',
  'realization',
  'confusion',
];

export type PresentationIntensity = 'low' | 'neutral' | 'high';

export const PRESENTATION_INTENSITIES: PresentationIntensity[] = [
  'low',
  'neutral',
  'high',
];

export type PresentOptions = {
  emotion?: PresentationEmotion;
  intensity?: PresentationIntensity;
};

export type PresentationResult = {
  success: boolean;
  code?: number;
  message?: string;
};

export type CameraAngle = 'fullbody' | 'halfbody';

export type CameraFOV = {
  distance?: number;
  vertical?: number;
  horizontal: number;
};

export type PresentationTarget = {
  avatarId: string;
  sceneId: string;
  voiceId?: string;
};

/** The `<sv-presenter>` custom element, once the runtime has upgraded it. */
export type PresenterElement = HTMLElement & {
  initializeWithConnectKey: (
    connectKey: string,
    target: PresentationTarget,
  ) => Promise<void>;
  resumeAudioPlayback: () => Promise<void>;
  present: (
    content: string,
    options?: PresentOptions,
  ) => Promise<PresentationResult>;
  presentWithAudio: (
    audio: ArrayBuffer,
    content: string,
    options?: PresentOptions,
  ) => Promise<PresentationResult>;
  playMotion: (motionId: string) => Promise<PresentationResult>;
  interruptPresentation: () => void;
  setListening: (isListening: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  muteAudio: (muted: boolean) => void;
  updateCameraAngle: (cameraAngle: CameraAngle) => void;
  updateCameraFOV: (fov: CameraFOV) => void;
};

export type PresenterStatus = 'Uninitialized' | 'Initializing' | 'Ready';

export type PerformanceState = 'Idle' | 'Listening' | 'Thinking' | 'Talking';

export type AssetType = 'Avatar' | 'Motion' | 'Scene';

export type AssetProgress = {
  /** Normally an `AssetType`, but the payload shape is not contractual. */
  asset: string;
  percentage: number;
};

/** Every event `<sv-presenter>` dispatches, per the 0.3.0 contract. */
export const PRESENTER_EVENTS = [
  'PRESENTER_STATUS',
  'ASSET_LOADING_PROGRESS',
  'AUDIO_PLAYBACK_STATE',
  'SPEECH_TOKEN_EXPIRED',
  'CONNECT_KEY_REJECTED',
  'CONNECT_TOKEN_EXPIRED',
  'PERFORMANCE_START',
  'PERFORMANCE_END',
  'ALL_PERFORMANCE_FINISHED',
  'PERFORMANCE_STATE',
  'PLAYING_SPEECH_TEXT',
] as const;

export type PresenterEventName = (typeof PRESENTER_EVENTS)[number];

/* -------------------------------------------------------------------------- */
/* Connect API catalog records                                                 */
/* -------------------------------------------------------------------------- */

export type Avatar = {
  id: string;
  name: string;
  thumbnailUrl?: string;
};

export type Scene = {
  id: string;
  name: string;
  thumbnailUrl?: string;
};

export type Voice = {
  id: string;
  name: string;
  languages: string[];
};

export type Motion = {
  id: string;
  name: string;
  category: string;
};

/** Everything the browser needs to initialize a Presenter target. */
export type ConnectConfig = {
  region: Region;
  connectKey: string;
  avatarId: string;
  sceneId: string;
  voiceId: string;
};
