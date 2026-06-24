"use client";

import { useState, useEffect, useRef } from "react";

const testimonials = [
  {
    quote:
      "Bodhi helped me simulate real interviews in minutes. The feedback was clear, actionable, and confidence-boosting.",
    name: "Jamie Marshall",
    company: "Co-founder, Exponent",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Sep%2011%2C%202025%2C%2011_35_19%20AM-z4zSRLsbOQDp7MJS1t8EXmGNB6Al9Z.png",
  },
  {
    quote:
      "Bodhi has revolutionized how we prepare candidates. Structured mock interviews save us hours every week and improve outcomes.",
    name: "Sarah Chen",
    company: "VP Operations, TechFlow",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Sep%2011%2C%202025%2C%2010_54_18%20AM-nbiecp92QNdTudmCrHr97uekrIPzCP.png",
  },
  {
    quote:
      "The resume-aware coaching is a game-changer. What used to take days of prep now happens in one focused session.",
    name: "Marcus Rodriguez",
    company: "Finance Director, InnovateCorp",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Sep%2011%2C%202025%2C%2011_01_05%20AM-TBOe92trRxKn4G5So1m9D2h7LRH4PG.png",
  },
];

export default function TestimonialsSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        setTimeout(() => setIsTransitioning(false), 100);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigationClick = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTestimonial(index);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 300);
  };

  return (
    <section ref={sectionRef} className="w-full py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[#37322F] text-xs font-medium font-sans">
              What people say
            </span>
          </div>
          <h2 className="text-[#49423D] text-3xl md:text-5xl font-semibold leading-tight font-sans tracking-tight">
            Loved by candidates
            <br className="hidden sm:block" />
            and hiring teams
          </h2>
        </div>

        <div
          className="relative bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-[rgba(55,50,47,0.06)]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="absolute top-8 left-8 md:top-10 md:left-12 text-6xl md:text-8xl font-serif text-[#E8E3DF] leading-none select-none pointer-events-none">
            &ldquo;
          </div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center relative z-10">
            <div className="shrink-0">
              <div className="relative">
                <img
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover transition-all duration-700 ease-in-out"
                  style={{
                    opacity: isTransitioning ? 0.5 : 1,
                    transform: isTransitioning ? "scale(0.95)" : "scale(1)",
                  }}
                  src={
                    testimonials[activeTestimonial].image || "/placeholder.svg"
                  }
                  alt={testimonials[activeTestimonial].name}
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#37322F] rounded-lg flex items-center justify-center shadow-lg">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div
                className="text-[#49423D] text-xl md:text-2xl lg:text-[28px] font-medium leading-relaxed md:leading-[1.5] font-sans tracking-tight mb-6 transition-all duration-700 ease-in-out min-h-[100px]"
                style={{
                  filter: isTransitioning ? "blur(4px)" : "blur(0px)",
                }}
              >
                &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
              </div>

              <div
                className="flex items-center justify-between transition-all duration-700"
                style={{ filter: isTransitioning ? "blur(4px)" : "blur(0px)" }}
              >
                <div>
                  <div className="text-[#37322F] text-base font-semibold font-sans">
                    {testimonials[activeTestimonial].name}
                  </div>
                  <div className="text-[#847971] text-sm font-sans">
                    {testimonials[activeTestimonial].company}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleNavigationClick(
                        (activeTestimonial - 1 + testimonials.length) %
                          testimonials.length,
                      )
                    }
                    className="w-9 h-9 rounded-full border border-[rgba(55,50,47,0.12)] flex items-center justify-center hover:bg-[rgba(55,50,47,0.04)] transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#49423D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      handleNavigationClick(
                        (activeTestimonial + 1) % testimonials.length,
                      )
                    }
                    className="w-9 h-9 rounded-full border border-[rgba(55,50,47,0.12)] flex items-center justify-center hover:bg-[rgba(55,50,47,0.04)] transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#49423D"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => handleNavigationClick(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeTestimonial === i
                    ? "w-8 bg-[#37322F]"
                    : "w-1.5 bg-[#E8E3DF] hover:bg-[#DED9D5]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
