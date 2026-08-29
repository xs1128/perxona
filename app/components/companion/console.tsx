'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Code2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react';

import { AvatarPortrait, ScenePreview } from './avatar-portrait';
import {
  ChipListInput,
  ChoiceRow,
  Field,
  MultiChoiceRow,
  SectionCard,
  Toggle,
} from './controls';
import {
  AVATAR_PRESETS,
  EMPTY_PRESCRIPTION,
  MIA_PRESCRIPTION,
  SCENE_PRESETS,
  findAvatarPreset,
  findScenePreset,
} from '@/lib/companion/defaults';
import { buildSystemPrompt } from '@/lib/companion/prompt';
import {
  AGE_BANDS,
  CLINICAL_DIRECTIVES,
  GENDERS,
  MODALITY_OPTIONS,
  PRESENTATION_OPTIONS,
  TONE_OPTIONS,
  type Prescription,
} from '@/lib/companion/types';

const MAX_COMPANIONS = 2;

const BOUNDARY_SUGGESTIONS = [
  'Car accidents',
  'The night her parents died',
  'Hospital environments',
  'When are you going home',
];

const ANCHOR_SUGGESTIONS = [
  'Sketching',
  'Favorite bands/music',
  'Positive childhood memories',
  'Her cat',
];

const FORBIDDEN_SUGGESTIONS = [
  'Do not attempt cognitive restructuring',
  'Do not offer medical advice',
  'Do not force discussions about trauma',
  'Do not promise anyone is coming back',
];

