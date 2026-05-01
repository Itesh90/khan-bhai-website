export default function Rule({ width = 48, className = "" }: { width?: number; className?: string }) {
  return <span className={`kb-rule ${className}`} style={{ width }} aria-hidden />;
}
