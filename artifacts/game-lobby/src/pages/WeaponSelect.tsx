import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Lock, X } from "lucide-react";
import WeaponCanvas from "@/components/WeaponCanvas";

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
  common:    { border: "rgba(255,140,40,0.4)",  glow: "rgba(255,140,40,0.2)",  text: "#ff9428", label: "COMMON" },
  rare:      { border: "rgba(255,180,0,0.65)",  glow: "rgba(255,180,0,0.32)",  text: "#ffb400", label: "RARE" },
  epic:      { border: "rgba(255,100,30,0.8)",  glow: "rgba(255,100,30,0.38)", text: "#ff6420", label: "EPIC" },
  legendary: { border: "rgba(255,40,40,0.85)",  glow: "rgba(255,40,40,0.42)",  text: "#ff2828", label: "LEGENDARY" },
} as const;

const WEAPON_3D_MAP: Record<string, string> = {};

const VISIBLE_COLS = 4;
const TOTAL_COLS   = 6;
const TOTAL_SLOTS  = TOTAL_COLS * 2;

function CyberpunkCorners({ color }: { color: string }) {
  return (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: color }} />
    </>
  );
}

function PlatformRing() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ bottom: "6%" }}>
      <svg viewBox="0 0 240 70" className="w-full" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="wpgFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,120,30,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="50" rx="105" ry="18" fill="url(#wpgFill)" opacity="0.7" />
        <ellipse cx="120" cy="50" rx="105" ry="18"
          fill="none" stroke="rgba(255,140,40,0.6)" strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 5px rgba(255,140,40,0.9))" }} />
        <ellipse cx="120" cy="50" rx="72" ry="12"
          fill="none" stroke="rgba(255,100,20,0.3)" strokeWidth="0.75" strokeDasharray="10 5" />
        <ellipse cx="120" cy="50" rx="42" ry="7"
          fill="none" stroke="rgba(255,80,0,0.2)" strokeWidth="0.5" />
      </svg>
    </div>
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

  const equippedWeapon = weapons?.find(w => w.selected) ?? weapons?.[0];
  const [previewId, setPreviewId] = useState<number | null>(null);

  const previewWeapon = previewId
    ? weapons?.find(w => w.id === previewId)
    : equippedWeapon;

  const weaponId3D = WEAPON_3D_MAP[previewWeapon?.name ?? ""] ?? "";

  const equipMutation = useMutation({
    mutationFn: async (weaponId: number) => {
      const res = await fetch(`/api/players/me/weapons/${weaponId}/equip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to equip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/weapons"] });
      setTimeout(() => setLocation("/lobby", { replace: true }), 600);
    },
  });

  const allWeapons: Weapon[] = weapons ?? [];
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => allWeapons[i] ?? null);

  const previewRarity = (previewWeapon?.rarity ?? "common") as keyof typeof RARITY_CONFIG;
  const previewCfg = RARITY_CONFIG[previewRarity] ?? RARITY_CONFIG.common;
  const previewType = (previewWeapon?.type ?? "RIFLE").toUpperCase();

  /* ── Swipe / drag scroll state ── */
  const containerRef  = useRef<HTMLDivElement>(null);
  const touchStartX   = useRef(0);
  const touchStartScroll = useRef(0);
  const isDragging    = useRef(false);
  const [scrollX, setScrollX]     = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const getCardWidth  = () => (containerRef.current?.clientWidth ?? 300) / VISIBLE_COLS;
  const getMaxScroll  = () => getCardWidth() * (TOTAL_COLS - VISIBLE_COLS);

  const clampedSet = (raw: number) => {
    const max = getMaxScroll();
    return Math.max(0, Math.min(max, raw));
  };

  const snap = (current: number) => {
    const cardW = getCardWidth();
    const page  = Math.round(current / cardW);
    const max   = TOTAL_COLS - VISIBLE_COLS;
    setScrollX(Math.max(0, Math.min(max, page)) * cardW);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current     = e.touches[0].clientX;
    touchStartScroll.current = scrollX;
    setIsSwiping(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.touches[0].clientX;
    setScrollX(clampedSet(touchStartScroll.current + delta));
  };
  const onTouchEnd = () => {
    setIsSwiping(false);
    snap(scrollX);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current       = true;
    touchStartX.current      = e.clientX;
    touchStartScroll.current = scrollX;
    setIsSwiping(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const delta = touchStartX.current - e.clientX;
    setScrollX(clampedSet(touchStartScroll.current + delta));
  };
  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsSwiping(false);
    snap(scrollX);
  };

  const activeDot = Math.round(scrollX / (getCardWidth() || 1));

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0f0600" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "rgba(255,120,50,0.8)", borderTopColor: "transparent" }} />
          <span className="font-mono text-[11px] tracking-[0.3em] animate-pulse"
            style={{ color: "rgba(255,120,50,0.8)" }}>LOADING ARSENAL...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(155deg, #120800 0%, #0d0500 60%, #110700 100%)" }}>

      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,140,40,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,140,40,1) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }} />

      {/* Diagonal hazard lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,100,30,1) 0px, rgba(255,100,30,1) 1px, transparent 1px, transparent 48px)",
        }} />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(255,80,10,0.12) 0%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(200,60,0,0.08) 0%, transparent 55%)" }} />

      {/* ── X BUTTON ── */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setLocation("/lobby", { replace: true })}
          className="flex items-center justify-center w-8 h-8 rounded active:scale-90 transition-transform"
          style={{ border: "1.5px solid rgba(255,140,40,0.5)", background: "rgba(0,0,0,0.5)" }}>
          <X className="w-5 h-5" style={{ color: "#ff9428" }} />
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="absolute inset-0" style={{ top: 0 }}>

        {/* ─── LEFT: swipeable card strip ─── */}
        <div
          ref={containerRef}
          className="absolute top-0 bottom-0 left-0"
          style={{
            right: "40%",
            padding: "10px 0 6px 10px",
            overflow: "visible",
            cursor: isDragging.current ? "grabbing" : "grab",
            zIndex: 1,
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* 6-column × 2-row card grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${TOTAL_COLS}, 1fr)`,
              gridTemplateRows: "1fr 1fr",
              width: `${(TOTAL_COLS / VISIBLE_COLS) * 100}%`,
              height: "calc(100% - 28px)",
              gap: "6px",
              transform: `translateX(-${scrollX}px)`,
              transition: isSwiping ? "none" : "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
              willChange: "transform",
            }}>
            {slots.map((weapon, i) => {
              if (!weapon) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="relative rounded overflow-hidden flex items-center justify-center"
                    style={{
                      border: "1.5px solid rgba(255,140,40,0.1)",
                      background: "rgba(20,8,0,0.55)",
                    }}>
                    <CyberpunkCorners color="rgba(255,140,40,0.22)" />
                    <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.07)" }} />
                  </div>
                );
              }

              const r = (weapon.rarity ?? "common") as keyof typeof RARITY_CONFIG;
              const cfg = RARITY_CONFIG[r] ?? RARITY_CONFIG.common;
              const isActive   = weapon.id === previewWeapon?.id;
              const isEquipped = weapon.selected;
              const wType      = (weapon.type ?? "rifle").toUpperCase();

              return (
                <button
                  key={weapon.id}
                  onClick={() => setPreviewId(weapon.id)}
                  className="relative rounded overflow-hidden flex flex-col transition-all active:scale-95"
                  style={{
                    border: isActive
                      ? `2px solid ${cfg.border}`
                      : "1.5px solid rgba(255,140,40,0.15)",
                    background: isActive ? "rgba(40,15,0,0.9)" : "rgba(20,8,0,0.65)",
                    boxShadow: isActive ? `0 0 18px ${cfg.glow}` : "none",
                    transition: "all 0.15s ease",
                  }}>

                  <CyberpunkCorners color={isActive ? cfg.border : "rgba(255,140,40,0.25)"} />

                  <div
                    className="flex-1 relative overflow-hidden flex items-center justify-center"
                    style={{
                      background: isActive
                        ? `radial-gradient(ellipse at 50% 60%, ${cfg.glow} 0%, rgba(0,0,0,0.5) 70%)`
                        : "rgba(0,0,0,0.4)",
                      minHeight: 0,
                    }}>

                    {weapon.image ? (
                      <img
                        src={weapon.image}
                        alt={weapon.name}
                        className="w-full h-full object-cover absolute inset-0"
                        style={{
                          filter: weapon.unlocked
                            ? isActive ? `drop-shadow(0 0 8px ${cfg.glow}) brightness(1.1)` : "none"
                            : "grayscale(1) brightness(0.22)",
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <svg viewBox="0 0 48 24" className="w-4/5" fill="none">
                          <rect x="2" y="9" width="26" height="6" rx="2"
                            stroke={isActive ? cfg.text : "rgba(255,140,40,0.3)"}
                            strokeWidth="1.5"
                            fill={isActive ? cfg.glow : "rgba(255,100,20,0.08)"} />
                          <rect x="28" y="10" width="16" height="2.5" rx="1"
                            stroke={isActive ? cfg.text : "rgba(255,140,40,0.3)"}
                            strokeWidth="1.2"
                            fill={isActive ? cfg.glow : "rgba(255,100,20,0.08)"} />
                          <rect x="10" y="15" width="8" height="6" rx="1"
                            stroke={isActive ? cfg.text : "rgba(255,140,40,0.3)"}
                            strokeWidth="1.2"
                            fill={isActive ? cfg.glow : "rgba(255,100,20,0.08)"} />
                        </svg>
                      </div>
                    )}

                    {!weapon.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.75)" }}>
                        <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                      </div>
                    )}

                    {isEquipped && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center z-10"
                        style={{ background: "#ff6420", boxShadow: "0 0 5px rgba(255,100,30,0.9)" }}>
                        <span style={{ fontSize: "6px", color: "#fff", fontWeight: 900, lineHeight: 1 }}>✓</span>
                      </div>
                    )}

                    <div className="absolute bottom-1 left-1 px-1 rounded z-10"
                      style={{ background: "rgba(0,0,0,0.72)" }}>
                      <span className="font-mono font-black" style={{ fontSize: "6px", color: cfg.text }}>
                        {wType}
                      </span>
                    </div>

                    {isActive && (
                      <div className="absolute inset-x-0 bottom-0 h-[2px]"
                        style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Scroll dots indicator ── */}
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center items-center gap-1.5"
            style={{ paddingRight: "8px" }}>
            {Array.from({ length: TOTAL_COLS - VISIBLE_COLS + 1 }).map((_, dot) => (
              <div
                key={dot}
                style={{
                  width: dot === activeDot ? "14px" : "5px",
                  height: "4px",
                  borderRadius: "2px",
                  background: dot === activeDot
                    ? "rgba(255,140,40,0.95)"
                    : "rgba(255,140,40,0.28)",
                  transition: "all 0.25s ease",
                }} />
            ))}
          </div>

          {/* ── Right-edge fade hint (when more cards are hidden) ── */}
          {activeDot < TOTAL_COLS - VISIBLE_COLS && (
            <div className="absolute top-0 bottom-6 pointer-events-none"
              style={{
                right: 0,
                width: "32px",
                background: "linear-gradient(90deg, transparent, rgba(13,5,0,0.88))",
              }} />
          )}
        </div>

        {/* ─── RIGHT: 3D viewer — z-index 10, opaque bg hides the overflow cards ─── */}
        <div
          className="absolute right-0 top-0 bottom-0 flex flex-col"
          style={{
            width: "40%",
            borderLeft: "1px solid rgba(255,140,40,0.14)",
            background: "linear-gradient(155deg, #120800 0%, #0d0500 60%, #110700 100%)",
            zIndex: 10,
          }}>

          {/* 3D canvas */}
          <div className="flex-1 relative overflow-hidden">
            {weaponId3D ? (
              <WeaponCanvas key={weaponId3D} weaponId={weaponId3D} />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(255,100,20,0.06) 0%, transparent 70%)" }}>
                {previewWeapon && (
                  <svg viewBox="0 0 120 60" className="w-4/5 opacity-25" fill="none">
                    <rect x="4" y="22" width="58" height="16" rx="4"
                      stroke={previewCfg.text} strokeWidth="2"
                      fill={previewCfg.glow} />
                    <rect x="62" y="26" width="40" height="6" rx="2"
                      stroke={previewCfg.text} strokeWidth="1.5"
                      fill={previewCfg.glow} />
                    <rect x="20" y="38" width="18" height="14" rx="2"
                      stroke={previewCfg.text} strokeWidth="1.5"
                      fill={previewCfg.glow} />
                    <circle cx="14" cy="30" r="5"
                      stroke={previewCfg.text} strokeWidth="1.2"
                      fill="none" opacity="0.6" />
                    <line x1="14" y1="25" x2="14" y2="35" stroke={previewCfg.text} strokeWidth="0.8" opacity="0.6" />
                    <line x1="9" y1="30" x2="19" y2="30" stroke={previewCfg.text} strokeWidth="0.8" opacity="0.6" />
                  </svg>
                )}
              </div>
            )}
            <PlatformRing />
          </div>

          {/* Weapon name + type + equip button */}
          <div className="shrink-0 flex flex-col items-center pb-2" style={{ gap: "4px" }}>
            <button
              disabled={!previewWeapon || equipMutation.isPending}
              onClick={() => previewWeapon?.id && equipMutation.mutate(previewWeapon.id)}
              className="font-mono font-black tracking-[0.22em] uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontSize: "11px",
                width: "90px",
                height: "28px",
                borderRadius: "4px",
                border: previewWeapon?.selected
                  ? "1.5px solid rgba(255,140,40,0.5)"
                  : "1.5px solid rgba(255,140,40,0.75)",
                background: previewWeapon?.selected
                  ? "rgba(255,140,40,0.08)"
                  : "rgba(255,140,40,0.14)",
                color: "#ffffff",
                boxShadow: "0 0 14px rgba(255,140,40,0.18), inset 0 0 12px rgba(255,140,40,0.05)",
              }}>
              {equipMutation.isPending ? "..." : previewWeapon?.selected ? "EQUIPPED" : "CONFIRM"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
