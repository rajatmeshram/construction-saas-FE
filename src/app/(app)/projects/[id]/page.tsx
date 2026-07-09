"use client";

import { use } from "react";

import { ProjectDetail } from "@/components/modules";
import { useAppSelector } from "@/store/hooks";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAppSelector((state) => state.auth.user);
  const projectId = Number(id);

  if (!projectId) {
    return <p className="rounded-3xl bg-white p-8 text-gray-500 shadow-panel">Invalid project.</p>;
  }

  return <ProjectDetail projectId={projectId} user={user} />;
}
