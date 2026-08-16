export default function NexusLogo({ className = "h-10 w-10", withWordmark = false }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${withWordmark ? "" : ""}`}>
      <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Nexus Drop logo">
        <rect x="1" y="1" width="46" height="46" rx="12" fill="#07131b" stroke="#22d3ee" strokeWidth="2" />
        <path d="M12 35V13h5l14 14V13h5v22h-5L17 21v14h-5Z" fill="#f8fafc" />
        <path d="M27 35h8l-8-8v8Z" fill="#22d3ee" />
        <path d="M10 39h28" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {withWordmark && <span className="text-sm font-black tracking-[0.12em] text-white">NEXUS <span className="text-cyan-300">DROP</span></span>}
    </span>
  );
}
