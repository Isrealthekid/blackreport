import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Mission, SAC16 } from "@/lib/types";
import SAC16Form from "./SAC16Form";

export default async function SAC16Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const existing = await apiMaybe<SAC16>(`/missions/${id}/sac16`);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">SAC 16 — Drone Mission Report</h1>
      <p className="text-sm text-neutral-400 mt-1">Mission {mission.mission_number} · {mission.mission_date}</p>
      <SAC16Form missionId={id} existing={existing} />
    </div>
  );
}
