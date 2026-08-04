"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BulkAttendanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/attendance");
  }, [router]);
  return <p className="p-4 text-sm text-gray-500">Redirecting to attendance...</p>;
}
