'use client';

import { useMemo, useState } from 'react';
import { Copy, LoaderCircle, Play, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motionMarkup } from '@/lib/perxona/presenter';
import type { Motion } from '@/lib/perxona/types';

type MotionPickerProps = {
  motions: Motion[];
  loading: boolean;
  disabled: boolean;
  onPlay: (motionId: string) => void;
  onInsert: (markup: string) => void;
  onRefresh: () => void;
};

/**
 * Motion IDs belong to one Avatar. This lists the loaded Avatar's motions and
 * emits validated `[MOTION id:1]` markup — never a hand-written ID.
 */
export function MotionPicker({
  motions,
  loading,
  disabled,
  onPlay,
  onInsert,
  onRefresh,
}: MotionPickerProps) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? motions.filter(
          (motion) =>
            motion.name.toLowerCase().includes(needle) ||
            motion.category.toLowerCase().includes(needle),
        )
      : motions;

    const groups = new Map<string, Motion[]>();
    for (const motion of matched) {
      const bucket = groups.get(motion.category) ?? [];
      bucket.push(motion);
      groups.set(motion.category, bucket);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [motions, query]);

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              motions.length
                ? `Search ${motions.length} motions`
                : 'No motions loaded'
            }
            aria-label="Search motions"
            className="pl-8"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading || disabled}
        >
          {loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          Load
        </Button>
      </div>

      {motions.length === 0 ? (
        <p className="px-1 py-3 text-xs leading-5 text-muted-foreground">
          Load the motions for the selected Avatar. Motion IDs are
          avatar-specific and cannot be reused across Avatars.
        </p>
      ) : (
        <div className="max-h-56 overflow-y-auto pr-1">
          {grouped.map(([category, items]) => (
            <div key={category} className="mb-3 last:mb-0">
              <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {category}
              </p>
              <ul className="grid gap-0.5">
                {items.map((motion) => (
                  <li
                    key={motion.id}
                    className="flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-muted/50"
                  >
                    <span className="flex-1 truncate text-xs" title={motion.id}>
                      {motion.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onPlay(motion.id)}
                      disabled={disabled}
                      aria-label={`Play ${motion.name}`}
                    >
                      <Play />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onInsert(motionMarkup(motion.id))}
                      aria-label={`Insert markup for ${motion.name}`}
                    >
                      <Copy />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
