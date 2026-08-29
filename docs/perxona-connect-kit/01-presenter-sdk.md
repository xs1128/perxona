# Presenter SDK Reference

[← Documentation index](README.md) · [Connect REST API →](02-connect-api.md)

`<sv-presenter>` is the browser runtime used by Connect Kit. The runtime is
loaded from a Perxona-approved CDN URL. The npm package
`@perxona/presenter-types` contains TypeScript declarations only.

Sources:

- [Handbook: Presenter Component](https://connect.perxona.ai/#sdk-reference)
- [`@perxona/presenter-types` 0.3.0](https://unpkg.com/@perxona/presenter-types@0.3.0/index.d.ts)
- [Official Express sample](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/README.md)

## Loading the component

```html
<sv-presenter hidden></sv-presenter>
```

Load the approved Presenter module once:

```js
const presenterUrl = getPresenterUrlFromAppConfig();

await new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.type = "module";
  script.src = presenterUrl;
  script.onload = resolve;
  script.onerror = () => reject(new Error("Presenter engine failed to load"));
  document.head.append(script);
});

const presenter = document.querySelector("sv-presenter");
```

The Presenter URL is configuration, not a credential. It should come from a
trusted server or Perxona and must match the selected Perxona region.

## Recommended initialization

```js
presenter.addEventListener("PRESENTER_STATUS", (event) => {
  console.log(event.detail.status);
});

launchButton.addEventListener("click", async () => {
  await presenter.resumeAudioPlayback();

  const { connectKey } = await fetch("/your-backend/connect-key").then((r) =>
    r.json(),
  );

  await presenter.initializeWithConnectKey(connectKey, {
    avatarId,
    sceneId,
    voiceId, // optional when using presentWithAudio()
  });

  const result = await presenter.present("Hello from Perxona!");
  if (!result.success) console.warn(result.code, result.message);
});
```

`resumeAudioPlayback()` must execute inside a direct user interaction such as
a click or message submission. Browsers otherwise block audio playback.

## Complete method inventory

The official 0.3.0 type contract contains more methods than the small table
shown in the handbook.

### `initializeWithConnectKey(connectKey, target)`

```ts
initializeWithConnectKey(
  connectKey: string,
  target: { avatarId: string; sceneId: string; voiceId?: string },
): Promise<void>
```

Recommended initialization. It authenticates with `X-Connect-Key`, resolves
the selected assets, and obtains runtime speech configuration. Only a
browser-safe Publishable key belongs here.

### `initialize(connectToken, target)`

```ts
initialize(connectToken: string, target: PresentationTarget): Promise<void>
```

Legacy Bearer-JWT initialization. Deprecated but still supported. New
integrations should use `initializeWithConnectKey()`.

### `refreshConnectToken(token)`

```ts
refreshConnectToken(token: string): void
```

Refreshes the legacy Bearer token used by `initialize()`. Deprecated and
ignored in Connect API-key mode.

### `resumeAudioPlayback()`

```ts
resumeAudioPlayback(): Promise<void>
```

Resumes the browser `AudioContext`. It must be called at least once before
speech can succeed. The promise can reject if the audio context is closed.

### `present(content, options?)`

```ts
present(content: string, options?: PresentOptions): Promise<PresentationResult>
```

Uses the configured Perxona voice to synthesize and perform text. Content can
include motion markup. Multiple calls are queued in call order. Presentation
failures resolve as unsuccessful results instead of rejecting.

### `presentWithAudio(audio, content, options?)`

```ts
presentWithAudio(
  audio: ArrayBuffer,
  content: string,
  options?: PresentOptions,
): Promise<PresentationResult>
```

Plays caller-supplied audio from an external TTS provider or prerecorded
clip. Perxona TTS is bypassed, but `content` still drives Motion Director,
facial-motion selection, display text, and motion markup.

### `playMotion(motionId)`

```ts
playMotion(motionId: string): Promise<PresentationResult>
```

Resolves, preloads, and dispatches one compatible body motion independently
of speech. The promise confirms dispatch, not animation completion. Concurrent
calls do not guarantee ordering.

### `interruptPresentation()`

```ts
interruptPresentation(): void
```

Stops current speech and clears the presentation queue. It reveals any active
Thinking, Listening, or Idle state below the interrupted performance.

### `setListening(isListening)`

```ts
setListening(isListening: boolean): void
```

Enables or disables Listening state. It is visible only if the selected
Avatar has a compatible listening motion.

### `setThinking(isThinking)`

```ts
setThinking(isThinking: boolean): void
```

Enables or disables Thinking state. It is visible only if the selected Avatar
has a compatible thinking motion.

### `muteAudio(muted)`

```ts
muteAudio(muted: boolean): void
```

Mutes or unmutes speech-performance audio.

### `updateCameraAngle(cameraAngle)`

```ts
updateCameraAngle(cameraAngle: "fullbody" | "halfbody"): void
```

Changes framing between full body and upper body.

### `updateCameraFOV(fov)`

```ts
updateCameraFOV(fov: {
  distance?: number;
  vertical?: number;
  horizontal: number;
}): void
```

Adjusts camera distance and horizontal/vertical field of view.

## Presentation options

```ts
type PresentOptions = {
  emotion?: PresentationEmotion;
  intensity?: PresentationIntensity;
};
```

Supported emotions:

```text
joy
excitement
admiration
caring
gratitude
sadness
disappointment
annoyance
embarrassment
curiosity
surprise
realization
confusion
```

Intensity is `low`, `neutral`, or `high`. Supplying emotional options
influences facial-motion selection. With both omitted, the presentation keeps
body-motion suggestions without attaching a facial tone.

## Motion Markup Language

```text
[MOTION motion-id:priority]
```

Example:

```js
await presenter.present(
  "Welcome! [MOTION selected-motion-id:1] Let me show you around.",
);
```

The markup is resolved and removed internally before spoken/display text is
produced. A Motion ID must be compatible with the selected Avatar.

The type contract also refers to an extended optional facial-motion form:

```text
[MOTION motion-id:priority;face-id]
```

The public Motion Browser currently serializes the simpler
`[MOTION id:1]` form.

## Events

| Event | Payload or meaning |
|---|---|
| `PRESENTER_STATUS` | `Uninitialized`, `Initializing`, or `Ready` |
| `ASSET_LOADING_PROGRESS` | Asset type (`Avatar`, `Motion`, `Scene`) and percentage |
| `AUDIO_PLAYBACK_STATE` | Browser `AudioContextState` |
| `SPEECH_TOKEN_EXPIRED` | Runtime speech token expired |
| `CONNECT_KEY_REJECTED` | API key revoked, expired, wrong-domain, or missing scope |
| `CONNECT_TOKEN_EXPIRED` | Legacy Bearer-token expiration; deprecated flow |
| `PERFORMANCE_START` | One performance started |
| `PERFORMANCE_END` | One performance ended |
| `ALL_PERFORMANCE_FINISHED` | All queued performances completed |
| `PERFORMANCE_STATE` | `Idle`, `Listening`, `Thinking`, or `Talking` |
| `PLAYING_SPEECH_TEXT` | Text currently being spoken |

A rejected Connect key is not retried. Reissue or replace the key and
initialize again.

## Animation priority

```text
Custom motion > Talking > Thinking > Listening > Idle
```

Higher-priority states visually override lower-priority states. Finishing or
disabling a higher state reveals the next active lower state.

## Presentation result codes

| Code | Constant | Meaning |
|---:|---|---|
| `0` | `OK` | Operation accepted successfully |
| `100` | `COMPONENT_UNMOUNTED` | Presenter is no longer mounted |
| `101` | `PRESENTER_NOT_READY` | Presenter has not reached Ready |
| `200` | `AUDIO_CONTEXT_UNAVAILABLE` | Audio playback is locked or unavailable |
| `300` | `VOICE_NOT_CONFIGURED` | `present()` has no configured Perxona voice |
| `301` | `NOT_INITIALIZED` | No target is initialized |
| `302` | `SPEECH_AUDIO_BUFFER_REQUIRED` | Caller-supplied audio is missing |
| `303` | `PRESENTATION_INTERRUPTED` | Operation was interrupted |
| `400` | `PRESENTATION_REQUEST_FAILED` | Connect presentation request failed |
| `900` | `NOT_IMPLEMENTED` | Requested behavior is not implemented |
