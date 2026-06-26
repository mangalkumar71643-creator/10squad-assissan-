import { useState } from "react";
import { useLocation } from "wouter";
import { useGetPlayerCharacters, useGetCurrentPlayer } from "@workspace/api-client-react";
import { ChevronLeft, Lock, Star, Zap, Shield, Crosshair } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const RARITY_CONFIG = {
  common:    { border: "rgba(150,150,150,0.6)", glow: "rgba(150,150,150,0.3)", text: "#aaaaaa", label: "COMMON" },
  rare:      { border: "rgba(0,180,255,0.7)",   glow: "rgba(0,180,255,0.4)",   text: "#00b4ff", label: "RARE" },
  epic:      { border: "rgba(160,80,255,0.8)",  glow: "rgba(160,80,255,0.4)",  text: "#a050ff", label: "EPIC" },
  legendary: { border: "rgba(255,180,0,0.9)",   glow: "rgba(255,180,0,0.5)",   text: "#ffb400", label: "LEGENDARY" },
} as const;

const CHAR_STATS: Record<string, { speed: number; power: number; defense: number; role: string }> = {
  "HACKER GIRL":       { speed: 90, power: 75, defense: 60, role: "ASSAULT" },
  "PHANTOM":           { speed: 95, power: 65, defense: 55, role: "RECON" },
  "NINJA X":           { speed: 99, power: 88, defense: 45, role: "STEALTH" },
  "SPACE HEIST OPS":   { speed: 70, power: 92, defense: 85, role: "TANK" },
};

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "2px",
        boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
}

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading } = useGetPlayerCharacters();
  const { data: player } = useGetCurrentPlayer();
  const queryClient = useQueryClient();

  const selected = characters?.find(c => c.selected) ?? characters?.[0];
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeChar = characters?.find(c => c.id === activeId) ?? selected;

  const equipMutation = useMutation({
    mutationFn: async (charId: number) => {
      const res = await fetch(`/api/players/me/characters/${charId}/equip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to equip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/me"] });
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-mono text-sm tracking-[0.3em] animate-pulse">LOADING ARSENAL...</span>
        </div>
      </div>
    );
  }

  const rarity = (activeChar?.rarity ?? "common") as keyof typeof RARITY_CONFIG;
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const stats = CHAR_STATS[activeChar?.name ?? ""] ?? { speed: 70, power: 70, defense: 70, role: "ASSAULT" };

  return (
    <div className="relative h-screen w-screen text-white font-sans overflow-hidden"
      style={{ background: "linear-gradient(135deg, #06090f 0%, #0a0d18 60%, #060a12 100%)" }}>

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }} />
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(0,180,255,0.06) 0%, transparent 60%)" }} />
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(140,60,255,0.06) 0%, transparent 60%)" }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(0,210,255,0.12)", background: "rgba(6,9,15,0.85)", backdropFilter: "blur(8px)" }}>
        <button onClick={() => setLocation("/lobby")}
          className="flex items-center gap-2 active:scale-95 transition-transform"
          style={{ color: "rgba(0,210,255,0.8)" }}>
          <ChevronLeft className="w-5 h-5" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase">Back</span>
        </button>
        <span className="font-mono font-black text-[13px] tracking-[0.35em] uppercase"
          style={{ color: "#00d2ff", textShadow: "0 0 12px rgba(0,210,255,0.7)" }}>
          SELECT OPERATIVE
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>OPERATIVE:</span>
          <span className="font-mono font-bold text-[10px]" style={{ color: "#00d2ff" }}>
            {player?.character ?? "—"}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="absolute inset-0 flex pt-[52px] pb-4 px-3 gap-3">

        {/* ── LEFT: Character preview ── */}
        <div className="flex flex-col flex-1 min-w-0 gap-3">

          {/* Character image panel */}
          <div className="relative flex-1 flex items-center justify-center rounded-xl overflow-hidden"
            style={{ border: `1.5px solid ${cfg.border}`, boxShadow: `0 0 30px ${cfg.glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              background: "rgba(8,12,24,0.9)" }}>

            {/* Rarity badge */}
            <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${cfg.border}` }}>
              <span className="font-mono font-black text-[9px] tracking-[0.25em]" style={{ color: cfg.text }}>
                {cfg.label}
              </span>
            </div>

            {/* Lock overlay for locked characters */}
            {activeChar && !activeChar.unlocked && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
                style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
                <Lock className="w-10 h-10" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: "rgba(255,255,255,0.4)" }}>LOCKED</span>
              </div>
            )}

            {/* Glow platform */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-16"
              style={{ background: `radial-gradient(ellipse at 50% 100%, ${cfg.glow} 0%, transparent 70%)`, filter: "blur(8px)" }} />

            {/* Character image */}
            {activeChar?.image ? (
              <img src={activeChar.image} alt={activeChar.name}
                className="relative z-10 object-contain"
                style={{ maxHeight: "75%", filter: activeChar.unlocked
                  ? `drop-shadow(0 0 20px ${cfg.glow})`
                  : "grayscale(1) brightness(0.4)" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-24 h-24 rounded-full" style={{ background: cfg.glow }} />
            )}

            {/* Scan line */}
            <div className="absolute inset-x-0 z-10 pointer-events-none overflow-hidden" style={{ top: 0, bottom: 0 }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: "1px",
                background: `linear-gradient(90deg, transparent, ${cfg.glow}, transparent)`,
                animation: "scan-line 4s linear infinite" }} />
            </div>
          </div>

          {/* Character name + role */}
          <div className="shrink-0 px-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-mono font-black text-[18px] tracking-[0.1em] uppercase"
                style={{ color: "#ffffff", textShadow: `0 0 15px ${cfg.glow}` }}>
                {activeChar?.name ?? "—"}
              </h2>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${cfg.border}` }}>
                {stats.role === "STEALTH" ? <Crosshair className="w-3 h-3" style={{ color: cfg.text }} /> :
                 stats.role === "RECON"   ? <Zap className="w-3 h-3" style={{ color: cfg.text }} /> :
                 stats.role === "TANK"    ? <Shield className="w-3 h-3" style={{ color: cfg.text }} /> :
                 <Star className="w-3 h-3" style={{ color: cfg.text }} />}
                <span className="font-mono font-black text-[9px] tracking-[0.15em]" style={{ color: cfg.text }}>
                  {stats.role}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-1.5">
              {[
                { label: "SPD", value: stats.speed,   color: "#00d2ff" },
                { label: "PWR", value: stats.power,   color: "#a050ff" },
                { label: "DEF", value: stats.defense, color: "#ff8c00" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="font-mono text-[9px] w-6 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                  <StatBar value={value} color={color} />
                  <span className="font-mono text-[9px] w-5 text-right shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Equip button */}
          <button
            disabled={!activeChar?.unlocked || equipMutation.isPending || (activeChar?.selected ?? false)}
            onClick={() => activeChar?.id && equipMutation.mutate(activeChar.id)}
            className="shrink-0 w-full py-3 font-mono font-black text-[11px] tracking-[0.25em] uppercase rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={activeChar?.selected
              ? { background: "rgba(0,210,255,0.12)", border: "1.5px solid rgba(0,210,255,0.4)", color: "#00d2ff",
                  boxShadow: "0 0 12px rgba(0,210,255,0.2)" }
              : { background: "linear-gradient(135deg, rgba(249,115,22,0.9), rgba(234,179,8,0.9))",
                  border: "1.5px solid rgba(249,115,22,0.6)", color: "#fff",
                  boxShadow: "0 0 20px rgba(249,115,22,0.4)" }}>
            {equipMutation.isPending ? "EQUIPPING..." : activeChar?.selected ? "✓ EQUIPPED" : "EQUIP OPERATIVE"}
          </button>
        </div>

        {/* ── RIGHT: Roster ── */}
        <div className="flex flex-col w-[130px] shrink-0 gap-2 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}>
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase shrink-0 mb-1"
            style={{ color: "rgba(255,255,255,0.3)" }}>ROSTER</span>

          {characters?.map((char) => {
            const r = (char.rarity ?? "common") as keyof typeof RARITY_CONFIG;
            const c = RARITY_CONFIG[r] ?? RARITY_CONFIG.common;
            const isActive = char.id === (activeChar?.id);
            return (
              <button key={char.id}
                onClick={() => setActiveId(char.id)}
                className="relative shrink-0 rounded-lg overflow-hidden transition-all active:scale-95"
                style={{
                  border: isActive ? `1.5px solid ${c.border}` : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow: isActive ? `0 0 14px ${c.glow}` : "none",
                  background: isActive ? `rgba(0,0,0,0.7)` : "rgba(0,0,0,0.4)",
                }}>
                {/* Thumbnail */}
                <div className="w-full aspect-square flex items-center justify-center overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.5)" }}>
                  {char.image ? (
                    <img src={char.image} alt={char.name}
                      className="w-full h-full object-cover"
                      style={{ filter: char.unlocked ? "none" : "grayscale(1) brightness(0.3)" }}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.style.background = c.glow;
                      }} />
                  ) : (
                    <div className="w-full h-full" style={{ background: char.unlocked ? c.glow : "rgba(40,40,40,0.5)" }} />
                  )}
                  {!char.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Lock className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                  )}
                  {char.selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,210,255,0.9)" }}>
                      <span style={{ fontSize: "8px", color: "#000", fontWeight: 900 }}>✓</span>
                    </div>
                  )}
                </div>

                {/* Name + rarity */}
                <div className="px-1.5 py-1.5">
                  <p className="font-mono font-bold text-[8px] leading-tight uppercase truncate"
                    style={{ color: char.unlocked ? "#fff" : "rgba(255,255,255,0.3)" }}>
                    {char.name}
                  </p>
                  <p className="font-mono text-[7px] tracking-[0.1em] uppercase"
                    style={{ color: char.unlocked ? c.text : "rgba(255,255,255,0.2)" }}>
                    {c.label}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Locked placeholder slots */}
          {[...Array(Math.max(0, 4 - (characters?.length ?? 0)))].map((_, i) => (
            <div key={`empty-${i}`} className="shrink-0 rounded-lg overflow-hidden"
              style={{ border: "1.5px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
              <div className="w-full aspect-square flex items-center justify-center"
                style={{ background: "rgba(20,20,20,0.5)" }}>
                <span className="font-mono text-[18px]" style={{ color: "rgba(255,255,255,0.1)" }}>?</span>
              </div>
              <div className="px-1.5 py-1.5">
                <div className="h-2 w-full rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
