"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** People section removed — redirect to Employee directory. */
export default function PeopleRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workers");
  }, [router]);
  return null;
}
