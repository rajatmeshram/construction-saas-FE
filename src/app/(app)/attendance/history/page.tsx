"use client";

import { Suspense } from "react";

import { AttendanceHistoryPage } from "@/components/modules";

export default function AttendanceHistoryRoute() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading attendance records...</p>}>
      <AttendanceHistoryPage />
    </Suspense>
  );
}
