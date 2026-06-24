"use client";

import { useEffect, useRef, useState } from "react";

const securityFeatures = [
  {
    title: "SOC 2 Type II",
    description: "Independently audited security controls",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Full Audit Trail",
    description: "Every decision logged with full traceability",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: "Real-time Observability",
    description: "Monitor, debug, and replay any execution",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function EnterpriseSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-24 md:py-32 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full border border-black/[0.06] mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Security
            </div>
            <h2
              className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Enterprise-grade
              <br />
              <span
                className="italic font-light"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                from day one.
              </span>
            </h2>
            <p
              className="text-[#0a0a0a]/50 text-base leading-relaxed mb-10 max-w-md"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Every answer is logged, every rubric is traceable. Built for teams
              that need clear hiring compliance without compromise.
            </p>

            <div className="space-y-4">
              {securityFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 group cursor-default"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(16px)",
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${(index + 1) * 0.12}s`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a0a0a]/[0.04] flex items-center justify-center shrink-0 text-[#0a0a0a]/60 group-hover:bg-[#0a0a0a]/[0.08] group-hover:text-[#0a0a0a] transition-all duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h3
                      className="text-[#0a0a0a] text-[15px] font-semibold mb-0.5"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="text-[#0a0a0a]/45 text-sm"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
            }}
          >
            <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0a0a0a]/50"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    Audit Trail
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#0a0a0a]/30">
                  live
                </span>
              </div>

              <div className="divide-y divide-black/[0.04] font-mono text-[12px]">
                {[
                  {
                    time: "14:23:01",
                    event: "interview.mock.started",
                    status: "info",
                  },
                  {
                    time: "14:23:02",
                    event: "tool.resume_parser.called",
                    status: "info",
                  },
                  {
                    time: "14:23:04",
                    event: "memory.context.loaded",
                    status: "info",
                  },
                  {
                    time: "14:23:05",
                    event: "rubric.check.passed",
                    status: "success",
                  },
                  {
                    time: "14:23:07",
                    event: "interviewer.question.asked",
                    status: "info",
                  },
                  {
                    time: "14:23:08",
                    event: "feedback.score.computed",
                    status: "success",
                  },
                  {
                    time: "14:23:09",
                    event: "session.state.saved",
                    status: "info",
                  },
                  {
                    time: "14:23:10",
                    event: "interview.mock.completed",
                    status: "success",
                  },
                ].map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 px-5 py-2.5 hover:bg-black/[0.01] transition-colors"
                  >
                    <span className="text-[#0a0a0a]/25 shrink-0">
                      {log.time}
                    </span>
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        log.status === "success"
                          ? "bg-emerald-500"
                          : "bg-blue-400"
                      }`}
                    />
                    <span className="text-[#0a0a0a]/60 truncate">
                      {log.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
