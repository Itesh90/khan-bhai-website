export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <span className={`kb-ornament ${className}`} aria-hidden>
      <span className="lozenge" />
    </span>
  );
}
