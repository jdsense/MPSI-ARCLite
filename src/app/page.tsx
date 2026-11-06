// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole, hasStoredRoleSession, getHomePathForRole } from "@/lib/role-store";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!hasStoredRoleSession()) {
      router.replace("/auth/login");
      return;
    }
    const session = getStoredRole();
    router.replace(getHomePathForRole(session.role));
  }, [router]);

  return null;
}
