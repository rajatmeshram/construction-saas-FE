"use client";

import { use } from "react";

import { SupervisorProfilePage } from "@/components/labour-module";

export default function SupervisorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supervisorId = Number(id);
  if (!supervisorId) return <p className="rounded-3xl bg-white p-8 text-gray-500 shadow-panel">Invalid supervisor.</p>;
  return <SupervisorProfilePage supervisorId={supervisorId} />;
}
