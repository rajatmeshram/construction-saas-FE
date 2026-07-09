"use client";

import { use } from "react";

import { WorkerAttendanceHistoryPage } from "@/components/labour-module";

export default function WorkerAttendanceHistoryRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const workerId = Number(id);
  if (!workerId) return <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Invalid worker.</p>;
  return <WorkerAttendanceHistoryPage workerId={workerId} />;
}
