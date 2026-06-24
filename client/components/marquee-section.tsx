"use client";

import { useEffect, useRef, useState } from "react";

const marqueeItems1 = [
  "Behavioral Interviews",
  "System Design",
  "Frontend Challenges",
  "Resume Screening",
  "Algorithm Practice",
  "Mock Negotiations",
  "Technical Screening",
  "Performance Logs",
];

const marqueeItems2 = [
  "Real-time Feedback",
  "Confidence Analysis",
  "Role-play Scenarios",
  "Salary Insights",
  "Code Review Mock",
  "Project Deep-dives",
  "Culture Fit Prep",
  "Skill Gap Analysis",
];

function MarqueeRow({
  items,
  direction = "left",
  speed = 40,
}: {
  items: string[];
  direction?: "left" | "right";
  speed?: number;
}) {
  return (
    <div
      className="relative overflow-hidden w-full border-b border-black/[0.04] bg-[#F7F5F3]"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-12 py-5 border-r border-black/[0.04] shrink-0"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]/20" />
            <span
              className="text-[14px] font-medium text-[#0a0a0a]/50"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PixelAvatar() {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex gap-[2px]">
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-transparent" />
      </div>
      <div className="flex gap-[2px]">
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
      </div>
      <div className="flex gap-[2px] opacity-60">
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
      </div>
      <div className="flex gap-[2px] opacity-30">
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
      </div>
      <div className="flex gap-[2px] opacity-10">
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-transparent" />
        <div className="w-[5px] h-[5px] bg-[#0a0a0a]/80" />
      </div>
    </div>
  );
}

export default function MarqueeSection() {
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
      id="live"
      ref={sectionRef}
      className="w-full pt-16 pb-24 md:pb-32 bg-[#F7F5F3]"
    >
      <div className="mb-12 md:mb-16 flex justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Pixel Avatar */}
          <div className="animate-pulse">
            <PixelAvatar />
          </div>

          {/* Live Badge */}
          <div
            className="px-5 py-2 bg-[#EBE9E8] rounded-full text-[11px] font-semibold tracking-[0.06em] text-[#0a0a0a]/50 uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Live Right Now
          </div>
        </div>
      </div>

      <div className="w-full border-t border-black/[0.04]">
        <MarqueeRow items={marqueeItems1} direction="left" speed={40} />
        <MarqueeRow items={marqueeItems2} direction="right" speed={35} />
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