const KEYWORD_SUGGESTIONS = [
  'heart hurting',
  'panic',
  "can't breathe",
  'crying',
  'hopeless',
];

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
  const [showProtocol, setShowProtocol] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const patient = prescription.patient_profile;
  const guardrails = prescription.clinical_guardrails;
  const interventions = prescription.prescribed_interventions;
  const persona = prescription.avatar_persona;
  const escalation = prescription.escalation_protocol;

  /* Section updaters keep the nested object literal noise out of the markup. */
  const patch = <K extends keyof Prescription>(
    key: K,
    value: Partial<Prescription[K]>,
  ) => {
    onChange({
      ...prescription,
      [key]: { ...prescription[key], ...value },
    });
  };

  const toggleCompanion = (presetId: string) => {
    const preset = findAvatarPreset(presetId);
    if (!preset) return;

    const existing = persona.companions.find(
      (slot) => slot.presetId === presetId,
    );

    if (existing) {
      patch('avatar_persona', {
        companions: persona.companions.filter(
          (slot) => slot.presetId !== presetId,
        ),
      });
      return;
    }

    // Selecting a third companion replaces the oldest rather than refusing.
    const next = [
      ...persona.companions.slice(-(MAX_COMPANIONS - 1)),
      {
        presetId,
        calledName: preset.suggestedNames[0] ?? preset.name,
        avatarId: preset.avatarId,
        voiceId: preset.voiceId,
      },
    ];
    patch('avatar_persona', { companions: next });
  };

  const renameCompanion = (presetId: string, calledName: string) => {
    patch('avatar_persona', {
      companions: persona.companions.map((slot) =>
        slot.presetId === presetId ? { ...slot, calledName } : slot,
      ),
    });
  };

  const readiness = useMemo(() => {
    const problems: string[] = [];
    if (!patient.name.trim()) problems.push('Patient name');
    if (persona.companions.length === 0)
      problems.push('At least one companion');
    if (!guardrails.therapeutic_goal.trim()) problems.push('Context');
    return problems;
  }, [patient.name, persona.companions.length, guardrails.therapeutic_goal]);

  return (
    <div className="solace-panel solace-scrollbar solace-ground">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07222b]/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/12 py-2 pr-4 pl-2.5 text-[13.5px] text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <ChevronLeft className="size-4" />
            Home
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-white">
              Set Your Companion
            </h1>
            <p className="truncate text-[12.5px] text-white/45">
              Everything below becomes the companion&apos;s standing
              instructions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onChange(MIA_PRESCRIPTION)}
            className="hidden items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-[13px] text-white/70 transition hover:border-white/30 hover:text-white sm:flex"
          >
            <Sparkles className="size-3.5" />
            Load demo plan
          </button>

          <button
            type="button"
            onClick={() => onChange(EMPTY_PRESCRIPTION)}
            aria-label="Clear the form"
            className="hidden size-9 place-items-center rounded-full border border-white/12 text-white/55 transition hover:border-white/30 hover:text-white sm:grid"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onBegin}
            disabled={readiness.length > 0}
            className="group inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-1.5 pl-5 text-[14px] font-medium text-[#0a2730] transition enabled:hover:gap-3.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Begin Session
            <span className="grid size-8 place-items-center rounded-full bg-[#2f6fe4] text-white">
              <ArrowRight className="size-4" />
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="1"
            title="The Child"
            caption="Who the companion is speaking to, and how it should sound."
            accent="#f2836b"
          >
            <div className="grid gap-5 sm:grid-cols-2">
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
                hint="The name the companion actually says out loud."
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
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Gender">
                <ChoiceRow
                  options={GENDERS}
                  value={patient.gender}
                  onChange={(gender) => patch('patient_profile', { gender })}
                />
              </Field>

              <Field label="Patient ID">
                <input
                  value={patient.patient_id}
                  onChange={(event) =>
                    patch('patient_profile', { patient_id: event.target.value })
                  }
                  placeholder="P-84729"
                  className="solace-field font-mono text-[13px]"
                />
              </Field>
            </div>

            <Field
              label="Age band"
              hint="No exact age is stored. The band only sets vocabulary and pace."
              className="mt-5"
            >
              <div className="grid gap-2 sm:grid-cols-4">
                {AGE_BANDS.map((band) => (
                  <button
                    key={band.value}
                    type="button"
                    data-selected={patient.age_band === band.value}
                    onClick={() =>
                      patch('patient_profile', { age_band: band.value })
                    }
                    className="solace-tile p-3.5"
                  >
                    <span className="block text-[14px] font-medium text-white">
                      {band.label}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-white/45">
                      {band.hint}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Presenting concerns" className="mt-5">
              <MultiChoiceRow
                options={PRESENTATION_OPTIONS}
                values={patient.primary_presentation}
                onChange={(primary_presentation) =>
                  patch('patient_profile', { primary_presentation })
                }
              />
            </Field>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="2"
            title="The Companion"
            caption={`Choose one or two avatars, name them, and pick where you meet.`}
            accent="#7c7ff0"
          >
            <Field
              label={`Avatar · ${persona.companions.length} of ${MAX_COMPANIONS} selected`}
              hint="Two companions let a child alternate between figures. Selecting a third replaces the oldest."
            >
              <div className="grid items-start gap-2.5 sm:grid-cols-2">
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
                          className="size-12"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium text-white">
                            {preset.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-white/45">
                            {preset.blurb}
                          </span>
                        </span>
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
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {preset.suggestedNames.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => renameCompanion(preset.id, name)}
                                className="rounded-full border border-dashed border-white/16 px-2.5 py-1 text-[11.5px] text-white/45 transition hover:border-white/35 hover:text-white/80"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Field>

            <Field label="Scene" className="mt-6">
              <div className="flex flex-wrap gap-2.5">
                {SCENE_PRESETS.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    data-selected={persona.sceneId === scene.id}
                    onClick={() =>
                      patch('avatar_persona', { sceneId: scene.id })
                    }
                    className="solace-tile w-[136px] p-2.5"
                  >
                    <ScenePreview
                      gradient={scene.gradient}
                      className="h-[74px] w-full"
                    />
                    <span className="mt-2 block text-[13px] font-medium text-white">
                      {scene.name}
                    </span>
                    <span className="block text-[11px] leading-snug text-white/45">
                      {scene.hint}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  title="Import another scene from the organization catalog"
                  className="grid h-[142px] w-[136px] place-items-center rounded-[18px] border border-dashed border-white/18 text-white/40 transition hover:border-white/40 hover:text-white/75"
                >
                  <span className="grid gap-1.5 justify-items-center">
                    <Plus className="size-6" />
                    <span className="text-[11.5px]">Add scene</span>
                  </span>
                </button>
              </div>
            </Field>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Tone">
                <MultiChoiceRow
                  options={TONE_OPTIONS}
                  values={persona.tone}
                  onChange={(tone) => patch('avatar_persona', { tone })}
                />
              </Field>

              <Field label="Relationship">
                <input
                  value={persona.relationship_dynamic}
                  onChange={(event) =>
                    patch('avatar_persona', {
                      relationship_dynamic: event.target.value,
                    })
                  }
                  placeholder="supportive_companion"
                  className="solace-field font-mono text-[13px]"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          <SectionCard
            step="3"
            title="The Prescription"
            caption="The two fields that shape every single reply."
            accent="#5fcdc0"
          >
            <Field
              label="Context"
              hint="What this session is for. Written in your words, sent to the model verbatim."
            >
              <textarea
                value={guardrails.therapeutic_goal}
                onChange={(event) =>
                  patch('clinical_guardrails', {
                    therapeutic_goal: event.target.value,
                  })
                }
                rows={4}
                placeholder="De-escalate late-night anxiety, provide non-directive companionship, and bridge the gap until she can sleep."
                className="solace-field resize-none leading-relaxed"
              />
            </Field>

            <Field
              label="Do not mention"
              hint="Hard boundaries. Enforced in the prompt and again as a filter on the model's reply before the avatar speaks."
              className="mt-6"
            >
              <ChipListInput
                values={guardrails.hard_boundaries}
                onChange={(hard_boundaries) =>
                  patch('clinical_guardrails', { hard_boundaries })
                }
                placeholder="Add a topic the companion must never raise"
                variant="boundary"
                suggestions={BOUNDARY_SUGGESTIONS}
              />
            </Field>

            <Field
              label="Safe anchors"
              hint="Where the companion goes when the conversation stalls."
              className="mt-6"
            >
              <ChipListInput
                values={guardrails.safe_anchors}
                onChange={(safe_anchors) =>
                  patch('clinical_guardrails', { safe_anchors })
                }
                placeholder="Something they love talking about"
                variant="anchor"
                suggestions={ANCHOR_SUGGESTIONS}
              />
            </Field>
          </SectionCard>

          {/* ---------------------------------------------------------------- */}
          <section className="solace-glass overflow-hidden">
            <button
              type="button"
              onClick={() => setShowProtocol((open) => !open)}
              className="flex w-full items-center gap-3.5 p-6 text-left sm:p-7"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#f5c563] text-[13px] font-semibold text-[#07222b]">
                4
              </span>
              <span className="flex-1">
                <span className="block text-[19px] leading-tight font-semibold tracking-[-0.01em] text-white">
                  Clinical protocol
                </span>
                <span className="mt-1 block text-[13px] text-white/50">
                  Directive, forbidden actions, prescribed exercises, and
                  escalation. Pre-filled — open it only to adjust.
                </span>
              </span>
              <ChevronDown
                className={`size-5 shrink-0 text-white/45 transition-transform ${
                  showProtocol ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showProtocol ? (
              <div className="space-y-6 border-t border-white/10 p-6 sm:p-7">
                <Field label="Clinical directive">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CLINICAL_DIRECTIVES.map((directive) => (
                      <button
                        key={directive.value}
                        type="button"
                        data-selected={
                          guardrails.clinical_directive === directive.value
                        }
                        onClick={() =>
                          patch('clinical_guardrails', {
                            clinical_directive: directive.value,
                          })
                        }
                        className="solace-tile p-3.5"
                      >
                        <span className="block text-[14px] font-medium text-white">
                          {directive.label}
                        </span>
                        <span className="mt-1 block text-[11.5px] leading-snug text-white/45">
                          {directive.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Forbidden actions">
                  <ChipListInput
                    values={guardrails.forbidden_actions}
                    onChange={(forbidden_actions) =>
                      patch('clinical_guardrails', { forbidden_actions })
                    }
                    placeholder="Something the companion must never do"
                    variant="boundary"
                    suggestions={FORBIDDEN_SUGGESTIONS}
                  />
                </Field>

                <Field label="Approved modalities">
                  <MultiChoiceRow
                    options={MODALITY_OPTIONS}
                    values={interventions.approved_modalities}
                    onChange={(approved_modalities) =>
                      patch('prescribed_interventions', { approved_modalities })
                    }
                  />
                </Field>

                <ExerciseEditor
                  exercises={interventions.custom_exercises}
                  onChange={(custom_exercises) =>
                    patch('prescribed_interventions', { custom_exercises })
                  }
                />

                <Field label="Style constraints">
                  <textarea
                    value={persona.style_constraints}
                    onChange={(event) =>
                      patch('avatar_persona', {
                        style_constraints: event.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Avoid clinical jargon. Short, conversational responses."
                    className="solace-field resize-none leading-relaxed"
                  />
                </Field>

                <div className="rounded-2xl border border-[#f5c563]/25 bg-[#f5c563]/8 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <TriangleAlert className="size-4 text-[#f5c563]" />
                    <span className="text-[13.5px] font-semibold text-[#fbeccb]">
                      Escalation protocol
                    </span>
                  </div>

                  <Field
                    label="Dashboard alert keywords"
                    hint="Matched against what the patient says. Raises a flag on the clinician dashboard without interrupting the session."
                  >
                    <ChipListInput
                      values={escalation.dashboard_alert_keywords}
                      onChange={(dashboard_alert_keywords) =>
                        patch('escalation_protocol', {
                          dashboard_alert_keywords,
                        })
                      }
                      placeholder="Add a phrase to watch for"
                      variant="alert"
                      suggestions={KEYWORD_SUGGESTIONS}
                    />
                  </Field>

                  <Field label="Emergency threshold" className="mt-5">
                    <textarea
                      value={escalation.emergency_threshold}
                      onChange={(event) =>
                        patch('escalation_protocol', {
                          emergency_threshold: event.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Mentions of self-harm or extreme hopelessness"
                      className="solace-field resize-none leading-relaxed"
                    />
                  </Field>

                  <div className="mt-5 space-y-2.5">
                    <Toggle
                      checked={escalation.emergency_action.break_character}
                      onChange={(break_character) =>
                        patch('escalation_protocol', {
                          emergency_action: {
                            ...escalation.emergency_action,
                            break_character,
                          },
                        })
                      }
                      label="Break character on emergency"
                      hint="The companion says plainly that it is an AI and stops role-play."
                    />
                    <Toggle
                      checked={escalation.emergency_action.notify_guardian}
                      onChange={(notify_guardian) =>
                        patch('escalation_protocol', {
                          emergency_action: {
                            ...escalation.emergency_action,
                            notify_guardian,
                          },
                        })
                      }
                      label="Notify guardian"
                      hint="Alerts the contact below the moment the threshold is crossed."
                    />
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="Crisis resource">
                      <input
                        value={escalation.emergency_action.provide_resource}
                        onChange={(event) =>
                          patch('escalation_protocol', {
                            emergency_action: {
                              ...escalation.emergency_action,
                              provide_resource: event.target.value,
                            },
                          })
                        }
                        placeholder="Crisis Text Line (Text HOME to 741741)"
                        className="solace-field"
                      />
                    </Field>

                    <Field label="Guardian contact">
                      <input
                        value={escalation.emergency_action.guardian_contact}
                        onChange={(event) =>
                          patch('escalation_protocol', {
                            emergency_action: {
                              ...escalation.emergency_action,
                              guardian_contact: event.target.value,
                            },
                          })
                        }
                        placeholder="Aunt_Mobile"
                        className="solace-field font-mono text-[13px]"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* ------------------------------------------------------------------ */}
        <aside className="lg:sticky lg:top-[92px] lg:h-fit">
          <PreviewPanel
            prescription={prescription}
            readiness={readiness}
            showPayload={showPayload}
            onTogglePayload={() => setShowPayload((open) => !open)}
            onBegin={onBegin}
          />
        </aside>
      </div>
    </div>
  );
}

function ExerciseEditor({
  exercises,
  onChange,
}: {
  exercises: Array<{ trigger_condition: string; action_script: string }>;
  onChange: (
    next: Array<{ trigger_condition: string; action_script: string }>,
  ) => void;
}) {
  const update = (
    index: number,
    patch: Partial<(typeof exercises)[number]>,
  ) => {
    onChange(
      exercises.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    );
  };

  return (
    <Field
      label="Prescribed exercises"
      hint="A trigger the companion watches for, and exactly what it does when it fires."
    >
      <div className="space-y-2.5">
        {exercises.map((exercise, index) => (
          <div key={index} className="solace-glass-soft space-y-2.5 p-3.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/9 px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-white/55 uppercase">
                When
              </span>
              <input
                value={exercise.trigger_condition}
                onChange={(event) =>
                  update(index, { trigger_condition: event.target.value })
                }
                placeholder="Patient reports racing heart or panic"
                className="solace-field flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(
                    exercises.filter((_, position) => position !== index),
                  )
                }
                aria-label="Remove exercise"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-[#f2836b]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2.5 rounded-md bg-white/9 px-2 py-0.5 font-mono text-[10.5px] tracking-wide text-white/55 uppercase">
                Then
              </span>
              <textarea
                value={exercise.action_script}
                onChange={(event) =>
                  update(index, { action_script: event.target.value })
                }
                rows={2}
                placeholder="Initiate 4-7-8 breathing. Guide her through it step-by-step."
                className="solace-field flex-1 resize-none leading-relaxed"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange([
              ...exercises,
              { trigger_condition: '', action_script: '' },
            ])
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/18 py-3 text-[13px] text-white/45 transition hover:border-white/40 hover:text-white/80"
        >
          <Plus className="size-4" />
          Add exercise
        </button>
      </div>
    </Field>
  );
}

function PreviewPanel({
  prescription,
  readiness,
  showPayload,
  onTogglePayload,
  onBegin,
}: {
  prescription: Prescription;
  readiness: string[];
  showPayload: boolean;
  onTogglePayload: () => void;
  onBegin: () => void;
}) {
  const persona = prescription.avatar_persona;
  const scene = findScenePreset(persona.sceneId);
  const callName =
    prescription.patient_profile.preferred_name ||
    prescription.patient_profile.name ||
    'your patient';

  const systemPrompt = useMemo(
    () => buildSystemPrompt(prescription),
    [prescription],
  );

  return (
    <div className="space-y-4">
      <div className="solace-glass overflow-hidden">
        <div className="relative h-[190px]">
          {scene ? (
            <ScenePreview
              gradient={scene.gradient}
              className="size-full !rounded-none"
            />
          ) : (
            <div className="size-full bg-white/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
            {persona.companions.length > 0 ? (
              persona.companions.map((slot) => {
                const preset = findAvatarPreset(slot.presetId);
                if (!preset) return null;
                return (
                  <div key={slot.presetId} className="text-center">
                    <AvatarPortrait
                      gradient={preset.gradient}
                      className="size-16 ring-2 ring-white/25"
                    />
                    <span className="mt-1.5 block max-w-[76px] truncate text-[12px] font-medium text-white">
                      {slot.calledName || preset.name}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-[13px] text-white/55">
                No companion selected yet
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <span className="solace-label">Opening line</span>
          <p className="text-[14px] leading-relaxed text-white/80">
            &ldquo;Hey {callName}. It&apos;s{' '}
            {persona.companions[0]?.calledName || 'me'}. I&apos;m not going
            anywhere tonight
            {prescription.clinical_guardrails.safe_anchors[0]
              ? ` — want to just talk, or start with ${prescription.clinical_guardrails.safe_anchors[0].toLowerCase()}?`
              : '.'}
            &rdquo;
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat
              value={prescription.clinical_guardrails.hard_boundaries.length}
              label="Blocked"
              color="#f2836b"
            />
            <Stat
              value={prescription.clinical_guardrails.safe_anchors.length}
              label="Anchors"
              color="#5fcdc0"
            />
            <Stat
              value={
                prescription.escalation_protocol.dashboard_alert_keywords.length
              }
              label="Watched"
              color="#f5c563"
            />
          </dl>

          {readiness.length > 0 ? (
            <p className="mt-4 rounded-xl border border-[#f2836b]/30 bg-[#f2836b]/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#ffd9cf]">
              Still needed: {readiness.join(', ')}
            </p>
          ) : (
            <button
              type="button"
              onClick={onBegin}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5cc9de] py-3 text-[14px] font-semibold text-[#07222b] transition hover:bg-[#78d8ea]"
            >
              Hand over the tablet
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="solace-glass overflow-hidden">
        <button
          type="button"
          onClick={onTogglePayload}
          className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left"
        >
          <Code2 className="size-4 shrink-0 text-white/45" />
          <span className="flex-1 text-[13.5px] font-medium text-white/80">
            {showPayload ? 'Prescription JSON' : 'System prompt'}
          </span>
          <span className="rounded-full border border-white/14 px-2.5 py-1 text-[11px] text-white/55">
            {showPayload ? 'Show prompt' : 'Show JSON'}
          </span>
        </button>
        <pre className="solace-scrollbar max-h-[320px] overflow-auto border-t border-white/10 bg-black/28 px-5 py-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/62">
          {showPayload ? JSON.stringify(prescription, null, 2) : systemPrompt}
        </pre>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/9 bg-white/4 py-2.5">
      <dd className="text-[21px] leading-none font-semibold" style={{ color }}>
        {value}
      </dd>
      <dt className="mt-1 text-[10.5px] tracking-[0.08em] text-white/45 uppercase">
        {label}
      </dt>
    </div>
  );
}
