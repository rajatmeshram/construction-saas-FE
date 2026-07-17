"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkersBulkAttendanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/attendance/bulk");
  }, [router]);
  return <p className="p-4 text-sm text-gray-500">Redirecting to attendance bulk mark...</p>;
}
