# Connect API Reference

[← Presenter SDK](01-presenter-sdk.md) · [Documentation index](README.md) · [Integration patterns →](03-integration-patterns.md)

This document summarizes the public Connect API described by Perxona's official handbook, sample server, and OpenAPI specification. It was researched on 2026-08-29.

## Base URL and authentication

Use the regional Console host:

```text
https://console.perxona.ai/{region}/api/v1/connect
```

Supported regions documented by Perxona are `asia` and `eu`. Send the Connect key in every request:

```http
X-Connect-Key: pxc_...
```

Use a Secret key for server-to-server API calls. Do not embed it in browser code. A Publishable key is intended for the browser Presenter and tools such as Motion Browser; restrict it to the exact allowed hostnames in the Console.

> Both key types use the same `pxc_` prefix. Store and label them carefully because the prefix does not reveal whether a key is Secret or Publishable.

## Endpoint inventory

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Legacy login; deprecated |
| `POST` | `/auth/logout` | End a legacy authenticated session |
| `GET` | `/assets/avatars` | List avatars available to the organization |
| `GET` | `/assets/avatars/{avatar_id}` | Get one avatar |
| `GET` | `/assets/avatars/{avatar_id}/motions` | List motions supported by one avatar |
| `GET` | `/assets/scenes` | List available scenes |
| `GET` | `/assets/scenes/{scene_id}` | Get one scene |
| `POST` | `/assets/vrm/upload` | Upload a custom VRM avatar; availability is limited—see the VRM document |
| `GET` | `/voices` | List voices |
| `GET` | `/voices/{voice_id}` | Get one voice |
| `POST` | `/voice-tokens/tts` | Create a token for Perxona text-to-speech |
| `POST` | `/presentation` | Request a one-shot presentation |
| `GET` | `/chatbots` | List hosted chatbots |
| `POST` | `/chatbots` | Create a hosted chatbot |
| `GET` | `/chatbots/{chat_bot_id}` | Get one chatbot |
| `PATCH` | `/chatbots/{chat_bot_id}` | Update one chatbot |
| `DELETE` | `/chatbots/{chat_bot_id}` | Delete one chatbot |
| `POST` | `/chatbots/{chat_bot_id}/chat` | Send a message to a hosted chatbot |

The official Express sample also exposes knowledge-file operations through its own adapter. Confirm the live Connect API/OpenAPI version before depending on endpoints that are not present in the public specification.

## Pagination

List endpoints use page-based pagination. The documented defaults are:

- `page=1`
- `page_size=50`
- maximum `page_size=100`

Always continue requesting pages until the response indicates there are no more results. This matters for motions because the reference Motion Browser currently requests only the default first page.

## Assets

### Avatars

```http
GET /assets/avatars?page=1&page_size=100
GET /assets/avatars/{avatar_id}
GET /assets/avatars/{avatar_id}/motions?page=1&page_size=100
```

Motion IDs are not a universal static catalog. Query them for the selected Avatar ID. The motion records returned by the API include the `motion_id` used by Presenter markup and `playMotion()`.

### Scenes

```http
GET /assets/scenes?page=1&page_size=100
GET /assets/scenes/{scene_id}
```

Use the selected scene and avatar IDs in the Presenter target/configuration required by your application.

### VRM uploads

```http
POST /assets/vrm/upload
Content-Type: multipart/form-data
```

The public OpenAPI file describes this route, but the current handbook describes custom VRM onboarding as a closed beta assisted by Perxona staff. Do not assume self-service upload access without confirming it for the organization.

## Voices and speech

```http
GET /voices?page=1&page_size=100
GET /voices/{voice_id}
POST /voice-tokens/tts
```

Use a returned Voice ID as `voiceId` when calling `present()` if Perxona should synthesize the speech. If the application supplies its own decoded audio bytes to `presentWithAudio()`, omit `voiceId`.

## Presentation API

