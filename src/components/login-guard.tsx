"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { useAppSelector } from "@/store/hooks";

export function LoginGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    if (accessToken && user) {
      router.replace(user.role === "LABOUR" ? "/labour" : "/dashboard");
    }
  }, [hydrated, accessToken, user, router]);

  if (!hydrated) return null;
  if (accessToken && user) return null;
  return children;
}
