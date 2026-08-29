# Connection and Integration Patterns

[← Connect REST API](02-connect-api.md) · [Documentation index](README.md) · [Motion Browser and VRM →](04-motion-browser-and-vrm.md)

This document explains the practical ways an application can connect to Perxona Connect Kit. It separates browser responsibilities from server responsibilities so credentials are not accidentally exposed.

## Credential setup

Create two Connect API keys in **Perxona Console → Organization → Integration → Connect API keys**:

| Key | Where it belongs | Typical use |
|---|---|---|
| Secret key | Trusted backend only | Connect REST API, chatbot management, asset queries, server-side requests |
| Publishable key | Browser | Presenter initialization and Motion Browser |

For a Secret key, leave allowed domains blank and never return it to the client. For a Publishable key, configure the exact bare hostnames that may use it. Do not include scheme, port, path, query, wildcard, or trailing slash unless the Console explicitly changes its accepted format.

Publishable keys can still consume credits. Origin restrictions are a useful control but not a substitute for monitoring and revocation. Revoke any key that is exposed unexpectedly.

Keep the API region and Presenter CDN region aligned:

```text
API:       https://console.perxona.ai/asia/api/v1/connect
Presenter: https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js
```

Replace `asia` with `eu` for an EU organization.

## Recommended architecture

```text
Browser UI
  ├─ Publishable key → Presenter runtime
  └─ HTTPS → Your backend
                  ├─ Secret key → Perxona Connect API
                  ├─ optional Perxona hosted chatbot
                  └─ optional third-party LLM/TTS
```

The browser owns the live avatar canvas and audio playback. The backend owns secrets, business rules, protected data, and any server-to-server APIs.

## Pattern A: browser Presenter with a protected backend

This is the normal production pattern.

1. The backend uses its Secret key to query avatars, motions, scenes, voices, or chatbots.
2. The browser loads the regional Presenter module.
3. A user interaction calls `resumeAudioPlayback()` to satisfy browser autoplay policy.
4. The browser calls `initializeWithConnectKey()` with a Publishable key.
5. After Presenter reports ready, the app calls `present()`, `presentWithAudio()`, or `playMotion()`.

Example browser flow:

```ts
await presenter.resumeAudioPlayback();

const result = await presenter.initializeWithConnectKey(
  publishableConnectKey,
  target
);

if (result.code !== 0) {
  throw new Error(result.message);
}

await presenter.present("Welcome!", {
  voiceId,
  emotion: "joy",
  intensity: "neutral"
});
```

The exact `target` object depends on the Presenter build and the selected avatar/scene setup. Use the current official sample and type package as the implementation authority.

## Pattern B: direct browser Motion Browser

The repository's Motion Browser is a developer tool that talks directly to the asset API with a Publishable key and plays motions through Presenter.

```dotenv
VITE_PERXONA_API_BASE_URL=https://console.perxona.ai/asia
VITE_PRESENTER_URL=https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js
VITE_PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
```

This is useful for discovering an avatar's live Motion IDs and previewing motion markup. It is not intended to be the production user interface.

## Pattern C: official Express adapter

The Express sample provides a local API that proxies Connect API requests with the server's Secret key. It demonstrates asset listing, hosted-chatbot operations, knowledge upload, and a placeholder for an application-owned LLM.

Use this as scaffolding, then add:

- user authentication and authorization;
- per-tenant or per-user data isolation;
- application rate limits and request-size limits;
- input validation, structured logging, and safe error handling;
- CSRF/CORS policies appropriate to the deployment;
- secret management instead of committed environment files.

## Pattern D: Perxona hosted chatbot

```text
User message
  → your backend
  → POST /chatbots/{id}/chat
  → reply text
  → browser
  → presenter.present(replyText, options)
```

This is the shortest route to a knowledge-backed conversational Avatar. The backend can create/configure the chatbot and keep its ID private or map it to the signed-in user/session.

## Pattern E: application-owned LLM

Any LLM provider can generate the text. Perxona Presenter then turns that text into the avatar performance:

```text
User message → your backend → your LLM → reply text → browser Presenter
```

If LLM output may contain motion markup, validate every Motion ID against the selected avatar's motion list. Do not allow the model to invent IDs or inject arbitrary markup.

## Pattern F: application-owned TTS

Generate audio with any TTS system, load it as an `ArrayBuffer`, and call:

```ts
await presenter.presentWithAudio(audioArrayBuffer, replyText, {
  emotion: "caring",
  intensity: "neutral"
});
```

Do not pass `voiceId` in this pattern because the audio already exists.

## Pattern G: Perxona TTS

Select a voice from `GET /voices`, then pass its ID to `present()`:

```ts
await presenter.present(replyText, {
  voiceId,
  emotion: "curiosity",
  intensity: "low"
});
```

This lets Presenter synthesize and synchronize speech for the performance.

## Pattern H: backend-triggered live presentation

Presenter runs in the browser. A backend cannot directly call the JavaScript object mounted in a user's page. If a server event should make the Avatar speak, deliver an instruction to the browser using one of:

- WebSocket for bidirectional, low-latency updates;
- Server-Sent Events for server-to-browser streams;
- short or long polling for simpler deployments.

The browser validates the instruction and calls Presenter locally.

## Pattern I: direct Presentation API

For workflows that fit a server-issued one-shot request, call `POST /presentation` with `avatar_id`, `message`, and optional voice/emotion fields. Verify the response behavior in the target environment; it is distinct from invoking an already-mounted Presenter instance in a particular browser tab.

## Pattern J: custom VRM catalog

After Perxona accepts and publishes a custom VRM, it becomes organization-scoped and appears in `GET /assets/avatars`. Existing applications can select the new Avatar ID without redeploying if they load their catalog dynamically.

## A practical end-to-end workflow

1. Fetch avatars and voices on the backend and return only the fields needed by the UI.
2. Let the user choose an Avatar and voice, or store defaults in backend configuration.
3. Initialize Presenter with a domain-restricted Publishable key.
4. Wait for `PRESENTER_STATUS` to indicate readiness.
5. Resume audio from a user gesture.
6. Send the user's message to a hosted chatbot or application-owned LLM.
7. Return reply text to the browser.
8. Optionally add only validated motion tags.
9. Call `present()` or `presentWithAudio()`.
10. Use performance events to disable duplicate actions, show progress, and recover cleanly from interruption/errors.

## Common mistakes

- Putting a Secret key in frontend JavaScript or a Vite `VITE_*` variable.
- Using a Secret key where Presenter expects a Publishable key; the shared prefix makes this easy to miss.
- Mixing an Asia API URL with an EU Presenter URL.
- Calling `present()` before initialization has completed.
- Depending on audio autoplay without a user gesture.
- Assuming Motion IDs are universal across avatars.
- Fetching only the first 50 motions and treating it as the complete catalog.
- Treating the Express sample as production-ready authentication middleware.
- Assuming the documented VRM upload endpoint is enabled for every account.

## Sources

- [How Connect Kit works](https://connect.perxona.ai/#how-it-works)
- [Credentials](https://connect.perxona.ai/#credentials)
- [SDK reference](https://connect.perxona.ai/#sdk-reference)
- [API reference](https://connect.perxona.ai/#api-reference)
- [Official Express sample](https://github.com/XRSPACE-Inc/perxona-connect-kit/tree/main/samples/express)
- [Official Motion Browser](https://github.com/XRSPACE-Inc/perxona-connect-kit/tree/main/tools/motion-browser)
