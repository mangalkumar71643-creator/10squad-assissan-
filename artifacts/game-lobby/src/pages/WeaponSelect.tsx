import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Lock, Crosshair, Zap, Flame, Target } from "lucide-react";

type Weapon = {
  id: number;
  playerId: number | null;
  name: string;
  image: string;
  type: string | null;
  rarity: string | null;
  unlocked: boolean | null;
  selected: boolean | null;
};

const RARITY_CONFIG = {
  common:    { border: "rgba(150,150,150,0.6)", glow: "rgba(150,150,150,0.3)", text: "#aaaaaa", label: "COMMON" },
  rare:      { border: "rgba(255,180,0,0.7)",   glow: "rgba(255,180,0,0.4)",   text: "#ffb400", label: "RARE" },
  epic:      { border: "rgba(255,100,30,0.8)",  glow: "rgba(255,100,30,0.45)", text: "#ff6420", label: "EPIC" },
  legendary: { border: "rgba(255,40,40,0.9)",   glow: "rgba(255,40,40,0.5)",   text: "#ff2828", label: "LEGENDARY" },
} as const;

const WEAPON_STATS: Record<string, { damage: number; range: number; speed: number; icon: string }> = {
  "CYBER RIFLE":     { damage: 82, range: 88, speed: 72, icon: "rifle" },
  "PLASMA SHOTGUN":  { damage: 95, range: 45, speed: 65, icon: "shotgun" },
  "GHOST SNIPER":    { damage: 99, range: 99, speed: 38, icon: "sniper" },
  "NANO PISTOL":     { damage: 60, range: 55, speed: 99, icon: "pistol" },
};

const TYPE_COLORS: Record<string, string> = {
  RIFLE:   "rgba(255,100,30,0.9)",
  SHOTGUN: "rgba(255,60,60,0.9)",
  SNIPER:  "rgba(255,40,40,0.9)",
  PISTOL:  "rgba(255,140,60,0.9)",
};

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: "2px",
        boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
}

function WeaponIcon({ type }: { type: string }) {
  const color = "rgba(255,120,50,0.9)";
  if (type === "SNIPER") return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="14" width="28" height="4" rx="1" stroke={color} strokeWidth="1.8" fill="rgba(255,80,20,0.15)"/>
      <rect x="22" y="9" width="4" height="14" rx="1" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.1)"/>
      <circle cx="16" cy="16" r="3" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.2)"/>
    </svg>
  );
  if (type === "SHOTGUN") return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="12" width="20" height="8" rx="2" stroke={color} strokeWidth="1.8" fill="rgba(255,80,20,0.15)"/>
      <rect x="22" y="14" width="8" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.1)"/>
      <rect x="8" y="20" width="6" height="5" rx="1" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.1)"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="12" width="16" height="8" rx="2" stroke={color} strokeWidth="1.8" fill="rgba(255,80,20,0.15)"/>
      <rect x="18" y="13" width="10" height="3" rx="1" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.1)"/>
      <rect x="8" y="20" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" fill="rgba(255,80,20,0.1)"/>
      <circle cx="6" cy="16" r="2" fill="rgba(255,120,50,0.5)"/>
    </svg>
  );
}

