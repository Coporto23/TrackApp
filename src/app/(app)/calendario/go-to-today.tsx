"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { localToday } from "@/lib/dates";

export function GoToToday() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/calendario?d=${localToday()}`);
  }, [router]);
  return <p className="text-fog">Consultando el calendario…</p>;
}
