/**
 * HeroBrain — Spline "particle AI brain" embedded via the public viewer URL.
 *
 * The scene isn't published as a standalone .splinecode file (that URL 403s),
 * so @splinetool/react-spline can't load it — the particle data is inlined in
 * the my.spline.design viewer page. An iframe of that page is the only way in,
 * and needs no extra dependency.
 *
 * The scene itself is authored on solid black (that's baked into the scene,
 * not something we can recolor). A circular CSS mask fades the iframe to
 * transparent well before its edges, so the black reads as a soft vignette
 * dissolving into the page instead of a hard box — and the same fade hides
 * the free-tier "Built with Spline" badge, which sits in the corners that
 * the mask already fully clips.
 */
const SPLINE_URL =
  "https://my.spline.design/particleaibrain-qMFMBJdpEQCqUhkcxBWQfkJD/";

export default function HeroBrain() {
  return (
    <div
      className="relative w-full max-w-[640px] aspect-square animate-fade-in-up"
      style={{ animationDelay: "0.4s", opacity: 0 }}
    >
      <div
        className="absolute inset-0 -z-10 rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,87,0.25) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          filter: "drop-shadow(0 30px 70px rgba(55,50,47,0.2))",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 44%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 44%, transparent 72%)",
        }}
      >
        <iframe
          src={SPLINE_URL}
          title="AI particle brain visualization"
          loading="lazy"
          className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 border-0"
        />
      </div>
    </div>
  );
}
