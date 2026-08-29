'use client';

import { ArrowRight, ChevronLeft, Plus } from 'lucide-react';

import { AvatarPortrait, ScenePreview } from './avatar-portrait';
import { ChipListInput, ChoiceRow, Field, SectionCard } from './controls';
import {
  AVATAR_PRESETS,
  SCENE_PRESETS,
  findAvatarPreset,
} from '@/lib/companion/defaults';
import { AGE_BANDS, GENDERS, type Prescription } from '@/lib/companion/types';

const MAX_COMPANIONS = 2;

const BOUNDARY_SUGGESTIONS = [
  'Car accidents',
  'The night her parents died',
  'Hospital environments',
];

/**
 * One column, one control per row, three sections. Everything the care plan
 * needs beyond these fields keeps its prescribed default.
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

  const toggleCompanion = (presetId: string) => {
    const preset = findAvatarPreset(presetId);
    if (!preset) return;

    if (persona.companions.some((slot) => slot.presetId === presetId)) {
      patch('avatar_persona', {
        companions: persona.companions.filter(
          (slot) => slot.presetId !== presetId,
        ),
      });
      return;
    }

    // A third selection replaces the oldest rather than refusing the click.
    patch('avatar_persona', {
      companions: [
        ...persona.companions.slice(-(MAX_COMPANIONS - 1)),
        {
          presetId,
          calledName: preset.suggestedNames[0] ?? preset.name,
          avatarId: preset.avatarId,
          voiceId: preset.voiceId,
        },
      ],
    });
  };

  const renameCompanion = (presetId: string, calledName: string) => {
    patch('avatar_persona', {
      companions: persona.companions.map((slot) =>
        slot.presetId === presetId ? { ...slot, calledName } : slot,
      ),
    });
  };

  const ready =
    patient.name.trim().length > 0 &&
    persona.companions.length > 0 &&
    guardrails.therapeutic_goal.trim().length > 0;

  return (
    <div className="solace-panel solace-scrollbar solace-ground">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07222b]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[720px] items-center gap-4 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/12 text-white/65 transition hover:border-white/30 hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>

          <h1 className="flex-1 text-[17px] font-semibold tracking-[-0.01em] text-white">
            Set Your Companion
          </h1>

          <button
            type="button"
            onClick={onBegin}
            disabled={!ready}
            className="group inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-1.5 pl-5 text-[14px] font-medium text-[#0a2730] transition enabled:hover:gap-3.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Begin Session
            <span className="grid size-8 place-items-center rounded-full bg-[#2f6fe4] text-white">
              <ArrowRight className="size-4" />
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] space-y-4 px-5 py-6">
        {/* ---------------------------------------------------------------- */}
        <SectionCard
          step="1"
          title="The Child"
          caption="Who the companion is speaking to."
          accent="#f2836b"
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
          accent="#7c7ff0"
        >
          <div className="space-y-6">
            <Field
              label={`Avatar · ${persona.companions.length} of 2`}
              hint={
                persona.companions.length > 1
                  ? 'A Perxona scene holds one avatar, so the first one speaks in the session. The second is recorded on the plan.'
                  : undefined
              }
            >
              <div className="space-y-2">
                {AVATAR_PRESETS.map((preset) => {
                  const slot = persona.companions.find(
                    (entry) => entry.presetId === preset.id,
                  );

                  return (
                    <div
                      key={preset.id}
                      data-selected={Boolean(slot)}
                      className="solace-tile overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompanion(preset.id)}
                        className="flex w-full items-center gap-3.5 p-3.5 text-left"
                      >
                        <AvatarPortrait
                          gradient={preset.gradient}
                          className="size-11"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium text-white">
                            {preset.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-white/45">
                            {preset.blurb}
                          </span>
                        </span>
                        {slot && persona.companions.length > 1 ? (
                          <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white/70 uppercase">
                            {persona.companions[0]?.presetId === preset.id
                              ? 'Speaks'
                              : 'On plan'}
                          </span>
                        ) : null}

                        <span
                          className={
                            slot
                              ? 'grid size-5 shrink-0 place-items-center rounded-full bg-[#5cc9de] text-[11px] font-bold text-[#07222b]'
                              : 'size-5 shrink-0 rounded-full border border-white/22'
                          }
                        >
                          {slot ? '✓' : ''}
                        </span>
                      </button>

                      {slot ? (
                        <div className="border-t border-white/10 bg-black/18 p-3.5">
                          <span className="solace-label">
                            The child calls them
                          </span>
                          <input
                            value={slot.calledName}
                            onChange={(event) =>
                              renameCompanion(preset.id, event.target.value)
                            }
                            placeholder="Papa, Mama, Kak Sara…"
                            className="solace-field"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
                    <span className="mt-2 block text-[12.5px] font-medium text-white">
                      {scene.name}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  title="Import another scene from the organization catalog"
                  className="grid h-[122px] w-[124px] place-items-center rounded-[18px] border border-dashed border-white/18 text-white/40 transition hover:border-white/40 hover:text-white/75"
                >
                  <Plus className="size-6" />
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
          accent="#5fcdc0"
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

        <button
          type="button"
          onClick={onBegin}
          disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5cc9de] py-4 text-[15px] font-semibold text-[#07222b] transition enabled:hover:bg-[#78d8ea] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Begin Session
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
