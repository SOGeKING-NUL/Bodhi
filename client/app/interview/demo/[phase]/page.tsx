"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DemoPhaseRedirect() {
  const params = useParams();
  const router = useRouter();
  const phase = params.phase as string;

  useEffect(() => {
    router.push(`/interview?demo=true&phase=${phase}`);
  }, [phase, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-bodhi-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600" />
        <p className="text-sm text-neutral-500">Loading {phase} demo…</p>
      </div>
    </div>
  );
}
