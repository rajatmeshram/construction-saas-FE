"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAppSelector } from "@/store/hooks";

export default function HomePage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    router.replace(user.role === "LABOUR" ? "/labour" : "/dashboard");
  }, [hydrated, accessToken, user, router]);

  return null;
}
