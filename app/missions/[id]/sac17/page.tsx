import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Mission } from "@/lib/types";
import BackButton from "@/components/BackButton";
import SAC17Form from "./SAC17Form";

export default async function SAC17Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const existing = await apiMaybe<Record<string, unknown>>(`/missions/${id}/sac17`);

  return (
    <div className="max-w-3xl">
      <BackButton fallback={`/missions/${id}`} />
      <h1 className="text-2xl font-bold">SAC 17 — Mission Plan &amp; Risk Assessment</h1>
      <p className="text-sm text-neutral-400 mt-1">Mission {mission.mission_number} · {mission.mission_date}</p>
      <SAC17Form missionId={id} existing={existing} />
    </div>
  );
}
