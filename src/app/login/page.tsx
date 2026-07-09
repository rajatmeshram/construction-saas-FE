"use client";

import { LoginGuard } from "@/components/login-guard";
import { SignIn } from "@/components/modules";

export default function LoginPage() {
  return (
    <LoginGuard>
      <SignIn />
    </LoginGuard>
  );
}
