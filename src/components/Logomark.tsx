export function Logomark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <rect width="34" height="34" rx="10" className="fill-primary" />
      <path
        d="M11 20.5C11 17 14 15 17 15C20 15 23 17 23 20.5C23 22.5 21 24 17 24C13 24 11 22.5 11 20.5Z"
        className="fill-primary-foreground"
      />
      <circle cx="17" cy="11" r="2.4" className="fill-primary-foreground" />
    </svg>
  );
}
