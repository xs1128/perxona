'use client';

import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';

import type { Prescription } from '@/lib/companion/types';

const NAV_LINKS = [
  { label: 'Home', dropdown: false },
  { label: 'For Clinicians', dropdown: true },
  { label: 'Safeguards', dropdown: false },
  { label: 'Evidence', dropdown: false },
  { label: 'Resources', dropdown: true },
];

/**
 * The public face of the product. Its only real job is to hand the clinician
 * into the console, so every prominent control advances the rail.
 */
export function Hero({
  prescription,
  onAdvance,
}: {
  prescription: Prescription;
  onAdvance: () => void;
}) {
  const boundaries = prescription.clinical_guardrails.hard_boundaries.length;
  const keywords =
    prescription.escalation_protocol.dashboard_alert_keywords.length;
  const anchors = prescription.clinical_guardrails.safe_anchors.length;

  return (
    <div className="solace-panel solace-scrollbar bg-[#e9eef0] p-3 sm:p-5">
      <div className="solace-ground relative isolate min-h-[calc(100dvh-24px)] overflow-hidden rounded-[26px] sm:min-h-[calc(100dvh-40px)] sm:rounded-[30px]">
        {/*
          Drop a photograph at `public/hero.jpg` to match the reference comp.
          Without one the file simply does not paint and the gradient stands
          on its own, so no fallback branch is needed.
        */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70 mix-blend-luminosity"
          style={{ backgroundImage: 'url(/hero.jpg)' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07222b]/90 via-[#07222b]/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#07222b]/80 to-transparent" />

        <div className="relative flex min-h-[calc(100dvh-24px)] flex-col sm:min-h-[calc(100dvh-40px)]">
          <nav className="flex items-center justify-between gap-6 px-6 py-6 sm:px-10 sm:py-8">
            <button
              type="button"
              onClick={onAdvance}
              className="flex items-center gap-2.5 text-white"
            >
              <SolaceMark />
              <span className="text-[21px] font-semibold tracking-[-0.02em]">
                Solace
              </span>
            </button>

            <ul className="hidden items-center gap-8 lg:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={onAdvance}
                    className="flex items-center gap-1 text-[14.5px] text-white/85 transition hover:text-white"
                  >
                    {link.label}
                    {link.dropdown ? (
                      <ChevronDown className="size-3.5 opacity-70" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onAdvance}
              className="rounded-full border border-white/45 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white hover:text-[#07222b]"
            >
              Open Console
            </button>
          </nav>

          <div className="flex flex-1 flex-col justify-end gap-10 px-6 pb-10 sm:px-10 sm:pb-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="solace-rise max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 py-1.5 pr-4 pl-2 backdrop-blur-md">
                <span className="grid size-6 place-items-center rounded-full bg-[#5cc9de]/25">
                  <ShieldCheck className="size-3.5 text-[#a8ecf7]" />
                </span>
                <span className="text-[12.5px] font-medium text-white/85">
                  Prescribed by a clinician · never autonomous
                </span>
              </span>

              <h1 className="mt-7 text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white">
                Your Clinician-Guided
                <br />
                Emotional Companion
              </h1>

              <p className="mt-6 max-w-lg text-[16.5px] leading-relaxed text-white/72">
                Solace turns a written care plan into a companion who knows what
                to say, what it must never raise, and exactly when to call a
                human being.
              </p>

              <button
                type="button"
                onClick={onAdvance}
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white py-2 pr-2 pl-7 text-[15.5px] font-medium text-[#0a2730] transition hover:gap-4"
              >
                Set Your Companion
                <span className="grid size-10 place-items-center rounded-full bg-[#2f6fe4] text-white transition group-hover:bg-[#1d5bd0]">
                  <ArrowRight className="size-4.5" />
                </span>
              </button>
            </div>

            <PlanCard
              patientName={prescription.patient_profile.name}
              patientId={prescription.patient_profile.patient_id}
              boundaries={boundaries}
              keywords={keywords}
              anchors={anchors}
              onOpen={onAdvance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The reference comp floats a marketing statistic here. A live summary of the
 * loaded care plan is both truthful and a better preview of the product.
 */
function PlanCard({
  patientName,
  patientId,
  boundaries,
  keywords,
  anchors,
  onOpen,
}: {
  patientName: string;
  patientId: string;
  boundaries: number;
  keywords: number;
  anchors: number;
  onOpen: () => void;
}) {
  const tags = [
    `${boundaries} hard boundaries`,
    'Non-directive',
    `${keywords} alert keywords`,
    `${anchors} safe anchors`,
    'Guardian on call',
    'Crisis line armed',
  ];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="solace-rise solace-glass solace-glass-bright w-full max-w-[380px] p-5 text-left transition"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5fcdc0] opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-[#5fcdc0]" />
          </span>
          <span className="text-[11.5px] font-semibold tracking-[0.09em] text-white/55 uppercase">
            Care plan loaded
          </span>
        </div>
        <span className="font-mono text-[11px] text-white/40">{patientId}</span>
      </div>

      <p className="mt-3.5 text-[26px] leading-none font-semibold tracking-[-0.02em] text-white">
        {patientName}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-white/55">
        Late-night companionship until she can sleep.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/14 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/80 uppercase"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function SolaceMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <defs>
        <linearGradient id="solace-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8ce6f5" />
          <stop offset="100%" stopColor="#5b8df0" />
        </linearGradient>
      </defs>
      <path
        d="M16 3c5 3.4 7.6 7.1 7.6 11.2 0 4.6-3.4 8-7.6 8s-7.6-3.4-7.6-8C8.4 10.1 11 6.4 16 3Z"
        fill="url(#solace-mark)"
        opacity="0.92"
      />
      <path
        d="M16 29c-5-3.4-7.6-7.1-7.6-11.2"
        stroke="url(#solace-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
