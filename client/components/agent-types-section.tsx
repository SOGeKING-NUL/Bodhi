"use client";

import { useEffect, useRef, useState } from "react";

const agents = [
  {
    label: "BEHAVIORAL",
    title: "Soft skills & culture fit",
    description:
      "Answer competency questions out loud and get scored on the STAR method, leadership signals, and clarity of communication.",
    tags: ["STAR method", "Leadership", "Communication"],
    gradient: "from-blue-100/60 to-indigo-100/40",
  },
  {
    label: "CODING",
    title: "Algorithms & data structures",
    description:
      "Talk through problem-solving with dynamic follow-ups on edge cases, time and space complexity, and your reasoning.",
    tags: ["Data structures", "Complexity", "Edge cases"],
    gradient: "from-emerald-100/60 to-teal-100/40",
  },
  {
    label: "SYSTEM DESIGN",
    title: "Architecture & scalability",
    description:
      "Work through open-ended design prompts while the interviewer probes your tradeoffs across distributed systems.",
    tags: ["Scalability", "Tradeoffs", "Distributed systems"],
    gradient: "from-violet-100/60 to-purple-100/40",
  },
  {
    label: "RESUME DEEP-DIVE",
    title: "Tailored to your background",
    description:
      "Upload your resume and the interviewer asks targeted questions about your real projects, roles, and impact.",
    tags: ["Resume-aware", "Projects", "Impact"],
    gradient: "from-amber-100/60 to-orange-100/40",
  },
];

export default function AgentTypesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="agents"
      ref={sectionRef}
      className="w-full py-24 md:py-32 px-4 md:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full border border-black/6 mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Interview Types
          </div>
          <h2
            className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Plug-and-play interviewers
            <br />
            <span
              className="italic font-light"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              ready to practice.
            </span>
          </h2>
          <p
            className="text-[#0a0a0a]/50 text-base md:text-lg leading-relaxed max-w-lg mx-auto"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Start with a pre-built persona or compose your own from scratch.
            Every mock interview is recorded, analyzed, and actionable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {agents.map((agent, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white border border-black/[0.06] p-7 md:p-8 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] hover:border-black/[0.1] cursor-default"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(24px)",
                transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
              }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <span
                    className="text-[10px] font-semibold tracking-[0.15em] text-[#0a0a0a]/40 uppercase"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {agent.label}
                  </span>
                </div>

                <h3
                  className="text-[#0a0a0a] text-xl md:text-[22px] font-medium tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {agent.title}
                </h3>

                <p
                  className="text-[#0a0a0a]/50 text-sm leading-relaxed mb-6"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {agent.description}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-black/[0.04] text-[#0a0a0a]/55 text-[11px] font-medium"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
