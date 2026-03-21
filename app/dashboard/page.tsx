"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const lastSiteId = localStorage.getItem("lastSiteId");
    if (lastSiteId) router.replace(`/dashboard/${lastSiteId}`);
  }, [router]);

  return null;
}
