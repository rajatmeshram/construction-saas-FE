"use client";

import { PeopleManager } from "@/components/modules";
import { useAppSelector } from "@/store/hooks";

export default function PeoplePage() {
  const user = useAppSelector((state) => state.auth.user);
  return <PeopleManager user={user} />;
}
