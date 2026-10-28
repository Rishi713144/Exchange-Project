const PALETTES: [string, string][] = [
  ["#f59e0b", "#ef4444"],
  ["#6366f1", "#06b6d4"],
  ["#10b981", "#84cc16"],
  ["#ec4899", "#8b5cf6"],
  ["#0ea5e9", "#3b82f6"],
  ["#f97316", "#eab308"],
];

function paletteFor(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

export function AssetIcon({
  symbol,
  size = 40,
  className = "",
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [from, to] = paletteFor(symbol || "?");
  const initials = symbol.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full border border-white/10 font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(size * 0.32, 10),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
