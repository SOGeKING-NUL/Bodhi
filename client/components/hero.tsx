import Link from "next/link";
import HeroBrain from "./hero-brain";

export default function Hero() {
  return (
    <div className="w-full max-w-[1760px] mx-auto px-6 sm:px-8 lg:px-10 xl:px-14 relative flex flex-col justify-start items-start">
      <div className="w-px h-full absolute left-6 sm:left-8 lg:left-10 xl:left-14 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0" />

      <div className="w-px h-full absolute right-6 sm:right-8 lg:right-10 xl:right-14 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0" />

      <div className="self-stretch overflow-hidden border-b border-[rgba(55,50,47,0.06)] flex flex-col justify-center items-center">
        <div className="pt-[100px] pb-[56px] lg:pt-[120px] lg:pb-[72px] px-4 md:px-8 w-full">
          <div className="max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.92fr] gap-12 lg:gap-10 items-center">
            {/* Left column — copy + CTAs */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-bodhi-surface rounded-full border border-bodhi-line mb-8 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60 animate-fade-in-up"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-bodhi-clay" />
                AI voice interviewer — now live
              </div>

              <h1
                className="w-full max-w-[680px] text-[#0a0a0a] text-[56px] md:text-[76px] lg:text-[84px] font-light leading-[1.03] tracking-[-0.04em] mb-6 animate-fade-in-up"
                style={{
                  animationDelay: "0.1s",
                  fontFamily: "var(--font-inter)",
                }}
              >
                The interview edge,
                <span
                  className="italic font-light text-black/60"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {" "}
                  available today.
                </span>
              </h1>

              <p
                className="w-full max-w-[560px] text-[#0a0a0a]/60 text-[17px] md:text-[20px] leading-relaxed tracking-[-0.01em] mb-10 font-normal animate-fade-in-up"
                style={{
                  animationDelay: "0.2s",
                  fontFamily: "var(--font-inter)",
                }}
              >
                Practice with AI-native interviewers tailored to your dream
                roles. Gain actionable feedback and elevate your confidence{" "}
                <span
                  className="italic"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    fontSize: "1.05em",
                  }}
                >
                  instantly.
                </span>
              </p>

              <div
                className="flex flex-col sm:flex-row items-center gap-3 mb-5 animate-fade-in-up"
                style={{ animationDelay: "0.3s", opacity: 0 }}
              >
                <Link
                  href="/interview"
                  className="h-[48px] px-8 flex items-center justify-center gap-2 bg-bodhi-clay text-white text-[14px] font-medium tracking-[-0.01em] rounded-full shadow-[0_8px_24px_rgba(217,119,87,0.35)] transition-all duration-300 hover:bg-bodhi-clay-dark hover:shadow-[0_10px_28px_rgba(217,119,87,0.45)] active:scale-95"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  Start practicing
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href="https://youtu.be/tvwdEFT3wSc"
                  className="h-[48px] px-8 flex items-center justify-center gap-2 border border-[#0a0a0a]/15 text-[#0a0a0a] text-[14px] font-medium tracking-[-0.01em] rounded-full transition-all duration-300 hover:border-[#0a0a0a]/35 hover:bg-black/[0.02] active:scale-95"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  <span aria-hidden className="text-[11px]">
                    ▶
                  </span>
                  Watch how it works
                </Link>
              </div>

              <p
                className="text-[13px] text-[#0a0a0a]/40 animate-fade-in-up"
                style={{
                  animationDelay: "0.4s",
                  opacity: 0,
                  fontFamily: "var(--font-inter)",
                }}
              >
                Free to start · No credit card · Voice-first, hands-free
              </p>
            </div>

            {/* Right column — 3D particle brain */}
            <div className="flex justify-center lg:justify-end">
              <HeroBrain />
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              href="/#how-it-works"
              className="mt-10 flex flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-[#0a0a0a]/35 transition-colors hover:text-[#0a0a0a]/60 animate-fade-in-up"
              style={{
                animationDelay: "0.6s",
                opacity: 0,
                fontFamily: "var(--font-inter)",
              }}
            >
              See how it works
              <span aria-hidden className="animate-float text-[14px]">
                ↓
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
