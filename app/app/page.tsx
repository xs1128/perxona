'use client';

import { useState } from 'react';

import { Console } from '@/components/companion/console';
import { Hero } from '@/components/companion/hero';
import { Session } from '@/components/companion/session';
import { MIA_PRESCRIPTION } from '@/lib/companion/defaults';
import type { Prescription } from '@/lib/companion/types';
import { useCompanionSession } from '@/lib/companion/use-companion-session';

/**
 * Three screens on one vertical rail: the landing page, the clinician console,
 * and the Perxona stage. Advancing translates the rail rather than swapping
 * routes, so each screen rises out of the one before it.
 */
const STAGES = ['hero', 'console', 'session'] as const;

type Stage = (typeof STAGES)[number];

export default function Home() {
  const [stage, setStage] = useState<Stage>('hero');
  const [prescription, setPrescription] =
    useState<Prescription>(MIA_PRESCRIPTION);

  const session = useCompanionSession(prescription);

  const openConsole = () => {
    setStage('console');
    // Warm the Perxona runtime now so `begin()` stays inside its own click.
    session.preload();
  };

  const begin = () => {
    setStage('session');
    void session.begin();
  };

  return (
    <main className="solace-rail bg-[#07222b]">
      <div
        className="solace-rail-track"
        style={{ transform: `translateY(-${STAGES.indexOf(stage) * 100}dvh)` }}
      >
        <Hero onAdvance={openConsole} />

        <Console
          prescription={prescription}
          onChange={setPrescription}
          onBack={() => setStage('hero')}
          onBegin={begin}
        />

        <Session session={session} onExit={() => setStage('console')} />
      </div>
    </main>
  );
}
