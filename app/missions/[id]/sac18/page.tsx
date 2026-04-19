import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Mission, SAC18 } from "@/lib/types";
import BackButton from "@/components/BackButton";
import SAC18Form from "./SAC18Form";

export default async function SAC18Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const [existing, keysRaw] = await Promise.all([
    apiMaybe<SAC18>(`/missions/${id}/sac18`),
    apiMaybe<unknown>(`/missions/${id}/sac18/checklist-keys`),
  ]);

  // The API may return a bare array or an object like { "keys": [...] }.
  let checklistKeys: string[] = [];
  if (Array.isArray(keysRaw)) {
    checklistKeys = keysRaw;
  } else if (keysRaw && typeof keysRaw === "object") {
    const vals = Object.values(keysRaw as Record<string, unknown>);
    const first = vals[0];
    if (Array.isArray(first)) checklistKeys = first;
    else checklistKeys = vals.filter((v): v is string => typeof v === "string");
  }

  return (
    <div className="max-w-4xl">
      <BackButton fallback={`/missions/${id}`} />
      <h1 className="text-2xl font-bold">SAC 18 — Site / Drone Operation Risk Assessment</h1>
      <p className="text-sm text-neutral-400 mt-1">Mission {mission.mission_number} · {mission.mission_date}</p>
      <SAC18Form missionId={id} existing={existing} checklistKeys={checklistKeys} />
    </div>
  );
}
