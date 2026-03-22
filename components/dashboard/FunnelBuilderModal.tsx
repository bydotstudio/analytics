"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateFunnel } from "@/hooks/useFunnels";

interface Props {
  siteId: string;
  onClose: () => void;
}

export default function FunnelBuilderModal({ siteId, onClose }: Props) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([
    { pathname: "", label: "" },
    { pathname: "", label: "" },
  ]);

  const { mutate, isPending, error } = useCreateFunnel(siteId);

  function addStep() {
    setSteps((s) => [...s, { pathname: "", label: "" }]);
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: "pathname" | "label", val: string) {
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, [field]: val } : step)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSteps = steps.filter((s) => s.pathname.trim());
    if (validSteps.length < 2) return;
    mutate(
      {
        name: name.trim(),
        steps: validSteps.map((s) => ({
          pathname: s.pathname.trim(),
          label: s.label.trim() || undefined,
        })),
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">New Funnel</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Funnel name (e.g. Signup flow)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
                  {i + 1}
                </div>
                <input
                  type="text"
                  placeholder="/pathname"
                  value={step.pathname}
                  onChange={(e) => updateStep(i, "pathname", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={step.label}
                  onChange={(e) => updateStep(i, "label", e.target.value)}
                  className="w-28 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                {steps.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {steps.length < 10 && (
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <Plus className="h-3.5 w-3.5" /> Add step
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{String(error)}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-[background-color,transform,opacity] duration-150 hover:bg-zinc-700 motion-safe:active:scale-[0.97] disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {isPending ? "Creating…" : "Create funnel"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 transition-[background-color,transform] duration-150 hover:bg-zinc-50 motion-safe:active:scale-[0.97] dark:border-zinc-700 dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
