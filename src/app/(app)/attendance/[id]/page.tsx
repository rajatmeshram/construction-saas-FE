"use client";

import { use } from "react";

import { AttendanceDetailPage } from "@/components/modules";

export default function AttendanceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const recordId = Number(id);

  if (!recordId) {
    return <p className="rounded-2xl bg-white p-6 text-gray-500 shadow-panel">Invalid attendance record.</p>;
  }

  return <AttendanceDetailPage recordId={recordId} />;
}
