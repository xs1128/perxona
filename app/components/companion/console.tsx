'use client';

import { ArrowRight, ChevronLeft, Plus } from 'lucide-react';

import { ScenePreview } from './avatar-portrait';
import { ChipListInput, ChoiceRow, Field, SectionCard } from './controls';
import { SCENE_PRESETS } from '@/lib/companion/defaults';
import { AGE_BANDS, GENDERS, type Prescription } from '@/lib/companion/types';

const BOUNDARY_SUGGESTIONS = [
  'Car accidents',
  'The night her parents died',
  'Hospital environments',
];

/**
 * One column, one control per row, three sections. Everything the care plan
 * needs beyond these fields keeps its prescribed default.
 *
 * The screen owns its own scroller so the masthead and the collage can stay
 * pinned while the form moves between them. There is exactly one primary
 * action, at the foot of the form where the reading ends — a second copy in
 * the header only made the same button twice.
 */
export function Console({
  prescription,
  onChange,
  onBack,
  onBegin,
}: {
  prescription: Prescription;
  onChange: (next: Prescription) => void;
  onBack: () => void;
  onBegin: () => void;
}) {
  const patient = prescription.patient_profile;
  const guardrails = prescription.clinical_guardrails;
  const persona = prescription.avatar_persona;

  const patch = <K extends keyof Prescription>(
    key: K,
    value: Partial<Prescription[K]>,
  ) => {
    onChange({ ...prescription, [key]: { ...prescription[key], ...value } });
  };

  // A disabled button that will not say why is a dead end, so the same three
  // conditions that gate the session also name themselves underneath it.
  const missing = [
    patient.name.trim().length > 0 ? null : 'the child’s name',
    persona.companions.length > 0 ? null : 'a companion',
    guardrails.therapeutic_goal.trim().length > 0 ? null : 'the context',
  ].filter((entry): entry is string => entry !== null);

  const ready = missing.length === 0;

  return (
    <div className="solace-frame solace-paper flex flex-col">
      <div className="solace-collage solace-collage--quiet absolute inset-x-0 bottom-0 h-[42svh]" />

      <header className="relative z-20 border-b border-[var(--sol-rule)] bg-[var(--sol-paper)]/88 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[720px] items-center gap-4 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="grid size-9 shrink-0 place-items-center rounded-[3px] border border-[var(--sol-rule)] bg-white text-[var(--sol-ink-soft)] transition hover:border-[var(--sol-rule-strong)] hover:text-[var(--sol-ink)]"
          >
            <ChevronLeft className="size-4" />
          </button>

          <h1 className="solace-display flex-1 text-[22px] leading-none">
            Set Your Companion
          </h1>

          <span className="solace-meta hidden sm:block">The prescription</span>
        </div>
      </header>

      <div className="solace-scrollbar relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[720px] space-y-4 px-5 py-7">
          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="1"
            title="The Child"
            caption="Who the companion is speaking to."
            accent="var(--sol-artery)"
          >
            <div className="space-y-6">
              <Field label="Full name">
                <input
                  value={patient.name}
                  onChange={(event) =>
                    patch('patient_profile', { name: event.target.value })
                  }
                  placeholder="Mia Hartono"
                  className="solace-field"
                />
              </Field>

              <Field
                label="Call me…"
                hint="The name the companion says out loud."
              >
                <input
                  value={patient.preferred_name}
                  onChange={(event) =>
                    patch('patient_profile', {
                      preferred_name: event.target.value,
                    })
                  }
                  placeholder="Mia"
                  className="solace-field"
                />
              </Field>

              <Field label="Gender">
                <ChoiceRow
                  options={GENDERS}
                  value={patient.gender}
                  onChange={(gender) => patch('patient_profile', { gender })}
                />
              </Field>

              <Field
                label="Age band"
                hint="Sets vocabulary and pace. No exact age is stored."
              >
                <ChoiceRow
                  options={AGE_BANDS}
                  value={patient.age_band}
                  onChange={(age_band) => patch('patient_profile', { age_band })}
                />
              </Field>
            </div>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="2"
            title="Companion"
            caption="Pick one or two, name them, and choose where you meet."
            accent="var(--sol-surgical)"
          >
            <div className="space-y-6">
              <Field
                label="Customize your avatar"
                hint="Change the companion's appearance, voice, and name."
              >
                <div className="space-y-3">
                  <div>
                    <span className="solace-label mb-1.5 block">Avatar ID</span>
                    <input
                      value={persona.companions[0]?.avatarId ?? ''}
                      onChange={(event) => {
                        const current = persona.companions[0] ?? {
                          presetId: 'custom',
                          calledName: 'Companion',
                          avatarId: '',
                          voiceId: '',
                        };
                        patch('avatar_persona', {
                          companions: [
                            { ...current, avatarId: event.target.value },
                          ],
                        });
                      }}
                      placeholder="Enter Avatar ID"
                      className="solace-field"
                    />
                  </div>
                  <div>
                    <span className="solace-label mb-1.5 block">Voice ID</span>
                    <input
                      value={persona.companions[0]?.voiceId ?? ''}
                      onChange={(event) => {
                        const current = persona.companions[0] ?? {
                          presetId: 'custom',
                          calledName: 'Companion',
                          avatarId: '',
                          voiceId: '',
                        };
                        patch('avatar_persona', {
                          companions: [
                            { ...current, voiceId: event.target.value },
                          ],
                        });
                      }}
                      placeholder="Enter Voice ID"
                      className="solace-field"
                    />
                  </div>
                  <div>
                    <span className="solace-label mb-1.5 block">
                      Companion Name
                    </span>
                    <input
                      value={persona.companions[0]?.calledName ?? ''}
                      onChange={(event) => {
                        const current = persona.companions[0] ?? {
                          presetId: 'custom',
                          calledName: 'Companion',
                          avatarId: '',
                          voiceId: '',
                        };
                        patch('avatar_persona', {
                          companions: [
                            { ...current, calledName: event.target.value },
                          ],
                        });
                      }}
                      placeholder="What the child calls them (e.g., Kak Sara)"
                      className="solace-field"
                    />
                  </div>
                </div>
              </Field>

              <Field label="Scene">
                <div className="flex flex-wrap gap-2.5">
                  {SCENE_PRESETS.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      data-selected={persona.sceneId === scene.id}
                      onClick={() =>
                        patch('avatar_persona', { sceneId: scene.id })
                      }
                      className="solace-tile w-[124px] p-2.5"
                    >
                      <ScenePreview
                        gradient={scene.gradient}
                        className="h-[68px] w-full"
                      />
                      <span className="mt-2 block text-[12.5px] font-medium">
                        {scene.name}
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    title="Import another scene from the organization catalog"
                    className="grid h-[122px] w-[124px] place-items-center rounded-[4px] border border-dashed border-[var(--sol-rule-strong)] text-[var(--sol-ink-faint)] transition hover:border-[var(--sol-surgical)] hover:text-[var(--sol-surgical)]"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="3"
            title="The Prescription"
            caption="What this session is for, and what it must never raise."
            accent="var(--sol-patina)"
          >
            <div className="space-y-6">
              <Field label="Context">
                <textarea
                  value={guardrails.therapeutic_goal}
                  onChange={(event) =>
                    patch('clinical_guardrails', {
                      therapeutic_goal: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="De-escalate late-night anxiety and stay with her until she can sleep."
                  className="solace-field resize-none leading-relaxed"
                />
              </Field>

              <Field
                label="Do not mention"
                hint="Blocked in the prompt, and checked again before the avatar speaks."
              >
                <ChipListInput
                  values={guardrails.hard_boundaries}
                  onChange={(hard_boundaries) =>
                    patch('clinical_guardrails', { hard_boundaries })
                  }
                  placeholder="Add a topic to block"
                  variant="boundary"
                  suggestions={BOUNDARY_SUGGESTIONS}
                />
              </Field>
            </div>
          </SectionCard>

          <div className="pt-3 pb-10">
            <button
              type="button"
              onClick={onBegin}
              disabled={!ready}
              className="solace-cta w-full"
            >
              Begin Session
              <ArrowRight className="size-4" />
            </button>

            <p className="mt-3 text-center font-mono text-[11.5px] text-[var(--sol-ink-soft)]">
              {ready
                ? 'The avatar speaks only inside these boundaries.'
                : `Still needed — ${missing.join(', ')}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
