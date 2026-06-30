"use client";

import Link from "next/link";
import AppShell from "@/components/app/app-shell";
import { ArrowLeftIcon } from "@/components/app/ui/icons";
import { Card } from "@/components/app/ui/card";

const DEMO_PHASES = [
  { phase: "intro", title: "Introduction", description: "Self-introduction and background discussion" },
  { phase: "technical", title: "Technical", description: "Domain concepts, language internals, system design" },
  { phase: "behavioral", title: "Behavioral", description: "STAR-method questions, leadership, teamwork" },
  { phase: "dsa", title: "DSA / Coding", description: "Algorithms, data structures, complexity analysis" },
  { phase: "project", title: "Project discussion", description: "Past projects, architecture, trade-offs" },
];

export default function DemoIndexPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-[28px]">
              Interview phase demos
            </h1>
            <p className="mt-1.5 text-[15px] text-neutral-500">
              Test individual interview phases with GrowthX context — 3–5 questions each.
            </p>
          </div>
          <Link
            href="/interview"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#1a1a1a]"
          >
            <ArrowLeftIcon size={15} />
            Full interview
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {DEMO_PHASES.map((demo) => (
            <Link key={demo.phase} href={`/interview/demo/${demo.phase}`}>
              <Card interactive className="p-5">
                <h3 className="text-[15px] font-semibold text-[#1a1a1a]">{demo.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{demo.description}</p>
                <p className="mt-3 text-xs text-neutral-400">
                  3–5 questions · ~5–8 minutes · GrowthX context
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
