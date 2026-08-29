# Motion Browser, Motion IDs, and Custom VRM

[← Integration patterns](03-integration-patterns.md) · [Documentation index](README.md) · [Selecting catalog IDs →](05-selecting-catalog-ids.md)

This document explains how the official Motion Browser discovers Motion IDs and records the current requirements and limitations for custom VRM avatars.

## Motion IDs are avatar-specific

There is no complete static Motion ID list in the public repository. The official Motion Browser loads the available motions dynamically for the selected Avatar:

```http
GET /api/v1/connect/assets/avatars/{avatar_id}/motions
X-Connect-Key: pxc_<publishable-key>
```

The response's `motion_id` value is the ID used by Presenter:

```ts
await presenter.playMotion(motion.motion_id);
```

or in speech markup:

```text
[MOTION motion-id:1]
```

Therefore, a correct motion catalog must always be recorded together with its Avatar ID. A Motion ID available to one avatar may be absent or incompatible with another.

## How the official Motion Browser works

The browser:

1. Loads the organization's Avatar catalog.
2. Lets the developer select an Avatar.
3. Requests `/assets/avatars/{avatarId}/motions`.
4. Maps each API `motion_id` to the UI's local `id` field.
5. Extracts a `category:` tag when one is present; otherwise categorizes the motion as `Other`.
6. Displays a copyable markup chip such as `[MOTION id:1]`.
7. Plays the selected motion through the Presenter for preview.

Its default greeting motion is not a hard-coded ID. It selects the first motion whose derived category is exactly `greeting`.

## Pagination caveat

The motions endpoint is paginated with a default page size of 50 and a maximum page size of 100. The researched Motion Browser implementation makes a single request without walking subsequent pages. An avatar with more than 50 motions may therefore show only the first page in the tool.

To produce a complete list, explicitly paginate:

```ts
const allMotions = [];

for (let page = 1; ; page += 1) {
  const response = await fetch(
    `${apiBase}/api/v1/connect/assets/avatars/${avatarId}/motions?page=${page}&page_size=100`,
    { headers: { "X-Connect-Key": publishableKey } },
  );

  if (!response.ok) throw new Error(`Motion request failed: ${response.status}`);

  const body = await response.json();
  const items = body.data ?? body.items ?? [];
  allMotions.push(...items);

  if (items.length < 100) break;
}
```

Adapt the response envelope to the current API contract rather than assuming `data` or `items` permanently.

## Running Motion Browser

The official tool uses Vite environment variables:

```dotenv
VITE_PERXONA_API_BASE_URL=https://console.perxona.ai/asia
VITE_PRESENTER_URL=https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js
VITE_PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
```

Use an EU base and CDN when the organization is in the EU region. The key must be Publishable and its allowed-domain policy must include the local hostname used for development.

Motion Browser is a discovery and preview tool, not a production component. Copy verified IDs into application configuration only when the selected Avatar is fixed. For a dynamic Avatar catalog, load and validate the motions at runtime.

## Speech-attached versus independent motion

Use markup when motion timing belongs to a spoken performance:

```ts
await presenter.present(
  `Welcome to the demo. [MOTION ${verifiedGreetingMotionId}:1]`,
  { voiceId },
);
```

The attached motion ends with the speech performance. Use `playMotion(motionId)` for a body motion that should run independently of speech. Its returned promise confirms that the motion was resolved, preloaded, and dispatched; it does not mean the animation has finished.

## Recording a motion inventory

Because IDs are dynamic, use a table like this after querying the target organization:

| Avatar ID | Motion ID | Name | Category/tags | Verified date |
|---|---|---|---|---|
| _query from API_ | _query from API_ | _query from API_ | _query from API_ | YYYY-MM-DD |

This repository intentionally does not invent or present example numbers as real Motion IDs.

## Custom VRM availability

The public OpenAPI specification includes:

```http
POST /assets/vrm/upload
```

However, the current handbook describes custom VRM upload as a closed beta and instructs teams to arrange assisted upload with Perxona staff. Treat self-service upload as unconfirmed until Perxona enables it for the organization.

After an accepted model is published, it is organization-scoped and appears in `GET /assets/avatars`. Applications that load the Avatar catalog dynamically can use it without a code deployment.

## VRM file requirements

- Format: VRoid VRM 1.0.
- Maximum file size: 100 MB.
- Content should be the character only; embedded lights do not affect the Perxona scene.
- MToon materials are recommended. Non-MToon materials may fall back and look different.
- Spring-bone simulation is currently unsupported.

The rig must include these 15 required humanoid bones:

```text
hips
spine
head
leftUpperLeg
leftLowerLeg
leftFoot
rightUpperLeg
rightLowerLeg
rightFoot
leftUpperArm
leftLowerArm
leftHand
rightUpperArm
rightLowerArm
rightHand
```

## Expressions and blend shapes

Perxona documents two compatible approaches.

### VRM preset expressions

Phonemes:

```text
aa ih ou ee oh
```

Emotions and tracking:

```text
happy angry sad relaxed surprised neutral blink look-at
```

### ARKit 52 blend shapes

Use the exact ARKit names, for example:

```text
jawOpen
eyeBlinkLeft
```

Do not add a `Face.` prefix.

## Current custom-avatar limitations

According to the handbook at the research date:

- uploaded custom avatars can load and perform compatible body motions;
- facial animation and lip-sync are not yet active for uploaded custom models;
- beta uploads are expected to expire after about one month and may be removed.

These limitations are especially important for a demo: validate the exact uploaded asset and desired speech flow before relying on facial performance.

## Licensing warning

The repository references the ViviPod42 model for validation/testing context, but its redistribution terms do not authorize general reuse. Do not upload, redistribute, or ship that reference model as a project asset. Verify the license and redistribution rights for every custom model, texture, and motion used by the application.

## Sources

- [Motion Browser handbook section](https://connect.perxona.ai/#motion-browser)
- [VRM Uploader handbook section](https://connect.perxona.ai/#vrm-uploader)
- [Motion Browser README](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/tools/motion-browser/README.md)
- [Motion Browser API source](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/tools/motion-browser/src/lib/api.ts)
- [Motion Browser motion hook](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/tools/motion-browser/src/hooks/use-motions.ts)
- [Connect OpenAPI specification](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/docs/openapi.yaml)
