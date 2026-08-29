'use client';

import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  LoaderCircle,
  Pause,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

type Region = 'asia' | 'eu';
type AppStatus = 'ready' | 'connecting' | 'speaking' | 'error';

type PresentationResult = {
  success: boolean;
  code?: number;
  message?: string;
};

type PresenterElement = HTMLElement & {
  initializeWithConnectKey: (
    key: string,
    target: { avatarId: string; sceneId: string; voiceId?: string },
  ) => Promise<void>;
  resumeAudioPlayback: () => Promise<void>;
  present: (content: string) => Promise<PresentationResult>;
  interruptPresentation: () => void;
};

const presenterUrls: Record<Region, string> = {
  asia: 'https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js',
  eu: 'https://cdn.perxona.ai/eu/prod/latest/widget/entry/presenter.js',
};

const localPublishableKey =
  import.meta.env.VITE_PERXONA_CONNECT_PUBLISHABLE_KEY ?? '';
const localAvatarId = import.meta.env.VITE_PERXONA_AVATAR_ID ?? '';
const localSceneId = import.meta.env.VITE_PERXONA_SCENE_ID ?? '';
const localVoiceId = import.meta.env.VITE_PERXONA_VOICE_ID ?? '';

export default function Home() {
  const presenterRef = useRef<PresenterElement | null>(null);
  const [message, setMessage] = useState(
    'Hello! Welcome to my Perxona experience.',
  );
  const [status, setStatus] = useState<AppStatus>('ready');
  const [statusText, setStatusText] = useState('Connect to load a 3D avatar');
  const [setupOpen, setSetupOpen] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [region, setRegion] = useState<Region>('asia');
  const [connectKey, setConnectKey] = useState(localPublishableKey);
  const [avatarId, setAvatarId] = useState(localAvatarId);
  const [sceneId, setSceneId] = useState(localSceneId);
  const [voiceId, setVoiceId] = useState(localVoiceId);

  useEffect(() => {
    const presenter = presenterRef.current;
    if (!presenter) return;

    const handleStatus = (event: Event) => {
      const next = (event as CustomEvent<{ status?: string }>).detail?.status;
      if (next === 'Ready') {
        setStatus('ready');
        setStatusText('Live presenter ready');
      }
    };
    const handleStart = () => {
      setStatus('speaking');
      setStatusText('Speaking');
    };
    const handleEnd = () => {
      setStatus('ready');
      setStatusText('Live presenter ready');
    };
    const handleRejected = () => {
      setStatus('error');
      setStatusText('Connect key rejected');
    };

    presenter.addEventListener('PRESENTER_STATUS', handleStatus);
    presenter.addEventListener('PERFORMANCE_START', handleStart);
    presenter.addEventListener('ALL_PERFORMANCE_FINISHED', handleEnd);
    presenter.addEventListener('CONNECT_KEY_REJECTED', handleRejected);

    return () => {
      presenter.removeEventListener('PRESENTER_STATUS', handleStatus);
      presenter.removeEventListener('PERFORMANCE_START', handleStart);
      presenter.removeEventListener('ALL_PERFORMANCE_FINISHED', handleEnd);
      presenter.removeEventListener('CONNECT_KEY_REJECTED', handleRejected);
    };
  }, []);

  const loadPresenter = async () => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-perxona-presenter="${region}"]`,
    );

    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = presenterUrls[region];
        script.dataset.perxonaPresenter = region;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Presenter engine failed to load'));
        document.head.appendChild(script);
      });
    }

    await customElements.whenDefined('sv-presenter');
  };

  const connectLive = async () => {
    if (!connectKey || !avatarId || !sceneId) {
      setStatus('error');
      setStatusText('Key, Avatar ID, and Scene ID are required');
      return;
    }

    setStatus('connecting');
    setStatusText('Connecting to Perxona');

    try {
      await loadPresenter();
      const presenter = presenterRef.current;
      if (!presenter) throw new Error('Presenter is not mounted');

      await presenter.resumeAudioPlayback();
      await presenter.initializeWithConnectKey(connectKey, {
        avatarId,
        sceneId,
        voiceId: voiceId || undefined,
      });
      setLiveMode(true);
      setSetupOpen(false);
      setStatus('ready');
      setStatusText('Live presenter ready');
    } catch (error) {
      setStatus('error');
      setStatusText(
        error instanceof Error ? error.message : 'Could not connect to Perxona',
      );
    }
  };

  const speak = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || status === 'connecting') return;

    if (!liveMode) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.onstart = () => {
        setStatus('speaking');
        setStatusText('Speaking in demo mode');
      };
      utterance.onend = () => {
        setStatus('ready');
        setStatusText('No avatar — browser voice only');
      };
      utterance.onerror = () => {
        setStatus('error');
        setStatusText('Browser speech is unavailable');
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      const presenter = presenterRef.current;
      if (!presenter) throw new Error('Presenter is not ready');
      await presenter.resumeAudioPlayback();
      setStatus('speaking');
      setStatusText('Speaking');
      const result = await presenter.present(content);
      if (!result.success) {
        throw new Error(result.message || `Presentation failed (${result.code})`);
      }
    } catch (error) {
      setStatus('error');
      setStatusText(error instanceof Error ? error.message : 'Presentation failed');
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    presenterRef.current?.interruptPresentation?.();
    setStatus('ready');
    setStatusText(
      liveMode ? 'Live presenter ready' : 'No avatar — browser voice only',
    );
  };

  const useDemo = () => {
    stop();
    setLiveMode(false);
    setSetupOpen(false);
    setStatusText('No avatar — browser voice only');
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_rgba(139,92,246,.3)]">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <span className="font-semibold tracking-[-0.02em]">Perxona</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSetupOpen((open) => !open)}
            className="h-9 rounded-full px-3 text-muted-foreground hover:text-foreground"
            aria-expanded={setupOpen}
          >
            {setupOpen ? <X /> : <Settings2 />}
            {setupOpen ? 'Close' : 'Setup'}
          </Button>
        </header>

        <section className="relative my-5 flex min-h-[430px] flex-1 overflow-hidden rounded-[2rem] border border-white/8 bg-card shadow-2xl shadow-black/25 sm:my-7">
          {setupOpen ? (
            <div className="z-20 m-auto w-full max-w-md p-6 sm:p-10">
              <div className="mb-7">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  Live connection
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Launch a 3D avatar
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter your Perxona target. Your Publishable key stays in this
                  browser tab and is never saved.
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
                    value={region}
                    onChange={(event) => setRegion(event.target.value as Region)}
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
                  <Input
                    id="connect-key"
                    type="password"
                    value={connectKey}
                    onChange={(event) => setConnectKey(event.target.value)}
                    placeholder="pxc_..."
                    autoComplete="off"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="avatar-id"
                    className="grid gap-1.5 text-xs text-muted-foreground"
                  >
                    Avatar ID
                    <Input
                      id="avatar-id"
                      value={avatarId}
                      onChange={(event) => setAvatarId(event.target.value)}
                      placeholder="Required"
                    />
                  </label>
                  <label
                    htmlFor="scene-id"
                    className="grid gap-1.5 text-xs text-muted-foreground"
                  >
                    Scene ID
                    <Input
                      id="scene-id"
                      value={sceneId}
                      onChange={(event) => setSceneId(event.target.value)}
                      placeholder="Required"
                    />
                  </label>
                </div>
                <label
                  htmlFor="voice-id"
                  className="grid gap-1.5 text-xs text-muted-foreground"
                >
                  Voice ID <span className="sr-only">optional</span>
                  <Input
                    id="voice-id"
                    value={voiceId}
                    onChange={(event) => setVoiceId(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  onClick={connectLive}
                  disabled={status === 'connecting'}
                  className="h-10 flex-1 rounded-xl"
                >
                  {status === 'connecting' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Volume2 />
                  )}
                  Launch avatar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={useDemo}
                  className="h-10 rounded-xl px-4"
                >
                  Voice-only demo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,.19),transparent_34%)]" />
              <div className="stage-grid absolute inset-0 opacity-40" />
              <div className="relative z-10 m-auto grid place-items-center">
                <div
                  className={`avatar-orbit ${status === 'speaking' ? 'is-speaking' : ''}`}
                  aria-hidden="true"
                >
                  <div className="avatar-core">
                    <span>P</span>
                  </div>
                </div>
                <div className="mt-10 flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
                  <span
                    className={`size-1.5 rounded-full ${
                      status === 'error'
                        ? 'bg-red-400'
                        : status === 'connecting'
                          ? 'animate-pulse bg-amber-300'
                          : 'bg-emerald-400'
                    }`}
                  />
                  <span aria-live="polite">{statusText}</span>
                </div>
              </div>

              {status === 'speaking' && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={stop}
                  aria-label="Stop speaking"
                  className="absolute bottom-5 right-5 z-20 size-10 rounded-full border-white/10 bg-black/20"
                >
                  <Pause />
                </Button>
              )}
            </>
          )}

          <div
            className={`absolute inset-0 z-10 ${liveMode && !setupOpen ? 'block' : 'hidden'}`}
          >
            {/* @ts-expect-error sv-presenter is provided by the Perxona runtime. */}
            <sv-presenter ref={presenterRef} className="block h-full w-full" />
          </div>
        </section>

        <form onSubmit={speak} className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/15 transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
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
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="pl-2 text-[11px] text-muted-foreground">
                {liveMode ? 'Perxona Presenter' : 'Browser voice demo'}
              </span>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMessage('Hello! Welcome to my Perxona experience.')
                  }
                  aria-label="Reset message"
                  className="rounded-xl text-muted-foreground"
                >
                  <RotateCcw />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || status === 'connecting'}
                  aria-label="Speak message"
                  className="size-9 rounded-xl"
                >
                  {status === 'connecting' ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="mx-auto mt-3 flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {liveMode ? 'Live mode' : 'Demo mode'}
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
        </form>
      </div>
    </main>
  );
}
