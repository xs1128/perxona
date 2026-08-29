'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings2, Sparkles, TriangleAlert, X } from 'lucide-react';

import { Composer } from '@/components/perxona/composer';
import { MotionPicker } from '@/components/perxona/motion-picker';
import { SetupPanel } from '@/components/perxona/setup-panel';
import { StageControls } from '@/components/perxona/stage-controls';
import { Button } from '@/components/ui/button';
import { sanitizeMotionMarkup } from '@/lib/perxona/presenter';
import type {
  ConnectConfig,
  PresentOptions,
  PresentationEmotion,
  PresentationIntensity,
} from '@/lib/perxona/types';
import { useCatalog } from '@/lib/perxona/use-catalog';
import { usePresenter } from '@/lib/perxona/use-presenter';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';

const DEFAULT_MESSAGE = 'Hello! Welcome to my Perxona experience.';

const INITIAL_CONFIG: ConnectConfig = {
  region: 'asia',
  connectKey: import.meta.env.VITE_PERXONA_CONNECT_PUBLISHABLE_KEY ?? '',
  avatarId: import.meta.env.VITE_PERXONA_AVATAR_ID ?? '',
  sceneId: import.meta.env.VITE_PERXONA_SCENE_ID ?? '',
  voiceId: import.meta.env.VITE_PERXONA_VOICE_ID ?? '',
};

