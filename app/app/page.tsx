'use client';

import { useState } from 'react';

import { Console } from '@/components/companion/console';
import { Hero } from '@/components/companion/hero';
import { Session } from '@/components/companion/session';
import { MIA_PRESCRIPTION } from '@/lib/companion/defaults';
import type { Prescription } from '@/lib/companion/types';

/**
 * Three screens on one vertical rail: the public page, the clinician console,
 * and the patient-facing session. Advancing translates the rail rather than
 * swapping routes, so the console rises into view out of the landing page.
 */
const STAGES = ['hero', 'console', 'session'] as const;

type Stage = (typeof STAGES)[number];

export default function Home() {
  const [stage, setStage] = useState<Stage>('hero');
  const [prescription, setPrescription] =
    useState<Prescription>(MIA_PRESCRIPTION);

  const index = STAGES.indexOf(stage);

  return (
    <main className="solace-rail bg-[#07222b]">
      <div
        className="solace-rail-track"
        style={{ transform: `translateY(-${index * 100}dvh)` }}
      >
        <Hero
          prescription={prescription}
          onAdvance={() => setStage('console')}
        />

        <Console
          prescription={prescription}
          onChange={setPrescription}
          onBack={() => setStage('hero')}
          onBegin={() => setStage('session')}
        />

        {/* Mounted only while in view so the Presenter is never a hidden tab. */}
        {stage === 'session' ? (
          <Session
            prescription={prescription}
            onExit={() => setStage('console')}
          />
        ) : (
          <div className="solace-panel" />
        )}
      </div>
    </main>
  );
}
