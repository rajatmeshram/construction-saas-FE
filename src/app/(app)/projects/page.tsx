"use client";

import { ProjectManager } from "@/components/modules";
import { useAppSelector } from "@/store/hooks";

export default function ProjectsPage() {
  const user = useAppSelector((state) => state.auth.user);
  return <ProjectManager user={user} />;
}