export default function Home() {
  const { ref, state, actions } = usePresenter();
  const catalog = useCatalog();

  const [config, setConfig] = useState<ConnectConfig>(INITIAL_CONFIG);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [emotion, setEmotion] = useState<PresentationEmotion | ''>('');
  const [intensity, setIntensity] = useState<PresentationIntensity>('neutral');
  const [setupOpen, setSetupOpen] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [demoSpeaking, setDemoSpeaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const mic = useSpeechRecognition({
    onResult: (transcript) =>
      setMessage((current) => `${current} ${transcript}`.trim()),
  });

  // Mirror microphone capture into the avatar's Listening state.
  useEffect(() => {
    if (liveMode) actions.setListening(mic.listening);
  }, [actions, liveMode, mic.listening]);

  const credentials = useMemo(
    () => ({ region: config.region, publishableKey: config.connectKey }),
    [config.region, config.connectKey],
  );

  const patchConfig = useCallback((patch: Partial<ConnectConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const launch = async () => {
    if (!config.connectKey || !config.avatarId || !config.sceneId) {
      setNotice('Key, Avatar, and Scene are required');
      return;
    }

    setNotice(null);
    const connected = await actions.connect(config.region, config.connectKey, {
      avatarId: config.avatarId,
      sceneId: config.sceneId,
      voiceId: config.voiceId || undefined,
    });

    if (connected) {
      setLiveMode(true);
      setSetupOpen(false);
      void catalog.loadMotions(credentials, config.avatarId);
    }
  };

  const useDemo = () => {
    window.speechSynthesis.cancel();
    actions.interrupt();
    setLiveMode(false);
    setSetupOpen(false);
    setNotice(null);
  };

  const presentOptions: PresentOptions | undefined = emotion
    ? { emotion, intensity }
    : undefined;

  /** Drops motion tags that are not in the selected Avatar's catalog. */
  const validateMarkup = (content: string) => {
    if (catalog.motionIds.size === 0) return content;
    const { sanitized, rejected } = sanitizeMotionMarkup(
      content,
      catalog.motionIds,
    );
    if (rejected.length > 0) {
      setNotice(
        `Removed ${rejected.length} motion tag${rejected.length === 1 ? '' : 's'} not available to this Avatar`,
      );
    }
    return sanitized;
  };

  const speak = async () => {
    const content = message.trim();
    if (!content) return;

    if (!liveMode) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        content.replace(/\[MOTION[^\]]*\]/g, ''),
      );
      utterance.onstart = () => setDemoSpeaking(true);
      utterance.onend = () => setDemoSpeaking(false);
      utterance.onerror = () => {
        setDemoSpeaking(false);
        setNotice('Browser speech is unavailable');
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    setNotice(null);
    await actions.resumeAudio();
    await actions.present(validateMarkup(content), presentOptions);
  };

  /** Pattern F: play externally produced audio through the avatar. */
  const speakAudioFile = async (file: File) => {
    const content = message.trim();
    if (!liveMode) {
      setNotice('Audio playback needs a live Perxona connection');
      return;
    }
    if (!content) {
      setNotice('Add the matching text — it drives motion and display text');
      return;
    }

    setNotice(null);
    await actions.resumeAudio();
    const audio = await file.arrayBuffer();
    await actions.presentWithAudio(
      audio,
      validateMarkup(content),
      presentOptions,
    );
  };

  const statusText = !liveMode
    ? demoSpeaking
      ? 'Speaking in demo mode'
      : 'No avatar — browser voice only'
    : state.phase === 'error'
      ? (state.error ?? 'Presenter error')
      : state.phase === 'connecting'
        ? state.progress
          ? `Loading ${state.progress.asset} — ${state.progress.percentage}%`
          : 'Connecting to Perxona'
        : state.phase === 'live'
          ? state.performanceState
          : 'Connect to load a 3D avatar';

  const dotClass =
    state.phase === 'error'
      ? 'bg-red-400'
      : state.phase === 'connecting'
        ? 'animate-pulse bg-amber-300'
        : 'bg-emerald-400';

  const banner = notice ?? (liveMode ? state.error : null);

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
            <SetupPanel
              config={config}
              onChange={patchConfig}
              catalog={catalog}
              onLoadCatalog={() => void catalog.load(credentials)}
              onLaunch={() => void launch()}
              onUseDemo={useDemo}
              connecting={state.phase === 'connecting'}
              error={notice ?? state.error}
            />
          ) : (
            <>
              {!liveMode && (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,58,237,.19),transparent_34%)]" />
                  <div className="stage-grid absolute inset-0 opacity-40" />
                  <div className="relative z-10 m-auto grid place-items-center">
                    <div
                      className={`avatar-orbit ${demoSpeaking ? 'is-speaking' : ''}`}
                      aria-hidden="true"
                    >
                      <div className="avatar-core">
                        <span>P</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {liveMode && <StageControls state={state} actions={actions} />}

              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-4">
                {state.caption && (
                  <p className="max-w-xl rounded-xl bg-black/55 px-3 py-2 text-center text-sm leading-6 backdrop-blur">
                    {state.caption}
                  </p>
                )}
                <div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/25 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
                  <span className={`size-1.5 rounded-full ${dotClass}`} />
                  <span aria-live="polite">{statusText}</span>
                </div>
              </div>
            </>
          )}

          <div
            className={`absolute inset-0 z-10 ${liveMode && !setupOpen ? 'block' : 'hidden'}`}
          >
            {/* @ts-expect-error sv-presenter is provided by the Perxona runtime. */}
            <sv-presenter ref={ref} className="block h-full w-full" />
          </div>
        </section>

        {banner && !setupOpen && (
          <p className="mx-auto mb-3 flex w-full max-w-2xl items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
            <TriangleAlert
              className="mt-px size-3.5 shrink-0"
              aria-hidden="true"
            />
            {banner}
          </p>
        )}

        <div className="grid gap-3">
          <Composer
            message={message}
            onMessageChange={setMessage}
            emotion={emotion}
            onEmotionChange={setEmotion}
            intensity={intensity}
            onIntensityChange={setIntensity}
            onSubmit={() => void speak()}
            onReset={() => setMessage(DEFAULT_MESSAGE)}
            onAudioFile={(file) => void speakAudioFile(file)}
            busy={state.phase === 'connecting'}
            sourceLabel={liveMode ? 'Perxona Presenter' : 'Browser voice demo'}
            mic={mic}
          />

          {liveMode && (
            <div className="mx-auto w-full max-w-2xl">
              <MotionPicker
                motions={catalog.motions}
                loading={catalog.motionsLoading}
                disabled={state.phase !== 'live'}
                onPlay={(motionId) => void actions.playMotion(motionId)}
                onInsert={(markup) =>
                  setMessage((current) => `${current} ${markup}`.trim())
                }
                onRefresh={() =>
                  void catalog.loadMotions(credentials, config.avatarId)
                }
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