```http
POST /presentation
Content-Type: application/json
X-Connect-Key: pxc_...

{
  "avatar_id": "<avatar-id>",
  "message": "Hello from Perxona",
  "voice_id": "<optional-voice-id>",
  "emotion": "joy",
  "intensity": "neutral"
}
```

Required fields are `avatar_id` and `message`. `voice_id`, `emotion`, and `intensity` are optional. This is useful for a direct, server-issued presentation request. If a backend needs to drive an already-mounted browser Presenter, the application must also deliver the instruction to that browser through WebSocket, Server-Sent Events, or polling.

## Hosted chatbots

### Create

```http
POST /chatbots
Content-Type: multipart/form-data
```

Fields:

| Field | Required | Notes |
|---|---:|---|
| `name` | Yes | Chatbot name |
| `custom_instructions` | No | System behavior/instructions |
| `knowledge_file` | No | Knowledge document supported by the service |
| `tools` | No | JSON string describing configured tools |

Knowledge ingestion and tool creation are best-effort operations in the documented implementation. A partial failure is not described as rolling back the chatbot automatically, so callers should inspect the returned object and handle cleanup if needed.

### Read, update, and delete

```http
GET /chatbots?page=1&page_size=100
GET /chatbots/{chat_bot_id}
PATCH /chatbots/{chat_bot_id}
DELETE /chatbots/{chat_bot_id}
```

### Chat

```http
POST /chatbots/{chat_bot_id}/chat
Content-Type: application/json

{
  "message": "What can you help me with?"
}
```

Pass the returned reply text to the browser Presenter to speak and animate the answer.

## Documented rate limits

Rate limits can change, so treat these as the values found in the researched specification rather than permanent guarantees.

| Operation | Documented limit |
|---|---:|
| VRM upload | 5 requests per 60 seconds |
| Voice list/detail | 30 requests per second |
| TTS voice token | 5 requests per second |
| Presentation | 10 requests per second |
| Chatbot create/update | 5 requests per 60 seconds |
| Chatbot chat | 30 requests per 60 seconds |

Use backoff for `429` responses and avoid retrying non-idempotent creation requests blindly.

## Subscription and credit errors

The API specification distinguishes several billing/subscription cases:

| HTTP status | Code | Meaning |
|---:|---:|---|
| `400` | `1003` | Credits exhausted or subscription invalid; inspect error details |
| `403` | `14005` | No active subscription |

At the research date, the public specification indicated that preview credit enforcement was normally bypassed through 2026-09-20, subject to deployment configuration. This is temporary behavior and should not be designed into an application.

## Official Express adapter

The repository includes an Express reference server. Its local routes are:

| Method | Local route |
|---|---|
| `GET` | `/api/health` |
| `GET` | `/api/config` |
| `GET` | `/api/connect-key` |
| `GET` | `/api/voices` |
| `GET` | `/api/avatars` |
| `GET` | `/api/avatars/:id` |
| `GET` | `/api/avatars/:id/motions` |
| `GET` | `/api/scenes` |
| `GET` | `/api/scenes/:id` |
| `GET`, `POST` | `/api/chatbots` |
| `GET`, `PATCH`, `DELETE` | `/api/chatbots/:id` |
| `POST`, `DELETE` | `/api/chatbots/:id/knowledge` |
| `POST` | `/api/chatbots/:id/chat` |
| `POST` | `/api/chat` |

`POST /api/chat` is the placeholder for connecting an application-owned LLM and returns `501` until configured. The sample knowledge wrapper accepts `txt`, `pdf`, `doc`, `docx`, and `csv`, with a 1 MB decoded-size limit.

The sample is a development reference, not a hardened multi-user gateway: its request layer does not provide application authentication, per-user isolation, or rate limiting. Run it on localhost or add those controls before deployment. The sample requires Node.js 22 or later.

## Sources

- [Connect Kit handbook](https://connect.perxona.ai/)
- [API reference](https://connect.perxona.ai/#api-reference)
- [Official repository](https://github.com/XRSPACE-Inc/perxona-connect-kit)
- [Express sample README](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/README.md)
- [OpenAPI specification](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/docs/openapi.yaml)
