export default function Hero() {
  return (
    <div className="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-0 lg:max-w-[1060px] lg:w-[1060px] relative flex flex-col justify-start items-start">
      <div className="w-px h-full absolute left-4 sm:left-6 md:left-8 lg:left-0 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0" />

      <div className="w-px h-full absolute right-4 sm:right-6 md:right-8 lg:right-0 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0" />

      <div className="self-stretch overflow-hidden border-b border-[rgba(55,50,47,0.06)] flex flex-col justify-center items-center">
        <div className="pt-[160px] pb-[80px] lg:pt-[240px] lg:pb-[140px] flex flex-col justify-center items-center px-4 md:px-8 w-full text-center">
          <h1
            className="w-full max-w-[900px] text-[#0a0a0a] text-[48px] md:text-[64px] lg:text-[88px] font-light leading-[1.05] tracking-[-0.04em] mb-6 animate-fade-in-up"
            style={{
              animationDelay: "0.1s",
              fontFamily: "var(--font-inter)",
            }}
          >
            The interview edge,
            <br className="hidden md:block" />
            <span
              className="italic font-light text-black/60"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {" "}
              available today.
            </span>
          </h1>

          <p
            className="w-full max-w-[600px] text-[#0a0a0a]/60 text-[16px] md:text-[20px] leading-relaxed tracking-[-0.01em] mb-10 font-normal animate-fade-in-up"
            style={{
              animationDelay: "0.2s",
              fontFamily: "var(--font-inter)",
            }}
          >
            Practice with AI-native interviewers tailored to your dream roles.
            Gain actionable feedback and elevate your confidence{" "}
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
        </div>
      </div>
    </div>
  );
}
