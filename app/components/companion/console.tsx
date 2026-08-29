"use client";

import { ArrowRight, ChevronLeft, Plus } from "lucide-react";

import { ScenePreview } from "./avatar-portrait";
import { ChipListInput, ChoiceRow, Field, SectionCard } from "./controls";
import { SCENE_PRESETS } from "@/lib/companion/defaults";
import { AGE_BANDS, GENDERS, type Prescription } from "@/lib/companion/types";

const BOUNDARY_SUGGESTIONS = [
  "Car accidents",
  "The night her parents died",
  "Hospital environments",
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
    value: Partial<Prescription[K]>
  ) => {
    onChange({ ...prescription, [key]: { ...prescription[key], ...value } });
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
                  patch("patient_profile", { name: event.target.value })
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
                  patch("patient_profile", {
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
                onChange={(gender) => patch("patient_profile", { gender })}
              />
            </Field>

            <Field
              label="Age band"
              hint="Sets vocabulary and pace. No exact age is stored."
            >
              <ChoiceRow
                options={AGE_BANDS}
                value={patient.age_band}
                onChange={(age_band) => patch("patient_profile", { age_band })}
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
              label="Customize your avatar"
              hint="Change the companion's appearance, voice, and name."
            >
              <div className="space-y-3">
                <div>
                  <span className="solace-label mb-1.5 block">Avatar ID</span>
                  <input
                    value={persona.companions[0]?.avatarId ?? ""}
                    onChange={(event) => {
                      const current = persona.companions[0] ?? {
                        presetId: "custom",
                        calledName: "Companion",
                        avatarId: "",
                        voiceId: "",
                      };
                      patch("avatar_persona", {
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
                    value={persona.companions[0]?.voiceId ?? ""}
                    onChange={(event) => {
                      const current = persona.companions[0] ?? {
                        presetId: "custom",
                        calledName: "Companion",
                        avatarId: "",
                        voiceId: "",
                      };
                      patch("avatar_persona", {
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
                    value={persona.companions[0]?.calledName ?? ""}
                    onChange={(event) => {
                      const current = persona.companions[0] ?? {
                        presetId: "custom",
                        calledName: "Companion",
                        avatarId: "",
                        voiceId: "",
                      };
                      patch("avatar_persona", {
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
                      patch("avatar_persona", { sceneId: scene.id })
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
                  patch("clinical_guardrails", {
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
                  patch("clinical_guardrails", { hard_boundaries })
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
