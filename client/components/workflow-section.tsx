"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Upload",
    description:
      "Upload your resume to give the AI context about your experience and background.",
  },
  {
    number: "02",
    title: "Select Role",
    description:
      "Choose your target job title, company, and specific interview domains you want to practice.",
  },
  {
    number: "03",
    title: "Interview",
    description:
      "Engage in a realistic voice or text-based interview with dynamic follow-up questions.",
  },
  {
    number: "04",
    title: "Review",
    description:
      "Receive an actionable scorecard, detailed feedback, and suggested improvements.",
  },
];

export default function WorkflowSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      id="workflow"
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
            Workflow
          </div>
          <h2
            className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            From prep to interview edge
            <br />
            <span
              className="italic font-light"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              in four steps.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`group relative text-left p-6 md:p-7 rounded-2xl transition-all duration-500 border ${
                activeStep === index
                  ? "bg-[#0a0a0a] border-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
                  : "bg-white border-black/[0.06] hover:border-black/[0.12] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              }`}
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(24px)",
                transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
              }}
            >
              <div
                className={`text-[11px] font-mono font-medium mb-4 transition-colors duration-300 ${
                  activeStep === index ? "text-white/40" : "text-[#0a0a0a]/25"
                }`}
              >
                {step.number}
              </div>

              <h3
                className={`text-lg md:text-xl font-medium tracking-[-0.02em] mb-3 transition-colors duration-300 ${
                  activeStep === index ? "text-white" : "text-[#0a0a0a]"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {step.title}
              </h3>

              <p
                className={`text-sm leading-relaxed transition-colors duration-300 ${
                  activeStep === index ? "text-white/55" : "text-[#0a0a0a]/45"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {step.description}
              </p>

              {activeStep === index && (
                <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full animate-[progressBar_3s_linear_forwards]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progressBar {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
