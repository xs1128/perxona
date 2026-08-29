# Repository Instructions

## Purpose

This repository is an English-language research reference for Perxona Connect Kit. It currently contains documentation, not an application implementation.

## Documentation map

- Start at `README.md`.
- The detailed index is `docs/perxona-connect-kit/README.md`.
- Presenter methods and events are in `docs/perxona-connect-kit/01-presenter-sdk.md`.
- REST endpoints are in `docs/perxona-connect-kit/02-connect-api.md`.
- Supported connection architectures are in `docs/perxona-connect-kit/03-integration-patterns.md`.
- Motion discovery and VRM constraints are in `docs/perxona-connect-kit/04-motion-browser-and-vrm.md`.

## Working rules

- Write repository documentation in English.
- Preserve the distinction between researched facts, source-code observations, and recommendations.
- Prefer official Perxona documentation, the XRSPACE-Inc repository, the published OpenAPI contract, and official package type declarations.
- Include a verification date for facts that may change, especially access, rate limits, preview credits, and beta features.
- Do not invent Motion IDs. Query the motion endpoint for the specific organization and Avatar.
- Never commit Connect keys, tokens, credentials, downloaded proprietary assets, or customer data.
- A Publishable key may be used only in browser-facing code and should have allowed-domain restrictions. A Secret key must remain on a trusted backend.
- Keep the Perxona API and Presenter CDN in the same region.
- Do not start an application implementation unless the user explicitly requests one.
- When adding or renaming documentation, update both the root `README.md` and `docs/perxona-connect-kit/README.md`, and maintain adjacent navigation links.

## Validation

For documentation-only changes:

- check that relative Markdown links resolve;
- check that all files remain English;
- compare volatile technical claims against official sources;
- review `git diff --check` before committing.
