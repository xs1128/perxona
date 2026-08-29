'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  fetchAvatars,
  fetchMotions,
  fetchScenes,
  fetchVoices,
  type CatalogCredentials,
} from './catalog';
import type { Avatar, Motion, Scene, Voice } from './types';

/**
 * Loads the organization's Avatar, Scene, Voice, and Motion catalogs so IDs can
 * be picked instead of typed. Catalog IDs are organization- and region-specific.
 */
export function useCatalog() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [motionsAvatarId, setMotionsAvatarId] = useState('');
  const [loading, setLoading] = useState(false);
  const [motionsLoading, setMotionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (credentials: CatalogCredentials) => {
    if (!credentials.publishableKey) {
      setError('Enter a Publishable key before loading the catalog');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextAvatars, nextScenes, nextVoices] = await Promise.all([
        fetchAvatars(credentials),
        fetchScenes(credentials),
        fetchVoices(credentials),
      ]);
      setAvatars(nextAvatars);
      setScenes(nextScenes);
      setVoices(nextVoices);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load the Perxona catalog',
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMotions = useCallback(
    async (credentials: CatalogCredentials, avatarId: string) => {
      if (!credentials.publishableKey || !avatarId) return false;

      setMotionsLoading(true);
      setError(null);

      try {
        const next = await fetchMotions(credentials, avatarId);
        setMotions(next);
        setMotionsAvatarId(avatarId);
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Could not load motions',
        );
        return false;
      } finally {
        setMotionsLoading(false);
      }
    },
    [],
  );

  /** Valid IDs for the Avatar the motions were loaded for. */
  const motionIds = useMemo(
    () => new Set(motions.map((motion) => motion.id)),
    [motions],
  );

  return {
    avatars,
    scenes,
    voices,
    motions,
    motionsAvatarId,
    motionIds,
    loading,
    motionsLoading,
    error,
    load,
    loadMotions,
  };
}
