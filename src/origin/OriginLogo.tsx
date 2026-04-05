/**
 * Default brand mark: document + magnifier (matches “colorful logo with file and magnifier”).
 * ChatGPT share URLs are HTML pages, not image files — export your asset from the chat
 * (Download / save image) and replace this component or swap in a PNG via `logoUrl` below.
 */
export function OriginLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="og-paper" x1="8" y1="6" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fafc" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="og-mag" x1="28" y1="28" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Paper */}
      <path
        d="M10 6h18l8 8v26a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
        fill="url(#og-paper)"
        stroke="#94a3b8"
        strokeWidth="1.25"
      />
      <path d="M28 6v8h8" stroke="#94a3b8" strokeWidth="1.25" strokeLinejoin="round" fill="none" />
      {/* Lines */}
      <path d="M14 22h16M14 27h12M14 32h14" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      {/* Accent corner */}
      <path d="M10 6h18v8H10V6z" fill="#ccfbf1" opacity="0.85" />
      {/* Magnifier */}
      <circle cx="31" cy="31" r="9" stroke="url(#og-mag)" strokeWidth="3" fill="none" />
      <path d="M38 38l7 7" stroke="url(#og-mag)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="31" cy="31" r="5" fill="#fff" fillOpacity="0.25" />
    </svg>
  );
}
