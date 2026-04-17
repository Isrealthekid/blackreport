import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Mission, SAC18 } from "@/lib/types";
import SAC18Form from "./SAC18Form";

export default async function SAC18Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const [existing, keys] = await Promise.all([
    apiMaybe<SAC18>(`/missions/${id}/sac18`),
    apiMaybe<string[]>(`/missions/${id}/sac18/checklist-keys`),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">SAC 18 — Site / Drone Operation Risk Assessment</h1>
      <p className="text-sm text-neutral-400 mt-1">Mission {mission.mission_number} · {mission.mission_date}</p>
      <SAC18Form missionId={id} existing={existing} checklistKeys={keys ?? []} />
    </div>
  );
}
