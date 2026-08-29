# Perxona Connect Kit Research

This repository contains English research notes for building with Perxona Connect Kit. It documents the browser Presenter, Connect REST API, supported connection patterns, Motion Browser, Motion IDs, and custom VRM constraints.

Start with the [documentation index](docs/perxona-connect-kit/README.md).

## Documentation

- [Presenter SDK reference](docs/perxona-connect-kit/01-presenter-sdk.md)
- [Connect REST API reference](docs/perxona-connect-kit/02-connect-api.md)
- [Connection and integration patterns](docs/perxona-connect-kit/03-integration-patterns.md)
- [Motion Browser, Motion IDs, and custom VRM](docs/perxona-connect-kit/04-motion-browser-and-vrm.md)

Research was last verified on 2026-08-29. Recheck the official sources before implementation because APIs, access restrictions, pricing, and preview behavior may change.

## Minimal demo

The runnable single-screen Presenter demo is in [`app/`](app/). It works immediately in browser-voice demo mode. To use a live Perxona Avatar, open **Setup** and enter a domain-restricted Publishable key plus the target Avatar, Scene, and optional Voice IDs.

```bash
cd app
npm install
npm run dev
```

The demo keeps the Publishable key in memory only. Do not use a Secret key in the browser.
