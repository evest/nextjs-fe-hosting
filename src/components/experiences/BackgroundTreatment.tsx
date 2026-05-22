// Decorative, non-interactive background layers for a Landing Page Experience.
// Ported from the Content Gurus hero design explorations (V1b / V1d). Each
// treatment renders a self-contained `absolute inset-0 -z-10` layer so it sits
// behind the composition — and, when the experience extends up under the
// header, behind the header too.

type Props = {
  treatment?: string;
};

export function BackgroundTreatment({ treatment }: Props) {
  if (treatment === 'contours') return <ContoursTreatment />;
  if (treatment === 'brandWash') return <BrandWashTreatment />;
  return null;
}

// V1b — Soft topographic contour lines fading toward the top-left, with a
// faint warm wash. Speaks to the Nordic positioning without being literal.
function ContoursTreatment() {
  const lines = Array.from({ length: 14 }, (_, i) => {
    const y = 60 + i * 60;
    const wob = 30 + i * 4;
    return `M -50 ${y} C 200 ${y - wob}, 420 ${y + wob}, 700 ${y - wob * 0.6} S 1100 ${y + wob}, 1500 ${y - wob * 0.4}`;
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg
        viewBox="0 0 1440 780"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-50"
      >
        <defs>
          <linearGradient id="cg-contour-fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask id="cg-contour-mask">
            <rect width="1440" height="780" fill="url(#cg-contour-fade)" />
          </mask>
        </defs>
        <g
          mask="url(#cg-contour-mask)"
          fill="none"
          stroke="#0c1226"
          strokeOpacity="0.18"
          strokeWidth="1"
        >
          {lines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 80% 20%, rgba(244,122,28,0.06), transparent 60%)',
        }}
      />
    </div>
  );
}

// V1d — Subtle blue + orange radial blobs with a fine dot grid masked to a
// soft centre. The most overtly "brand-ish" of the treatments.
function BrandWashTreatment() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(38% 55% at 78% 18%, rgba(31,111,214,0.12), transparent 65%), radial-gradient(34% 50% at 92% 78%, rgba(244,122,28,0.14), transparent 65%), radial-gradient(28% 40% at 8% 88%, rgba(31,111,214,0.08), transparent 65%)',
          filter: 'blur(4px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(12,18,38,0.08) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(80% 80% at 50% 40%, #000, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(80% 80% at 50% 40%, #000, transparent 75%)',
        }}
      />
    </div>
  );
}
