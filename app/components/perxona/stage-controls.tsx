'use client';

import { useState } from 'react';
import {
  Brain,
  Camera,
  CircleStop,
  Ear,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PresenterActions, PresenterState } from '@/lib/perxona/use-presenter';

type StageControlsProps = {
  state: PresenterState;
  actions: PresenterActions;
};

const FOV_DEFAULTS = { horizontal: 30, vertical: 0, distance: 3 };

/** Camera, audio, and Idle/Listening/Thinking state controls for the stage. */
export function StageControls({ state, actions }: StageControlsProps) {
  const [fov, setFov] = useState(FOV_DEFAULTS);
  const [fovOpen, setFovOpen] = useState(false);

  const updateFov = (patch: Partial<typeof FOV_DEFAULTS>) => {
    const next = { ...fov, ...patch };
    setFov(next);
    actions.setCameraFOV(next);
  };

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
      <div className="flex gap-1 rounded-full border border-white/10 bg-black/35 p-1 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            actions.setCameraAngle(
              state.cameraAngle === 'fullbody' ? 'halfbody' : 'fullbody',
            )
          }
          aria-label={`Switch to ${state.cameraAngle === 'fullbody' ? 'half body' : 'full body'} framing`}
          className="rounded-full"
        >
          <Video />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setFovOpen((open) => !open)}
          aria-expanded={fovOpen}
          aria-label="Camera field of view"
          className="rounded-full"
        >
          <Camera />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => actions.setMuted(!state.muted)}
          aria-label={state.muted ? 'Unmute avatar' : 'Mute avatar'}
          aria-pressed={state.muted}
          className="rounded-full"
        >
          {state.muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => actions.setListening(!state.listening)}
          aria-label="Toggle listening state"
          aria-pressed={state.listening}
          className={`rounded-full ${state.listening ? 'text-primary' : ''}`}
        >
          <Ear />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => actions.setThinking(!state.thinking)}
          aria-label="Toggle thinking state"
          aria-pressed={state.thinking}
          className={`rounded-full ${state.thinking ? 'text-primary' : ''}`}
        >
          <Brain />
        </Button>
        {state.speaking && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.interrupt()}
            aria-label="Interrupt presentation"
            className="rounded-full text-destructive"
          >
            <CircleStop />
          </Button>
        )}
      </div>

      {fovOpen && (
        <div className="grid w-52 gap-2 rounded-xl border border-white/10 bg-black/45 p-3 text-[11px] text-muted-foreground backdrop-blur">
          <FovSlider
            label="Horizontal"
            min={10}
            max={90}
            value={fov.horizontal}
            onChange={(horizontal) => updateFov({ horizontal })}
          />
          <FovSlider
            label="Vertical"
            min={-30}
            max={30}
            value={fov.vertical}
            onChange={(vertical) => updateFov({ vertical })}
          />
          <FovSlider
            label="Distance"
            min={1}
            max={10}
            value={fov.distance}
            onChange={(distance) => updateFov({ distance })}
          />
        </div>
      )}
    </div>
  );
}

function FovSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex justify-between">
        {label}
        <span className="text-foreground">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full accent-primary"
      />
    </label>
  );
}
