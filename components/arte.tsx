/**
 * Marcadores SVG con estética "retrato", como los de la demo de Sofy.
 * Se reemplazan por fotos reales cuando la config tiene imagen.
 */
export function Arte({
  hues = ["#3e2b22", "#8a5a44", "#ddb9a3"],
  abajo = "sofy makeup",
  className = "",
}: {
  hues?: string[];
  abajo?: string;
  className?: string;
}) {
  const [fondo, medio, claro] = hues;
  const gid = `g-${fondo.replace("#", "")}-${medio.replace("#", "")}`;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={fondo} />
          <stop offset="0.55" stopColor={medio} />
          <stop offset="1" stopColor={claro} />
        </linearGradient>
        <radialGradient id={`${gid}-c`} cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stopColor="#fff3e9" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3e9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      <ellipse cx="200" cy="150" rx="95" ry="120" fill={`url(#${gid}-c)`} />
      <ellipse cx="200" cy="150" rx="72" ry="92" fill="none" stroke="#2a1b12" strokeOpacity="0.55" strokeWidth="1.4" />
      <path d="M155 130 q12 -11 30 -2 q5 4 12 2" fill="none" stroke="#2a1b12" strokeWidth="2" strokeLinecap="round" />
      <path d="M245 130 q-12 -11 -30 -2 q-5 4 -12 2" fill="none" stroke="#2a1b12" strokeWidth="2" strokeLinecap="round" />
      <path d="M150 128 q4 -8 12 -9 M146 130 q6 -12 18 -13" fill="none" stroke="#2a1b12" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M250 128 q-4 -8 -12 -9 M254 130 q-6 -12 -18 -13" fill="none" stroke="#2a1b12" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="170" cy="133" r="3" fill="#2a1b12" />
      <circle cx="230" cy="133" r="3" fill="#2a1b12" />
      <path d="M162 121 l-6 -8 M178 117 l-2 -9 M194 118 l3 -9 M238 121 l6 -8 M222 117 l2 -9 M206 118 l-3 -9" stroke="#2a1b12" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M200 145 v18 q-4 4 -2 6" fill="none" stroke="#2a1b12" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M182 186 q8 -8 18 -4 q10 -4 18 4 q-10 10 -18 8 q-8 2 -18 -8z" fill="#7a2e3a" fillOpacity="0.85" stroke="#2a1b12" strokeWidth="1.2" />
      <circle cx="158" cy="160" r="14" fill="#c4685f" fillOpacity="0.25" />
      <circle cx="242" cy="160" r="14" fill="#c4685f" fillOpacity="0.25" />
      <path d="M300 40 l30 260" stroke="#1e130c" strokeOpacity="0.25" strokeWidth="10" strokeLinecap="round" />
      <path d="M330 250 q10 18 0 30 q-10 -12 0 -30" fill="#3b2a1e" />
      <path d="M80 30 l-20 250" stroke="#1e130c" strokeOpacity="0.18" strokeWidth="8" strokeLinecap="round" />
      <text x="200" y="278" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="13" fill="#2a1b12" fillOpacity="0.5">
        {abajo}
      </text>
    </svg>
  );
}
