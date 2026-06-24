"use client";

import { useState, useEffect, useRef } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is Bodhi and who is it for?",
    answer:
      "Bodhi is an AI mock interview platform built for candidates, teams, and bootcamps who want realistic interview practice with structured feedback and resume-aware coaching.",
  },
  {
    question: "How does Bodhi tailor interviews to my background?",
    answer:
      "When you upload your resume, Bodhi parses your skills, experience, and target roles. It then generates interview questions that an actual interviewer would ask someone with your background — making every session hyper-relevant.",
  },
  {
    question: "Can I integrate Bodhi with my existing tools?",
    answer:
      "Yes. Bodhi exposes APIs for sessions, documents, and resume profiles so you can integrate with your hiring stack, LMS, or internal tooling.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "We offer 24/7 customer support, dedicated account managers for enterprise clients, comprehensive documentation, and onboarding assistance to help you get started quickly.",
  },
  {
    question: "Is my data secure with Bodhi?",
    answer:
      "We use encrypted storage, Clerk authentication, and scoped access to keep interview data and resumes protected.",
  },
  {
    question: "How do I get started with Bodhi?",
    answer:
      "Sign in, upload your resume, and launch a mock interview from the dashboard. Bodhi guides you through targeted practice and feedback.",
  },
];

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);
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

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <section ref={sectionRef} className="w-full py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          <div className="lg:w-[320px] shrink-0">
            <div
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
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
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-[#37322F] text-xs font-medium font-sans">
                  FAQ
                </span>
              </div>
              <h2 className="text-[#49423D] text-3xl md:text-4xl font-semibold leading-tight font-sans tracking-tight mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-[#847971] text-sm font-sans leading-relaxed">
                Can&apos;t find what you&apos;re looking for? Reach out to our
                support team.
              </p>
            </div>
          </div>

          <div className="flex-1">
            {faqData.map((item, index) => {
              const isOpen = openItems.includes(index);
              return (
                <div
                  key={index}
                  className="border-b border-[rgba(55,50,47,0.08)] last:border-b-0"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(16px)",
                    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.06}s`,
                  }}
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full py-5 flex justify-between items-center gap-4 text-left group"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[#37322F] text-[15px] font-medium font-sans group-hover:text-[#2A2624] transition-colors">
                      {item.question}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full border border-[rgba(55,50,47,0.1)] flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen
                          ? "bg-[#37322F] border-[#37322F] rotate-45"
                          : "group-hover:border-[rgba(55,50,47,0.2)]"
                      }`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isOpen ? "white" : "#49423D"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-400 ease-out ${
                      isOpen ? "max-h-48 opacity-100 pb-5" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-[#847971] text-sm font-sans leading-relaxed pr-10">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
