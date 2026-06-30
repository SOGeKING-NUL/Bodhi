"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    title: "Voice-first mock interviews",
    description:
      "Speak naturally with an AI interviewer that listens, asks dynamic follow-ups, and adapts difficulty in real time — tailored to your target company and role. It feels like the real thing.",
    large: true,
  },
  {
    title: "Detailed scorecard",
    description:
      "Get a phase-by-phase breakdown scored on accuracy, depth, communication, and confidence — plus strengths, fixes, and a downloadable PDF report.",
    large: false,
  },
  {
    title: "Behavioral insights",
    description:
      "Live analysis of your confidence, speaking pace, and filler words, with posture and gaze proctoring that flags what to tighten before the real interview.",
    large: false,
  },
  {
    title: "Track your progress",
    description:
      "Every session is saved to your history with scores and feedback, so you can see exactly where you're improving and what still needs work.",
    large: false,
  },
];

export default function FeaturesGridSection() {
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
      id="platform"
      ref={sectionRef}
      className="w-full py-24 md:py-32 px-4 md:px-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full border border-black/[0.06] mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Platform
          </div>
          <h2
            className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Everything you need
            <br />
            <span
              className="italic font-light"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              to ace interviews.
            </span>
          </h2>
        </div>

        <div className="space-y-4 md:space-y-5">
          <div
            className="group relative overflow-hidden rounded-2xl bg-white border border-black/[0.06] p-8 md:p-12 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] hover:border-black/[0.1] min-h-[280px] cursor-default"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div className="relative z-10 max-w-md">
              <h3
                className="text-[#0a0a0a] text-xl md:text-2xl font-medium tracking-[-0.02em] mb-3"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {features[0].title}
              </h3>
              <p
                className="text-[#0a0a0a]/50 text-sm md:text-base leading-relaxed"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {features[0].description}
              </p>
            </div>

            <div className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500">
              <svg
                width="240"
                height="240"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {features.slice(1).map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl bg-white border border-black/[0.06] p-7 md:p-8 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] hover:border-black/[0.1] cursor-default"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(24px)",
                  transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${(index + 1) * 0.1}s`,
                }}
              >
                <div className="relative z-10">
                  <h3
                    className="text-[#0a0a0a] text-base md:text-lg font-medium tracking-[-0.02em] mb-2"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-[#0a0a0a]/50 text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
