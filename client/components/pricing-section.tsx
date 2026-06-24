"use client";

import { useState, useEffect, useRef } from "react";

export default function PricingSection() {
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

  const plans = [
    {
      name: "Sandbox",
      subtitle: "Start experimenting",
      price: "Free",
      priceSuffix: "",
      cta: "Get started",
      featured: false,
      features: [
        "5 mock interviews/mo",
        "Basic feedback",
        "Community support",
        "Standard roles",
      ],
    },
    {
      name: "Builder",
      subtitle: "For serious prep",
      price: "$49",
      priceSuffix: "/mo",
      cta: "Start practicing",
      featured: true,
      features: [
        "50 mock interviews/mo",
        "Advanced analytics + replay",
        "Priority support",
        "Custom job descriptions",
        "Resume parser integration",
        "REST API access",
      ],
    },
    {
      name: "Enterprise",
      subtitle: "For hiring teams",
      price: "Custom",
      priceSuffix: "",
      cta: "Contact sales",
      featured: false,
      features: [
        "Unlimited interviews",
        "Custom company branding",
        "Dedicated infra",
        "SOC 2 / HIPAA",
        "SLA guarantees",
        "Candidate tracking",
      ],
    },
  ];

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="w-full py-24 md:py-32 px-4 md:px-8"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full border border-black/[0.06] mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Pricing
          </div>
          <h2
            className="text-[#0a0a0a] text-3xl md:text-[44px] font-light leading-[1.15] tracking-[-0.03em] mb-5"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Pay as your
            <br />
            <span
              className="italic font-light"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              practice grows.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-7 md:p-8 transition-all duration-500 ${
                plan.featured
                  ? "bg-[#0a0a0a] text-white shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
                  : "bg-white border border-black/[0.06] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] hover:border-black/[0.1]"
              }`}
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
              }}
            >
              <div className="mb-8">
                <div
                  className={`text-[11px] font-medium uppercase tracking-[0.1em] mb-1 ${
                    plan.featured ? "text-white/40" : "text-[#0a0a0a]/35"
                  }`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {plan.subtitle}
                </div>
                <h3
                  className={`text-lg font-semibold tracking-[-0.02em] ${
                    plan.featured ? "text-white" : "text-[#0a0a0a]"
                  }`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {plan.name}
                </h3>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl md:text-5xl font-light tracking-[-0.04em] ${
                      plan.featured ? "text-white" : "text-[#0a0a0a]"
                    }`}
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {plan.price}
                  </span>
                  {plan.priceSuffix && (
                    <span
                      className={`text-sm ${
                        plan.featured ? "text-white/40" : "text-[#0a0a0a]/35"
                      }`}
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {plan.priceSuffix}
                    </span>
                  )}
                </div>
              </div>

              <button
                className={`w-full h-11 rounded-full text-[13px] font-semibold transition-all duration-300 mb-8 ${
                  plan.featured
                    ? "bg-white text-[#0a0a0a] hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
                    : "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] hover:shadow-md"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {plan.cta}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, fi) => (
                  <div key={fi} className="flex items-center gap-2.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={
                        plan.featured
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(0,0,0,0.2)"
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span
                      className={`text-[13px] ${
                        plan.featured ? "text-white/65" : "text-[#0a0a0a]/55"
                      }`}
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
