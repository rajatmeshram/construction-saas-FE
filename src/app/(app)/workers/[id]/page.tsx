"use client";

import { use } from "react";

import { WorkerProfilePage } from "@/components/labour-module";

export default function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const workerId = Number(id);
  if (!workerId) return <p className="rounded-3xl bg-white p-8 text-gray-500 shadow-panel">Invalid worker.</p>;
  return <WorkerProfilePage workerId={workerId} />;
}