export default function WeaponSelect() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: weapons, isLoading } = useQuery<Weapon[]>({
    queryKey: ["/api/players/me/weapons"],
    queryFn: async () => {
      const res = await fetch("/api/players/me/weapons");
      if (!res.ok) throw new Error("Failed to fetch weapons");
      return res.json();
    },
  });

  const selected = weapons?.find(w => w.selected) ?? weapons?.[0];
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeWeapon = weapons?.find(w => w.id === activeId) ?? selected;

  const equipMutation = useMutation({
    mutationFn: async (weaponId: number) => {
      const res = await fetch(`/api/players/me/weapons/${weaponId}/equip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to equip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/weapons"] });
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[11px] tracking-[0.3em] animate-pulse"
            style={{ color: "rgba(255,120,50,0.8)" }}>LOADING ARSENAL...</span>
        </div>
      </div>
    );
  }

  const rarity = ((activeWeapon?.rarity ?? "common") as keyof typeof RARITY_CONFIG);
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const stats = WEAPON_STATS[activeWeapon?.name ?? ""] ?? { damage: 70, range: 70, speed: 70, icon: "rifle" };
  const wType = (activeWeapon?.type ?? "RIFLE").toUpperCase();
  const typeColor = TYPE_COLORS[wType] ?? TYPE_COLORS.RIFLE;

  return (
    <div className="relative h-screen w-screen text-white font-sans overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f0600 0%, #180a00 60%, #0c0400 100%)" }}>

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }} />
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(255,100,30,0.07) 0%, transparent 60%)" }} />
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(255,40,0,0.06) 0%, transparent 60%)" }} />

      {/* Diagonal grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,100,30,1) 0px, rgba(255,100,30,1) 1px, transparent 1px, transparent 40px)" }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,100,30,0.15)", background: "rgba(15,6,0,0.85)", backdropFilter: "blur(8px)" }}>
        <button onClick={() => setLocation("/lobby")}
          className="flex items-center gap-2 active:scale-95 transition-transform"
          style={{ color: "rgba(255,120,50,0.8)" }}>
          <ChevronLeft className="w-5 h-5" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase">Back</span>
        </button>
        <span className="font-mono font-black text-[13px] tracking-[0.35em] uppercase"
          style={{ color: "#ff6420", textShadow: "0 0 12px rgba(255,100,30,0.7)" }}>
          SELECT WEAPON
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>EQUIPPED:</span>
          <span className="font-mono font-bold text-[10px]" style={{ color: "#ff6420" }}>
            {weapons?.find(w => w.selected)?.name ?? "—"}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="absolute inset-0 flex pt-[52px] pb-4 px-3 gap-3">

        {/* ── LEFT: Weapon preview (full height panel) ── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Weapon image panel — full height, name+stats+equip inside */}
          <div className="relative flex-1 flex flex-col rounded-xl overflow-hidden"
            style={{ border: `1.5px solid ${cfg.border}`, boxShadow: `0 0 30px ${cfg.glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              background: "rgba(18,8,0,0.9)" }}>

            {/* Type badge — top-right only */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${cfg.border}` }}>
              <WeaponIcon type={wType} />
              <span className="font-mono font-black text-[9px] tracking-[0.15em]" style={{ color: cfg.text }}>
                {wType}
              </span>
            </div>

            {/* Lock overlay */}
            {activeWeapon && !activeWeapon.unlocked && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
                style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
                <Lock className="w-10 h-10" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: "rgba(255,255,255,0.4)" }}>LOCKED</span>
              </div>
            )}

            {/* Weapon image — upper portion */}
            <div className="relative flex-1 flex items-center justify-center">
              {/* Crosshair decoration */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <Crosshair className="w-48 h-48" style={{ color: cfg.text }} />
              </div>

              {activeWeapon?.image ? (
                <img src={activeWeapon.image} alt={activeWeapon.name}
                  className="relative z-10 object-contain"
                  style={{ maxHeight: "70%", maxWidth: "80%",
                    filter: activeWeapon.unlocked
                      ? `drop-shadow(0 0 20px ${cfg.glow}) drop-shadow(0 0 40px ${cfg.glow})`
                      : "grayscale(1) brightness(0.3)" }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    const parent = el.parentElement;
                    if (parent) {
                      const placeholder = document.createElement("div");
                      placeholder.style.cssText = `width:120px;height:50px;background:${cfg.glow};border-radius:4px;filter:blur(2px)`;
                      parent.appendChild(placeholder);
                    }
                  }} />
              ) : (
                <div className="w-32 h-12 rounded" style={{ background: cfg.glow }} />
              )}

              {/* Scan line */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div style={{ position: "absolute", left: 0, right: 0, height: "1px",
                  background: `linear-gradient(90deg, transparent, ${cfg.glow}, transparent)`,
                  animation: "scan-line 3s linear infinite" }} />
              </div>
            </div>

            {/* Glow platform divider */}
            <div className="shrink-0 h-px mx-4"
              style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }} />

            {/* Bottom section: name + stats + equip — inside panel */}
            <div className="shrink-0 px-4 pt-3 pb-4 flex flex-col gap-2"
              style={{ background: "rgba(0,0,0,0.4)" }}>

              {/* Name + type row */}
              <div className="flex items-center justify-between">
                <h2 className="font-mono font-black text-[17px] tracking-[0.06em] uppercase"
                  style={{ color: "#ffffff", textShadow: `0 0 15px ${cfg.glow}` }}>
                  {activeWeapon?.name ?? "—"}
                </h2>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${cfg.border}` }}>
                  {wType === "SNIPER" ? <Target className="w-3 h-3" style={{ color: cfg.text }} /> :
                   wType === "SHOTGUN" ? <Flame className="w-3 h-3" style={{ color: cfg.text }} /> :
                   <Zap className="w-3 h-3" style={{ color: cfg.text }} />}
                  <span className="font-mono font-black text-[9px] tracking-[0.15em]" style={{ color: cfg.text }}>
                    {wType}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "DMG", value: stats.damage, color: typeColor },
                  { label: "RNG", value: stats.range,  color: "#ffb400" },
                  { label: "SPD", value: stats.speed,  color: "#00d2ff" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] w-6 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                    <StatBar value={value} color={color} />
                    <span className="font-mono text-[9px] w-5 text-right shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Equip button — inside panel */}
              <button
                disabled={!activeWeapon?.unlocked || equipMutation.isPending || (activeWeapon?.selected ?? false)}
                onClick={() => activeWeapon?.id && equipMutation.mutate(activeWeapon.id)}
                className="w-full py-2.5 font-mono font-black text-[11px] tracking-[0.25em] uppercase rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={activeWeapon?.selected
                  ? { background: "rgba(255,100,30,0.12)", border: "1.5px solid rgba(255,100,30,0.4)", color: "#ff6420",
                      boxShadow: "0 0 12px rgba(255,100,30,0.2)" }
                  : { background: "linear-gradient(135deg, rgba(255,80,0,0.9), rgba(255,150,20,0.9))",
                      border: "1.5px solid rgba(255,100,30,0.6)", color: "#fff",
                      boxShadow: "0 0 20px rgba(255,100,30,0.4)" }}>
                {equipMutation.isPending ? "EQUIPPING..." : activeWeapon?.selected ? "✓ EQUIPPED" : "EQUIP WEAPON"}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Roster ── */}
        <div className="flex flex-col w-[130px] shrink-0 gap-2 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}>
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase shrink-0 mb-1"
            style={{ color: "rgba(255,255,255,0.3)" }}>ARSENAL</span>

          {weapons?.map((weapon) => {
            const r = ((weapon.rarity ?? "common") as keyof typeof RARITY_CONFIG);
            const c = RARITY_CONFIG[r] ?? RARITY_CONFIG.common;
            const isActive = weapon.id === (activeWeapon?.id);
            const wt = (weapon.type ?? "RIFLE").toUpperCase();
            return (
              <button key={weapon.id}
                onClick={() => setActiveId(weapon.id)}
                className="relative shrink-0 rounded-lg overflow-hidden transition-all active:scale-95"
                style={{
                  border: isActive ? `1.5px solid ${c.border}` : "1.5px solid rgba(255,255,255,0.07)",
                  boxShadow: isActive ? `0 0 14px ${c.glow}` : "none",
                  background: isActive ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)",
                }}>
                {/* Thumbnail */}
                <div className="w-full aspect-square flex items-center justify-center overflow-hidden relative"
                  style={{ background: "rgba(18,8,0,0.7)" }}>
                  {weapon.image ? (
                    <img src={weapon.image} alt={weapon.name}
                      className="w-full h-full object-cover"
                      style={{ filter: weapon.unlocked ? "none" : "grayscale(1) brightness(0.3)" }}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        const parent = el.parentElement;
                        if (parent) parent.style.background = weapon.unlocked ? c.glow : "rgba(40,20,10,0.5)";
                      }} />
                  ) : (
                    <div className="w-full h-full" style={{ background: weapon.unlocked ? c.glow : "rgba(40,20,10,0.5)" }} />
                  )}
                  {!weapon.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Lock className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                  )}
                  {weapon.selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,100,30,0.9)" }}>
                      <span style={{ fontSize: "8px", color: "#fff", fontWeight: 900 }}>✓</span>
                    </div>
                  )}
                  {/* Type label in corner */}
                  <div className="absolute bottom-1 left-1 px-1 rounded"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <span className="font-mono text-[6px] font-black" style={{ color: c.text }}>{wt}</span>
                  </div>
                </div>

                {/* Name + rarity */}
                <div className="px-1.5 py-1.5">
                  <p className="font-mono font-bold text-[8px] leading-tight uppercase truncate"
                    style={{ color: weapon.unlocked ? "#fff" : "rgba(255,255,255,0.3)" }}>
                    {weapon.name}
                  </p>
                  <p className="font-mono text-[7px] tracking-[0.1em] uppercase"
                    style={{ color: weapon.unlocked ? c.text : "rgba(255,255,255,0.2)" }}>
                    {c.label}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Empty slots */}
          {[...Array(Math.max(0, 4 - (weapons?.length ?? 0)))].map((_, i) => (
            <div key={`empty-${i}`} className="shrink-0 rounded-lg overflow-hidden"
              style={{ border: "1.5px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.2)" }}>
              <div className="w-full aspect-square flex items-center justify-center"
                style={{ background: "rgba(20,10,0,0.5)" }}>
                <span className="font-mono text-[18px]" style={{ color: "rgba(255,255,255,0.08)" }}>?</span>
              </div>
              <div className="px-1.5 py-1.5">
                <div className="h-2 w-full rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
