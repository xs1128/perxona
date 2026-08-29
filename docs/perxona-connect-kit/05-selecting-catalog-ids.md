# Selecting Avatar, Scene, Voice, and Motion IDs

[← Motion Browser and custom VRM](04-motion-browser-and-vrm.md) · [Documentation index](README.md)

Verification date: 2026-08-29

Perxona catalog IDs are organization- and region-specific. There is no
universal Avatar, Scene, Voice, or Motion ID that is safe to copy into every
application. Query the target organization and keep the Perxona API and
Presenter CDN in the same region.

This repository intentionally does not commit a live organization catalog.
Catalog responses can contain customer-specific asset names, descriptions,
organization identifiers, and proprietary CDN URLs.

## ID map

The current API surfaces use different field names for different asset types.

| App setting | Catalog endpoint | Response field | Required for the minimal demo |
|---|---|---|---:|
| Avatar ID | `GET /assets/avatars` | `avatar_id` | Yes |
| Scene ID | `GET /assets/scenes` | `scene_id` | Yes |
| Voice ID | `GET /voices` | `id` | Required for `present()` speech |
| Motion ID | `GET /assets/avatars/{avatar_id}/motions` | `motion_id` | No |

The Voice catalog currently returns its identifier as `id`, even though the
Presenter target property is named `voiceId`. Treat this response shape as a
volatile API fact and verify it again when upgrading the Connect contract.

## Query a catalog safely

Set the Publishable key only in the current shell. Do not paste a Secret key
into these browser-oriented examples, documentation, commits, or screenshots.

```bash
export PXC_KEY='paste-publishable-key-here'
export PERXONA_REGION='asia'
export PERXONA_API_BASE="https://console.perxona.ai/${PERXONA_REGION}/api/v1/connect"
```

Use `eu` instead of `asia` for an EU organization.

### Avatars

```bash
curl -s "${PERXONA_API_BASE}/assets/avatars?page=1&page_size=100" \
  -H "X-Connect-Key: ${PXC_KEY}" \
  | jq -r '.items[] | [.avatar_id, .name] | @tsv'
```

### Scenes

```bash
curl -s "${PERXONA_API_BASE}/assets/scenes?page=1&page_size=100" \
  -H "X-Connect-Key: ${PXC_KEY}" \
  | jq -r '.items[] | [.scene_id, .name] | @tsv'
```

### Voices

```bash
curl -s "${PERXONA_API_BASE}/voices?page=1&page_size=100" \
  -H "X-Connect-Key: ${PXC_KEY}" \
  | jq -r '.items[] | [.id, .name, (.languages | join(","))] | @tsv'
```

### Motions for one Avatar

Motion IDs must always be queried for the selected Avatar. Never transfer a
Motion ID from one Avatar to another without validating it.

```bash
export PERXONA_AVATAR_ID='paste-selected-avatar-id-here'

curl -s "${PERXONA_API_BASE}/assets/avatars/${PERXONA_AVATAR_ID}/motions?page=1&page_size=100" \
  -H "X-Connect-Key: ${PXC_KEY}" \
  | jq -r '.items[] | [.motion_id, .name] | @tsv'
```

List endpoints are paginated. Continue through every reported page when a
complete inventory is required; do not assume the first 100 records are the
entire catalog.

## Choosing a set for the demo

Recommendations:

1. Choose an Avatar by its catalog name and thumbnail, then copy its
   `avatar_id`.
2. Choose a Scene by its catalog name and thumbnail, then copy its `scene_id`.
3. Choose a Voice whose `languages` list includes the language of the text the
   Avatar will speak, then copy the Voice object's `id`.
4. Enter those values in the demo's **Setup** panel and select the matching
   region.
5. Launch the Presenter and wait for the Ready state before submitting text.
6. Query motions only after the Avatar has been selected.

If `present()` reports `VOICE_NOT_CONFIGURED`, add a valid Voice ID and launch
the Presenter again. If the Connect key is rejected, check that it is a
Publishable key, belongs to the selected region, and allows the exact browser
hostname.

## Keeping a private inventory

For a fixed deployment, record the chosen IDs in private deployment
configuration or a customer-specific system outside this research repository.
If a local inventory is useful, keep it in an ignored file and use a table like
this:

| Type | ID | Name | Region | Verified date |
|---|---|---|---|---|
| Avatar | _queried value_ | _catalog name_ | `asia` or `eu` | YYYY-MM-DD |
| Scene | _queried value_ | _catalog name_ | `asia` or `eu` | YYYY-MM-DD |
| Voice | _queried value_ | _catalog name_ | `asia` or `eu` | YYYY-MM-DD |
| Motion | _queried value_ | _catalog name_ | `asia` or `eu` | YYYY-MM-DD |

Never store the Connect key in this table.

## Sources

- [Connect Kit Developer Handbook](https://connect.perxona.ai/)
- [Official Motion Browser documentation](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/tools/motion-browser/README.md)
- [Connect OpenAPI specification](https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/samples/express/docs/openapi.yaml)
