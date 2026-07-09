"use client";

import { use } from "react";

import { MachineryDetailPage } from "@/components/machinery-module";

export default function MachineryDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const machineryId = Number(id);
  if (!machineryId) return <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Invalid machinery.</p>;
  return <MachineryDetailPage machineryId={machineryId} />;
}
