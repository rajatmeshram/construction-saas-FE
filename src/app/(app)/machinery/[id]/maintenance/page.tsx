"use client";

import { use } from "react";

import { MachineryMaintenancePage } from "@/components/machinery-module";

export default function MachineryMaintenanceRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const machineryId = Number(id);
  if (!machineryId) return <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Invalid machinery.</p>;
  return <MachineryMaintenancePage machineryId={machineryId} />;
}
