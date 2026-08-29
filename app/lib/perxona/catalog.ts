import { connectApiBaseUrl } from './presenter';
import type { Avatar, Motion, Region, Scene, Voice } from './types';

/**
 * Browser-side catalog reads with a Publishable key, the same pattern the
 * official Motion Browser uses. A Secret key must never reach this module.
 *
 * The Publishable key's allowed-domain list has to include the hostname this
 * runs on, or the API rejects the request.
 */
export type CatalogCredentials = {
  region: Region;
  publishableKey: string;
};

const PAGE_SIZE = 100;

type UnknownRecord = Record<string, unknown>;

function readString(record: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

/** The response envelope is not guaranteed, so accept the known shapes. */
function readItems(body: unknown): UnknownRecord[] {
  if (Array.isArray(body)) return body as UnknownRecord[];
  if (!body || typeof body !== 'object') return [];
  const record = body as UnknownRecord;
  const items = record.items ?? record.data ?? record.results;
  return Array.isArray(items) ? (items as UnknownRecord[]) : [];
}

async function fetchAllPages(
  { region, publishableKey }: CatalogCredentials,
  path: string,
  signal?: AbortSignal,
) {
  const base = connectApiBaseUrl(region);
  const collected: UnknownRecord[] = [];

  // List endpoints are paginated. Walk every page — the reference Motion
  // Browser stops after the first, which silently truncates large catalogs.
  for (let page = 1; ; page += 1) {
    const url = `${base}${path}?page=${page}&page_size=${PAGE_SIZE}`;
    const response = await fetch(url, {
      headers: { 'X-Connect-Key': publishableKey },
      signal,
    });

    if (!response.ok) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? `Connect key rejected for ${path} (${response.status}). Check that it is a Publishable key for the ${region} region and that this hostname is allowed.`
          : `Catalog request failed: ${response.status} ${path}`,
      );
    }

    const items = readItems(await response.json());
    collected.push(...items);

    if (items.length < PAGE_SIZE) break;
    if (page >= 25) break; // Stop runaway paging on an unexpected envelope.
  }

  return collected;
}

export async function fetchAvatars(
  credentials: CatalogCredentials,
  signal?: AbortSignal,
): Promise<Avatar[]> {
  const items = await fetchAllPages(credentials, '/assets/avatars', signal);
  return items.map((item) => ({
    id: readString(item, 'avatar_id', 'id'),
    name: readString(item, 'name', 'display_name') || 'Untitled avatar',
    thumbnailUrl: readString(item, 'thumbnail_url', 'thumbnail') || undefined,
  }));
}

export async function fetchScenes(
  credentials: CatalogCredentials,
  signal?: AbortSignal,
): Promise<Scene[]> {
  const items = await fetchAllPages(credentials, '/assets/scenes', signal);
  return items.map((item) => ({
    id: readString(item, 'scene_id', 'id'),
    name: readString(item, 'name', 'display_name') || 'Untitled scene',
    thumbnailUrl: readString(item, 'thumbnail_url', 'thumbnail') || undefined,
  }));
}

export async function fetchVoices(
  credentials: CatalogCredentials,
  signal?: AbortSignal,
): Promise<Voice[]> {
  const items = await fetchAllPages(credentials, '/voices', signal);
  return items.map((item) => {
    // The voice catalog returns its identifier as `id`, not `voice_id`.
    const languages = item.languages;
    return {
      id: readString(item, 'id', 'voice_id'),
      name: readString(item, 'name', 'display_name') || 'Untitled voice',
      languages: Array.isArray(languages)
        ? languages.filter((entry): entry is string => typeof entry === 'string')
        : [],
    };
  });
}

/** Reads a `category:` tag the way the official Motion Browser does. */
function readCategory(item: UnknownRecord) {
  const tags = item.tags;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.toLowerCase().startsWith('category:')) {
        return tag.slice('category:'.length).trim() || 'Other';
      }
    }
  }
  return readString(item, 'category') || 'Other';
}

/**
 * Motions are avatar-specific. Never carry an ID from one Avatar to another
 * without revalidating it against that Avatar's list.
 */
export async function fetchMotions(
  credentials: CatalogCredentials,
  avatarId: string,
  signal?: AbortSignal,
): Promise<Motion[]> {
  const items = await fetchAllPages(
    credentials,
    `/assets/avatars/${encodeURIComponent(avatarId)}/motions`,
    signal,
  );

  return items
    .map((item) => ({
      id: readString(item, 'motion_id', 'id'),
      name: readString(item, 'name', 'display_name') || 'Untitled motion',
      category: readCategory(item),
    }))
    .filter((motion) => motion.id.length > 0);
}
