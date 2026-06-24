"use client";

import { useEffect, useRef, useState } from "react";

const tabs = [
  {
    number: "01",
    label: "Install SDK",
    description: "One command to get started",
    code: `npm install @bodhi/interviews`,
    language: "bash",
  },
  {
    number: "02",
    label: "Define Persona",
    description: "TypeScript-first persona class",
    code: `import { Interviewer } from '@bodhi/interviews'

const coach = new Interviewer({
  role: 'Frontend Engineer',
  level: 'Senior',
  mode: 'technical',
  focus: ['React', 'System Design']
})`,
    language: "typescript",
  },
  {
    number: "03",
    label: "Add Context",
    description: "Load user resume and background",
    code: `await coach.loadContext({
  resume: './candidate.pdf',
  jobDescription: './jd.txt'
})

// Persona tailors questions to the
// resume and specific role`,
    language: "typescript",
  },
  {
    number: "04",
    label: "Start Session",
    description: "Initialize the interview loop",
    code: `const session = await coach.start()

// Listen to feedback & scores
session.on('feedback', (data) => {
  console.log('Score:', data.overall)
  console.log('Tips:', data.improvements)
})`,
    language: "typescript",
  },
];

export default function DeveloperExperienceSection() {
  const [activeTab, setActiveTab] = useState(0);
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
    <section ref={sectionRef} className="w-full py-24 md:py-32 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full border border-black/[0.06] mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Developer Experience
          </div>
          <h2
            className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Built for developers.
            <br />
            <span
              className="italic font-light"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Loved by teams.
            </span>
          </h2>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-black/[0.06] bg-white"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="p-6 md:p-8 flex flex-col gap-1 border-b lg:border-b-0 lg:border-r border-black/[0.06]">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`group w-full text-left px-5 py-4 rounded-xl transition-all duration-300 ${
                  activeTab === index
                    ? "bg-[#0a0a0a] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                    : "hover:bg-black/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-mono font-medium transition-colors duration-300 ${
                      activeTab === index
                        ? "text-white/40"
                        : "text-[#0a0a0a]/25"
                    }`}
                  >
                    {tab.number}
                  </span>
                  <div>
                    <div
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        activeTab === index ? "text-white" : "text-[#0a0a0a]"
                      }`}
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`text-[12px] transition-colors duration-300 ${
                        activeTab === index
                          ? "text-white/50"
                          : "text-[#0a0a0a]/40"
                      }`}
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="relative bg-[#0a0a0a] p-6 md:p-8 min-h-[340px] flex flex-col">
            <div className="flex items-center gap-1.5 mb-5">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <span className="ml-3 text-[11px] text-white/30 font-mono">
                {tabs[activeTab].language}
              </span>
            </div>

            <pre className="flex-1 overflow-auto">
              <code className="text-[13px] leading-6 font-mono text-white/70 whitespace-pre">
                {tabs[activeTab].code}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
