"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  {
    value: "50K+",
    label: "Mock Interviews Completed",
    description: "Practice sessions powered by Bodhi's AI engine",
  },
  {
    value: "92%",
    label: "Interview Success Rate",
    description: "Of users who practiced 5+ sessions got offers",
  },
  {
    value: "4.9/5",
    label: "User Satisfaction",
    description: "Average rating from thousands of candidates",
  },
  {
    value: "200+",
    label: "Companies Covered",
    description: "Role-specific question banks continuously updated",
  },
];

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<string[]>(
    stats.map(() => "0"),
  );
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTimeout(() => {
            setAnimatedValues(stats.map((s) => s.value));
          }, 300);
        }
      },
      { threshold: 0.3 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-[#37322F] p-8 md:p-14">
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, white 1px, transparent 1px),
                  linear-gradient(to bottom, white 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-white/5 to-transparent rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-white/5 to-transparent rounded-full -translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-white text-3xl md:text-4xl font-semibold font-sans tracking-tight mb-3">
                Numbers that speak
              </h2>
              <p className="text-white/50 text-base font-sans max-w-md mx-auto">
                Join thousands of candidates who transformed their interview
                performance with Bodhi.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center group"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(20px)",
                    transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.12}s`,
                  }}
                >
                  <div className="text-3xl md:text-5xl font-semibold font-serif text-white mb-2 transition-all duration-700">
                    {animatedValues[index]}
                  </div>
                  <div className="text-white/80 text-sm font-semibold font-sans mb-1">
                    {stat.label}
                  </div>
                  <div className="text-white/40 text-xs font-sans leading-relaxed">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
