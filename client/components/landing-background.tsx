export default function LandingBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #37322F 1px, transparent 1px),
            linear-gradient(to bottom, #37322F 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-[#D97757]/20 via-[#E8A87C]/10 to-transparent blur-[120px] rounded-full" />

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8E3DF] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[float_6s_ease-in-out_infinite]" />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#DED9D5] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[float_6s_ease-in-out_infinite]"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}
