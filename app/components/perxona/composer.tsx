'use client';

import { useRef, type SyntheticEvent } from 'react';
import { LoaderCircle, Mic, RotateCcw, Send, Square, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  PRESENTATION_EMOTIONS,
  PRESENTATION_INTENSITIES,
  type PresentationEmotion,
  type PresentationIntensity,
} from '@/lib/perxona/types';

type ComposerProps = {
  message: string;
  onMessageChange: (message: string) => void;
  emotion: PresentationEmotion | '';
  onEmotionChange: (emotion: PresentationEmotion | '') => void;
  intensity: PresentationIntensity;
  onIntensityChange: (intensity: PresentationIntensity) => void;
  onSubmit: () => void;
  onReset: () => void;
  onAudioFile: (file: File) => void;
  busy: boolean;
  sourceLabel: string;
  mic: {
    supported: boolean;
    listening: boolean;
    interim: string;
    start: () => void;
    stop: () => void;
  };
};

/**
 * Message input plus the per-utterance levers: emotion, intensity, microphone
 * capture, and caller-supplied audio for `presentWithAudio()`.
 */
export function Composer({
  message,
  onMessageChange,
  emotion,
  onEmotionChange,
  intensity,
  onIntensityChange,
  onSubmit,
  onReset,
  onAudioFile,
  busy,
  sourceLabel,
  mic,
}: ComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/15 transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
        <Textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          aria-label="Message for the presenter"
          placeholder="What should your avatar say?"
          className="min-h-20 resize-none border-0 bg-transparent px-3 py-2.5 text-base shadow-none focus-visible:ring-0"
          maxLength={500}
        />

        {mic.interim && (
          <p className="px-3 pb-1 text-xs italic text-muted-foreground">
            {mic.interim}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-1 pt-2">
          <NativeSelect
            size="sm"
            value={emotion}
            onChange={(event) =>
              onEmotionChange(event.target.value as PresentationEmotion | '')
            }
            aria-label="Emotion"
          >
            <NativeSelectOption value="">No emotion</NativeSelectOption>
            {PRESENTATION_EMOTIONS.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <NativeSelect
            size="sm"
            value={intensity}
            onChange={(event) =>
              onIntensityChange(event.target.value as PresentationIntensity)
            }
            aria-label="Intensity"
            disabled={!emotion}
          >
            {PRESENTATION_INTENSITIES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <span className="ml-auto pl-2 text-[11px] text-muted-foreground">
            {sourceLabel}
          </span>

          {mic.supported && (
            <Button
              type="button"
              variant={mic.listening ? 'default' : 'ghost'}
              size="icon-sm"
              onPointerDown={mic.start}
              onPointerUp={mic.stop}
              onPointerLeave={() => mic.listening && mic.stop()}
              aria-label="Hold to talk"
              className="rounded-xl"
            >
              {mic.listening ? <Square /> : <Mic />}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => fileRef.current?.click()}
            aria-label="Speak an audio file through the avatar"
            className="rounded-xl text-muted-foreground"
          >
            <Upload />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAudioFile(file);
              event.target.value = '';
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onReset}
            aria-label="Reset message"
            className="rounded-xl text-muted-foreground"
          >
            <RotateCcw />
          </Button>
          <Button
            type="submit"
            size="icon-sm"
            disabled={!message.trim() || busy}
            aria-label="Speak message"
            className="rounded-xl"
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </form>
  );
}
