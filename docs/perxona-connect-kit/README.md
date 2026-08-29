# Perxona Connect Kit Research

[Repository README](../../README.md) · [Next: Presenter SDK →](01-presenter-sdk.md)

Research date: 2026-08-29

Primary example region: Asia (`https://console.perxona.ai/asia`)

This documentation summarizes the official Perxona Connect Kit handbook,
GitHub repository, OpenAPI contract, Motion Browser source, and
`@perxona/presenter-types` version 0.3.0.

## Documents

1. [Presenter SDK reference](01-presenter-sdk.md)
   - Every current `<sv-presenter>` method
   - Events, states, options, and result codes
   - Motion Markup Language
2. [Connect REST API](02-connect-api.md)
   - Authentication and regional base URLs
   - Complete published endpoint inventory
   - Official Express sample adapter routes
3. [Integration patterns](03-integration-patterns.md)
   - Recommended backend/browser architecture
   - Perxona Chatbot and bring-your-own LLM/TTS flows
   - Credentials, deployment, and security boundaries
4. [Motion Browser and custom VRM](04-motion-browser-and-vrm.md)
   - How motion IDs are obtained and used
   - Motion Browser behavior and pagination caveat
   - Custom VRM requirements and current beta limitations

## What Connect Kit is

Connect Kit has two main integration surfaces:

- **Connect REST API** manages catalogs, voices, presentations, Chatbots,
  and custom Avatar assets.
- **`<sv-presenter>` Web Component** renders and animates a selected Avatar
  in the browser, synthesizes or plays speech, performs motions, and reports
  runtime events.

The official architecture assigns three responsibilities:

```text
Your backend                          Browser
- stores Connect credentials          - renders your product UI
- sends the Secret key                - receives the Publishable key
            |                         |
            v                         v
      Connect API  <----------------  <sv-presenter>
      assets · voices · presentation  initializes · speaks · animates
      chatbots                        handles playback and lip-sync
```

Only a Publishable Connect key may enter the browser. Secret-key operations
must remain on an application backend protected by the application's own
authorization.

## Important findings

- The Presenter API table visible in the handbook is not exhaustive. The
  current official type package exposes additional methods such as
  `playMotion()`, `setListening()`, `setThinking()`, camera controls, and
  audio muting.
- Motion IDs are not hard-coded in the public GitHub repository. They are
  returned dynamically for each Avatar by the Connect API.
- The official Express starter is intentionally demo-oriented. Its proxy
  routes do not implement end-user authentication, tenant isolation, or rate
  limiting.
- The OpenAPI contract publishes a VRM upload endpoint, but the current
  handbook directs closed-beta users to request an assisted upload from a
  Perxona team member. Confirm self-service upload access with Perxona before
  relying on that endpoint.
- Custom uploaded VRM Avatars currently play body motions, but the handbook
  says facial animation and lip-sync are not yet active for those models.

## Primary sources

- [Connect Kit Developer Handbook](https://connect.perxona.ai/)
- [Official GitHub repository](https://github.com/XRSPACE-Inc/perxona-connect-kit)
- [Express starter documentation](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/README.md)
- [Connect OpenAPI contract](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/docs/openapi.yaml)
- [Motion Browser documentation](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/tools/motion-browser/README.md)
- [`@perxona/presenter-types` 0.3.0](https://unpkg.com/@perxona/presenter-types@0.3.0/index.d.ts)
