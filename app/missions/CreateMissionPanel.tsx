"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMissionAction } from "@/app/actions";
import { createMissionSchema, type CreateMissionInput } from "@/lib/forms/schemas";

interface CampOption {
  id: string;
  site_name: string;
}

export default function CreateMissionPanel({
  camps,
}: {
  camps: CampOption[];
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setFocus,
  } = useForm<CreateMissionInput>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      camp_id: camps[0]?.id ?? "",
      mission_number: "",
      mission_date: new Date().toISOString().slice(0, 10),
    },
  });

  // Esc to close + body scroll lock + focus the first field on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => setFocus("camp_id"), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setFocus]);

  if (camps.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="You're not assigned to any camp yet."
        className="px-3 py-1.5 bg-neutral-900 text-neutral-500 rounded text-sm font-medium cursor-not-allowed border border-neutral-800"
      >
        + New mission
      </button>
    );
  }

  const onValid = (values: CreateMissionInput) => {
    const fd = new FormData();
    fd.set("camp_id", values.camp_id);
    fd.set("mission_number", values.mission_number);
    fd.set("mission_date", values.mission_date);
    startTransition(async () => {
      try {
        await createMissionAction(fd);
        reset();
        setOpen(false);
      } catch {
        // server action redirects on success; if we get here it's a real failure.
      }
    });
  };

  // Register the camp_id select with the same ref we use to focus.
  const campIdReg = register("camp_id");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-neutral-200"
      >
        + New mission
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-mission-title"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div
            ref={dialogRef}
            className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl mt-12 sm:mt-0"
          >
            <div className="flex items-start justify-between p-5 border-b border-neutral-800">
              <div>
                <h2 id="new-mission-title" className="text-base font-semibold">
                  Create new mission
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Pick a camp, give it a unique mission number, then start filling
                  the SAC forms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-white text-lg leading-none px-2 -mt-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onValid)} className="p-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Camp
                </label>
                <select
                  {...campIdReg}
                  ref={(el) => {
                    campIdReg.ref(el);
                    firstFieldRef.current = el;
                  }}
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
                  aria-invalid={!!errors.camp_id}
                >
                  <option value="" disabled>
                    Select camp…
                  </option>
                  {camps.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.site_name}
                    </option>
                  ))}
                </select>
                {errors.camp_id && (
                  <p className="text-xs text-red-400 mt-1">{errors.camp_id.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Mission number
                </label>
                <input
                  {...register("mission_number")}
                  placeholder="e.g. MIS-001"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm font-mono"
                  aria-invalid={!!errors.mission_number}
                />
                {errors.mission_number ? (
                  <p className="text-xs text-red-400 mt-1">{errors.mission_number.message}</p>
                ) : (
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Must be unique within your organisation.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Mission date
                </label>
                <input
                  {...register("mission_date")}
                  type="date"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
                  aria-invalid={!!errors.mission_date}
                />
                {errors.mission_date && (
                  <p className="text-xs text-red-400 mt-1">{errors.mission_date.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800 -mx-5 px-5 -mb-5 pb-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
                  disabled={isSubmitting || pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-white text-black font-medium rounded hover:bg-neutral-200 disabled:opacity-60"
                  disabled={isSubmitting || pending}
                >
                  {isSubmitting || pending ? "Creating…" : "Create mission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
