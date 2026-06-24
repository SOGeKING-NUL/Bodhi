"use client";

import { useState, useEffect, useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Upload Your Resume",
    description:
      "Drop your resume and Bodhi instantly parses your experience, skills, and background to personalize every session.",
    icon: (
      <svg
        width="28"
        height="28"
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
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="relative">
          <div className="w-48 h-64 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[rgba(55,50,47,0.08)] p-5 transform rotate-[-2deg] transition-transform duration-500 hover:rotate-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8E3DF] to-[#D4CEC9] mb-4 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#49423D"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="space-y-2.5">
              <div className="h-2 bg-[#E8E3DF] rounded-full w-3/4" />
              <div className="h-2 bg-[#E8E3DF] rounded-full w-full" />
              <div className="h-2 bg-[#E8E3DF] rounded-full w-5/6" />
              <div className="mt-4 h-2 bg-[#E8E3DF] rounded-full w-2/3" />
              <div className="h-2 bg-[#E8E3DF] rounded-full w-full" />
              <div className="h-2 bg-[#E8E3DF] rounded-full w-4/5" />
              <div className="mt-4 flex gap-1.5">
                <div className="h-5 px-2 bg-[#37322F] rounded-full flex items-center">
                  <span className="text-[7px] text-white font-medium">
                    React
                  </span>
                </div>
                <div className="h-5 px-2 bg-[#49423D] rounded-full flex items-center">
                  <span className="text-[7px] text-white font-medium">
                    Python
                  </span>
                </div>
                <div className="h-5 px-2 bg-[#605A57] rounded-full flex items-center">
                  <span className="text-[7px] text-white font-medium">SQL</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#37322F] rounded-xl flex items-center justify-center shadow-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Choose Your Role & Company",
    description:
      "Select from real companies and job roles. Bodhi tailors questions to match the exact interview style you'll face.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-3 w-56">
          {[
            {
              company: "Google",
              role: "SDE II",
              color: "#4285F4",
              active: true,
            },
            {
              company: "Meta",
              role: "Frontend Eng",
              color: "#1877F2",
              active: false,
            },
            {
              company: "Amazon",
              role: "SDE I",
              color: "#FF9900",
              active: false,
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                item.active
                  ? "bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-[rgba(55,50,47,0.15)] scale-[1.02]"
                  : "bg-white/50 border-[rgba(55,50,47,0.06)] hover:bg-white/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: item.color }}
                >
                  {item.company[0]}
                </div>
                <div>
                  <div className="text-[#37322F] text-sm font-semibold font-sans">
                    {item.company}
                  </div>
                  <div className="text-[#847971] text-xs font-sans">
                    {item.role}
                  </div>
                </div>
                {item.active && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-[#37322F] flex items-center justify-center">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Practice & Get Feedback",
    description:
      "Engage in realistic voice-first mock interviews. Receive instant, detailed feedback with scoring across multiple dimensions.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    visual: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-56 space-y-3">
          <div className="bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[rgba(55,50,47,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#37322F] flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">AI</span>
              </div>
              <span className="text-[11px] text-[#847971] font-sans font-medium">
                Bodhi Interviewer
              </span>
            </div>
            <div className="text-[11px] text-[#49423D] font-sans leading-4">
              &ldquo;Tell me about a time you designed a system to handle high
              traffic...&rdquo;
            </div>
          </div>
          <div className="bg-[#37322F] rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-white/70 font-sans font-medium">
                Your Score
              </span>
              <span className="text-[15px] text-white font-bold font-sans">
                8.5/10
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Clarity", score: 90 },
                { label: "Depth", score: 75 },
                { label: "Structure", score: 85 },
              ].map((metric, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-white/60 font-sans">
                      {metric.label}
                    </span>
                    <span className="text-[9px] text-white/80 font-sans">
                      {metric.score}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-white/60 to-white rounded-full"
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex px-[14px] py-[6px] bg-white shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] rounded-[90px] items-center gap-[8px] border border-[rgba(2,6,23,0.08)] mb-6">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#37322F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[#37322F] text-xs font-medium font-sans">
              How it works
            </span>
          </div>
          <h2 className="text-[#49423D] text-3xl md:text-5xl font-semibold leading-tight font-sans tracking-tight mb-4">
            Three steps to interview
            <br className="hidden sm:block" />
            confidence
          </h2>
          <p className="text-[#605A57] text-base md:text-lg font-medium leading-7 font-sans max-w-lg mx-auto">
            From resume upload to real-time feedback — your path to landing the
            dream job.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-5 md:p-6 rounded-2xl transition-all duration-500 group ${
                  activeStep === index
                    ? "bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(55,50,47,0.08)]"
                    : "hover:bg-white/50 border border-transparent"
                }`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(20px)",
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      activeStep === index
                        ? "bg-[#37322F] text-white shadow-lg"
                        : "bg-[#E8E3DF] text-[#49423D] group-hover:bg-[#DED9D5]"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-mono font-medium transition-colors duration-300 ${
                          activeStep === index
                            ? "text-[#37322F]"
                            : "text-[#B2AEA9]"
                        }`}
                      >
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-[#37322F] text-base md:text-lg font-semibold font-sans mb-1.5">
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm font-sans leading-relaxed transition-all duration-500 overflow-hidden ${
                        activeStep === index
                          ? "text-[#605A57] max-h-24 opacity-100"
                          : "text-[#B2AEA9] max-h-0 opacity-0 lg:max-h-24 lg:opacity-100"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="relative h-[380px] md:h-[420px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8E3DF]/30 to-transparent rounded-3xl" />
            {steps.map((step, index) => (
              <div
                key={index}
                className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
                style={{
                  opacity: activeStep === index ? 1 : 0,
                  transform:
                    activeStep === index
                      ? "scale(1) translateY(0)"
                      : "scale(0.9) translateY(20px)",
                  pointerEvents: activeStep === index ? "auto" : "none",
                }}
              >
                {step.visual}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
