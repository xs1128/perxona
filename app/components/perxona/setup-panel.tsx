'use client';

import { LoaderCircle, RefreshCw, TriangleAlert, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { KNOWN_AVATARS } from '@/lib/perxona/catalog';
import type { useCatalog } from '@/lib/perxona/use-catalog';
import type { ConnectConfig, Region } from '@/lib/perxona/types';

type SetupPanelProps = {
  config: ConnectConfig;
  onChange: (patch: Partial<ConnectConfig>) => void;
  catalog: ReturnType<typeof useCatalog>;
  onLoadCatalog: () => void;
  onLaunch: () => void;
  onUseDemo: () => void;
  connecting: boolean;
  error: string | null;
};

/** Built-in avatars shown by name, even before the org catalog is loaded. */
/** Picks from the loaded catalog when it is available, types an ID when not. */
function IdField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-xs text-muted-foreground">
      {label}
      {options.length > 0 ? (
        <NativeSelect
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full"
        >
          <NativeSelectOption value="">{placeholder}</NativeSelectOption>
          {options.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function SetupPanel({
  config,
  onChange,
  catalog,
  onLoadCatalog,
  onLaunch,
  onUseDemo,
  connecting,
  error,
}: SetupPanelProps) {
  const message = error ?? catalog.error;

  // Prefer the org catalog once it's loaded; otherwise fall back to the
  // built-in avatar list so the field is always a name-based dropdown.
  const avatarOptions =
    catalog.avatars.length > 0 ? catalog.avatars : KNOWN_AVATARS;

  return (
    <div className="z-20 m-auto w-full max-w-md p-6 sm:p-10">
      <div className="mb-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
          Live connection
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Launch a 3D avatar
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Load your organization catalog, or type IDs directly. The Publishable
          key stays in this browser tab and is never saved.
        </p>
      </div>

      <div className="grid gap-3">
        <label
          htmlFor="region"
          className="grid gap-1.5 text-xs text-muted-foreground"
        >
          Region
          <NativeSelect
            id="region"
            value={config.region}
            onChange={(event) =>
              onChange({ region: event.target.value as Region })
            }
            className="w-full"
          >
            <NativeSelectOption value="asia">Asia</NativeSelectOption>
            <NativeSelectOption value="eu">Europe</NativeSelectOption>
          </NativeSelect>
        </label>

        <label
          htmlFor="connect-key"
          className="grid gap-1.5 text-xs text-muted-foreground"
        >
          Publishable key
          <div className="flex gap-2">
            <Input
              id="connect-key"
              type="password"
              value={config.connectKey}
              onChange={(event) => onChange({ connectKey: event.target.value })}
              placeholder="pxc_..."
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadCatalog}
              disabled={catalog.loading || !config.connectKey}
              className="h-8 shrink-0 px-3"
            >
              {catalog.loading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Catalog
            </Button>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <IdField
            id="avatar-id"
            label="Avatar"
            value={config.avatarId}
            onChange={(avatarId) => onChange({ avatarId })}
            options={avatarOptions}
            placeholder="Choose an avatar…"
          />
          <IdField
            id="scene-id"
            label="Scene"
            value={config.sceneId}
            onChange={(sceneId) => onChange({ sceneId })}
            options={catalog.scenes}
            placeholder="Required"
          />
        </div>

        <IdField
          id="voice-id"
          label="Voice"
          value={config.voiceId}
          onChange={(voiceId) => onChange({ voiceId })}
          options={catalog.voices.map((voice) => ({
            id: voice.id,
            name: voice.languages.length
              ? `${voice.name} — ${voice.languages.join(', ')}`
              : voice.name,
          }))}
          placeholder="Optional — required to speak"
        />
      </div>

      {message && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Button
          type="button"
          onClick={onLaunch}
          disabled={connecting}
          className="h-10 flex-1 rounded-xl"
        >
          {connecting ? <LoaderCircle className="animate-spin" /> : <Volume2 />}
          Launch avatar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onUseDemo}
          className="h-10 rounded-xl px-4"
        >
          Voice-only demo
        </Button>
      </div>
    </div>
  );
}
