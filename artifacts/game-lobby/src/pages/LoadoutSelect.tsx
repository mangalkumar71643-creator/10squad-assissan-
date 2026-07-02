import { useState, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Lock, X, Check } from "lucide-react";

type LoadoutSlot = {
  label: string;
  icon: ReactNode;
};

type Loadout = {
  id: number;
  name: string;
  role: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  selected: boolean;
  slots: LoadoutSlot[];
  description: string;
};

const RARITY_CONFIG = {
  common:    { border: "rgba(255,200,40,0.4)",  glow: "rgba(255,200,40,0.18)", text: "#ffc828", label: "COMMON" },
  rare:      { border: "rgba(255,220,0,0.65)",  glow: "rgba(255,220,0,0.30)",  text: "#ffd700", label: "RARE" },
  epic:      { border: "rgba(255,170,0,0.8)",   glow: "rgba(255,170,0,0.36)",  text: "#ffaa00", label: "EPIC" },
  legendary: { border: "rgba(255,140,0,0.85)",  glow: "rgba(255,140,0,0.42)",  text: "#ff8c00", label: "LEGENDARY" },
} as const;

const STATIC_LOADOUTS: Loadout[] = [
  {
    id: 1, name: "ASSAULT", role: "FRONTLINE", rarity: "epic", unlocked: true, selected: true,
    description: "High damage close-range setup for aggressive pushes.",
    slots: [
      { label: "Primary", icon: <GunIcon /> },
      { label: "Secondary", icon: <PistolIcon /> },
      { label: "Grenade", icon: <GrenadeIcon /> },
      { label: "Vest", icon: <VestIcon /> },
    ],
  },
  {
    id: 2, name: "SNIPER", role: "MARKSMAN", rarity: "legendary", unlocked: true, selected: false,
    description: "Long-range precision loadout. Destroy enemies before they reach you.",
    slots: [
      { label: "Rifle", icon: <SniperIcon /> },
      { label: "Secondary", icon: <PistolIcon /> },
      { label: "Smoke", icon: <GrenadeIcon /> },
      { label: "Ghillie", icon: <VestIcon /> },
    ],
  },
  {
    id: 3, name: "SUPPORT", role: "MEDIC", rarity: "rare", unlocked: true, selected: false,
    description: "Team sustain loadout. Keep your squad alive under fire.",
    slots: [
      { label: "SMG", icon: <GunIcon /> },
      { label: "Medkit", icon: <MedkitIcon /> },
      { label: "Flashbang", icon: <GrenadeIcon /> },
      { label: "Light Vest", icon: <VestIcon /> },
    ],
  },
  {
    id: 4, name: "RECON", role: "SCOUT", rarity: "rare", unlocked: true, selected: false,
    description: "Speed and intel. Get in, get the info, get out.",
    slots: [
      { label: "Shotgun", icon: <GunIcon /> },
      { label: "Secondary", icon: <PistolIcon /> },
      { label: "Sensor", icon: <GrenadeIcon /> },
      { label: "Stealth", icon: <VestIcon /> },
    ],
  },
  {
    id: 5, name: "HEAVY", role: "TANK", rarity: "epic", unlocked: false, selected: false,
    description: "Maximum armor and firepower. Absorb damage, control zones.",
    slots: [
      { label: "LMG", icon: <GunIcon /> },
      { label: "Launcher", icon: <SniperIcon /> },
      { label: "Grenade", icon: <GrenadeIcon /> },
      { label: "Heavy Vest", icon: <VestIcon /> },
    ],
  },
  {
    id: 6, name: "GHOST", role: "ASSASSIN", rarity: "legendary", unlocked: false, selected: false,
    description: "Silent. Swift. Lethal. Strike before they know you are there.",
    slots: [
      { label: "Knife", icon: <GunIcon /> },
      { label: "Silenced", icon: <PistolIcon /> },
      { label: "Smoke", icon: <GrenadeIcon /> },
      { label: "Cloak", icon: <VestIcon /> },
    ],
  },
  { id: 7,  name: "BERSERKER", role: "MELEE",    rarity: "legendary", unlocked: false, selected: false, description: "Raw aggression. No cover needed.", slots: [{ label: "Axe", icon: <GunIcon /> }, { label: "SMG", icon: <PistolIcon /> }, { label: "Stimpack", icon: <MedkitIcon /> }, { label: "Armor", icon: <VestIcon /> }] },
  { id: 8,  name: "ENGINEER", role: "BUILDER",   rarity: "common",    unlocked: false, selected: false, description: "Build, fortify, destroy.", slots: [{ label: "Carbine", icon: <GunIcon /> }, { label: "Drone", icon: <GrenadeIcon /> }, { label: "Toolkit", icon: <MedkitIcon /> }, { label: "Plate", icon: <VestIcon /> }] },
  { id: 9,  name: "DEMO",     role: "EXPLOSIVE", rarity: "epic",      unlocked: false, selected: false, description: "Blow everything up. Simple.", slots: [{ label: "Shotgun", icon: <GunIcon /> }, { label: "RPG", icon: <SniperIcon /> }, { label: "C4", icon: <GrenadeIcon /> }, { label: "Bomb Vest", icon: <VestIcon /> }] },
  { id: 10, name: "PHANTOM",  role: "HYBRID",    rarity: "legendary", unlocked: false, selected: false, description: "Adapt to any situation.", slots: [{ label: "AR", icon: <GunIcon /> }, { label: "Secondary", icon: <PistolIcon /> }, { label: "Flash", icon: <GrenadeIcon /> }, { label: "Tac Vest", icon: <VestIcon /> }] },
  { id: 11, name: "SHIELD",   role: "GUARDIAN",  rarity: "rare",      unlocked: false, selected: false, description: "Protect the team at all costs.", slots: [{ label: "SMG", icon: <GunIcon /> }, { label: "Shield", icon: <VestIcon /> }, { label: "Medkit", icon: <MedkitIcon /> }, { label: "Armor", icon: <VestIcon /> }] },
  { id: 12, name: "STRIKER",  role: "RUSH",      rarity: "common",    unlocked: false, selected: false, description: "Fast and lethal. Rush and destroy.", slots: [{ label: "Pistol", icon: <PistolIcon /> }, { label: "Knife", icon: <GunIcon /> }, { label: "Smoke", icon: <GrenadeIcon /> }, { label: "Light", icon: <VestIcon /> }] },
];

/* ── SVG inline icons ── */
function GunIcon() {
  return (
    <svg viewBox="0 0 48 24" className="w-full h-full" fill="none">
      <rect x="2" y="9" width="26" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="28" y="10" width="16" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <rect x="10" y="15" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
    </svg>
  );
}
function PistolIcon() {
  return (
    <svg viewBox="0 0 36 24" className="w-full h-full" fill="none">
      <rect x="2" y="8" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="20" y="9.5" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <rect x="8" y="14" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
    </svg>
  );
}
function SniperIcon() {
  return (
    <svg viewBox="0 0 56 20" className="w-full h-full" fill="none">
      <rect x="2" y="8" width="20" height="5" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="22" y="9.5" width="30" height="2" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <rect x="8" y="13" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <circle cx="14" cy="7" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
function GrenadeIcon() {
  return (
    <svg viewBox="0 0 24 28" className="w-full h-full" fill="none">
      <ellipse cx="12" cy="17" rx="8" ry="9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="10" y="5" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      <path d="M12 5 Q14 2 16 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function VestIcon() {
  return (
    <svg viewBox="0 0 28 28" className="w-full h-full" fill="none">
      <path d="M4 8 Q4 4 8 4 L14 8 L20 4 Q24 4 24 8 L24 24 Q24 26 22 26 L6 26 Q4 26 4 24 Z"
        stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <path d="M9 4 L9 14 Q10 16 14 16 Q18 16 19 14 L19 4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function MedkitIcon() {
  return (
    <svg viewBox="0 0 28 28" className="w-full h-full" fill="none">
      <rect x="3" y="7" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12" />
      <rect x="12" y="11" width="4" height="8" rx="1" fill="currentColor" fillOpacity="0.6" />
      <rect x="10" y="13" width="8" height="4" rx="1" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

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

const VISIBLE_COLS = 4;
const TOTAL_COLS   = 6;
const TOTAL_SLOTS  = TOTAL_COLS * 2;

export default function LoadoutSelect() {
  const [, setLocation] = useLocation();
  const [loadouts, setLoadouts] = useState<Loadout[]>(STATIC_LOADOUTS);

  const equippedLoadout = loadouts.find(l => l.selected) ?? loadouts[0];
  const [previewId, setPreviewId] = useState<number | null>(null);

  const previewLoadout = previewId
    ? loadouts.find(l => l.id === previewId)
    : equippedLoadout;

  const previewRarity = (previewLoadout?.rarity ?? "common") as keyof typeof RARITY_CONFIG;
  const previewCfg    = RARITY_CONFIG[previewRarity] ?? RARITY_CONFIG.common;

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => loadouts[i] ?? null);

  /* ── equip handler ── */
  const handleEquip = (id: number) => {
    setLoadouts(prev => prev.map(l => ({ ...l, selected: l.id === id })));
    setTimeout(() => setLocation("/lobby", { replace: true }), 500);
  };

  /* ── Swipe / drag scroll ── */
  const containerRef       = useRef<HTMLDivElement>(null);
  const touchStartX        = useRef(0);
  const touchStartScroll   = useRef(0);
  const isDragging         = useRef(false);
  const [scrollX, setScrollX]     = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const getCardWidth = () => (containerRef.current?.clientWidth ?? 300) / VISIBLE_COLS;
  const getMaxScroll = () => getCardWidth() * (TOTAL_COLS - VISIBLE_COLS);
  const clampedSet   = (raw: number) => Math.max(0, Math.min(getMaxScroll(), raw));

  const snap = (current: number) => {
    const cardW = getCardWidth();
    const page  = Math.round(current / cardW);
    const max   = TOTAL_COLS - VISIBLE_COLS;
    setScrollX(Math.max(0, Math.min(max, page)) * cardW);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartScroll.current = scrollX; setIsSwiping(true); };
  const onTouchMove  = (e: React.TouchEvent) => { setScrollX(clampedSet(touchStartScroll.current + (touchStartX.current - e.touches[0].clientX))); };
  const onTouchEnd   = () => { setIsSwiping(false); snap(scrollX); };

  const onMouseDown  = (e: React.MouseEvent) => { isDragging.current = true; touchStartX.current = e.clientX; touchStartScroll.current = scrollX; setIsSwiping(true); };
  const onMouseMove  = (e: React.MouseEvent) => { if (!isDragging.current) return; setScrollX(clampedSet(touchStartScroll.current + (touchStartX.current - e.clientX))); };
  const onMouseUp    = () => { if (!isDragging.current) return; isDragging.current = false; setIsSwiping(false); snap(scrollX); };

  const activeDot = Math.round(scrollX / (getCardWidth() || 1));

  return (
    <div
      className="relative h-screen w-screen overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(155deg, #0d0a00 0%, #090700 60%, #0c0900 100%)" }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,200,40,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,40,1) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }} />

      {/* Diagonal hazard lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,180,0,1) 0px, rgba(255,180,0,1) 1px, transparent 1px, transparent 48px)" }} />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(255,180,0,0.10) 0%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(200,140,0,0.07) 0%, transparent 55%)" }} />

      {/* ── X BUTTON ── */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setLocation("/lobby", { replace: true })}
          className="flex items-center justify-center w-8 h-8 rounded active:scale-90 transition-transform"
          style={{ border: "1.5px solid rgba(255,200,40,0.5)", background: "rgba(0,0,0,0.5)" }}>
          <X className="w-5 h-5" style={{ color: "#ffc828" }} />
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="absolute inset-0">

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
            {slots.map((loadout, i) => {
              if (!loadout) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="relative rounded overflow-hidden flex items-center justify-center"
                    style={{ border: "1.5px solid rgba(255,200,40,0.1)", background: "rgba(15,10,0,0.55)" }}>
                    <CyberpunkCorners color="rgba(255,200,40,0.22)" />
                    <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.07)" }} />
                  </div>
                );
              }

              const cfg       = RARITY_CONFIG[loadout.rarity] ?? RARITY_CONFIG.common;
              const isActive   = loadout.id === previewLoadout?.id;
              const isEquipped = loadout.selected;

              return (
                <button
                  key={loadout.id}
                  onClick={() => setPreviewId(loadout.id)}
                  className="relative rounded overflow-hidden flex flex-col transition-all active:scale-95"
                  style={{
                    border: isActive ? `2px solid ${cfg.border}` : "1.5px solid rgba(255,200,40,0.15)",
                    background: isActive ? "rgba(30,20,0,0.92)" : "rgba(15,10,0,0.65)",
                    boxShadow: isActive ? `0 0 18px ${cfg.glow}` : "none",
                    transition: "all 0.15s ease",
                  }}>

                  <CyberpunkCorners color={isActive ? cfg.border : "rgba(255,200,40,0.25)"} />

                  {/* Card body */}
                  <div
                    className="flex-1 relative flex flex-col items-center justify-center gap-1 px-1"
                    style={{
                      background: isActive
                        ? `radial-gradient(ellipse at 50% 50%, ${cfg.glow} 0%, rgba(0,0,0,0.5) 70%)`
                        : "rgba(0,0,0,0.4)",
                      minHeight: 0,
                    }}>

                    {/* Loadout icon (role-based SVG) */}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: "36px",
                        height: "20px",
                        color: loadout.unlocked
                          ? isActive ? cfg.text : "rgba(255,200,40,0.45)"
                          : "rgba(255,255,255,0.08)",
                      }}>
                      <GunIcon />
                    </div>

                    {/* Loadout name */}
                    <span
                      style={{
                        fontSize: "7px",
                        fontFamily: "monospace",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        color: loadout.unlocked
                          ? isActive ? cfg.text : "rgba(255,200,40,0.6)"
                          : "rgba(255,255,255,0.12)",
                        textTransform: "uppercase",
                        lineHeight: 1,
                      }}>
                      {loadout.name}
                    </span>

                    {/* Role badge */}
                    <span
                      style={{
                        fontSize: "5.5px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                        textTransform: "uppercase",
                        lineHeight: 1,
                      }}>
                      {loadout.role}
                    </span>

                    {/* Lock overlay */}
                    {!loadout.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.75)" }}>
                        <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                      </div>
                    )}

                    {/* Equipped checkmark */}
                    {isEquipped && (
                      <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center z-10"
                        style={{ background: "#ffc828", boxShadow: "0 0 5px rgba(255,200,40,0.9)" }}>
                        <span style={{ fontSize: "6px", color: "#000", fontWeight: 900, lineHeight: 1 }}>✓</span>
                      </div>
                    )}

                    {/* Rarity bottom line */}
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
                  background: dot === activeDot ? "rgba(255,200,40,0.95)" : "rgba(255,200,40,0.28)",
                  transition: "all 0.25s ease",
                }} />
            ))}
          </div>

          {/* ── Right-edge fade hint ── */}
          {activeDot < TOTAL_COLS - VISIBLE_COLS && (
            <div className="absolute top-0 bottom-6 pointer-events-none"
              style={{
                right: 0,
                width: "32px",
                background: "linear-gradient(90deg, transparent, rgba(9,7,0,0.88))",
              }} />
          )}
        </div>

        {/* ─── RIGHT: Loadout preview panel ─── */}
        <div
          className="absolute right-0 top-0 bottom-0 flex flex-col"
          style={{
            width: "40%",
            borderLeft: "1px solid rgba(255,200,40,0.14)",
            background: "linear-gradient(155deg, #0d0a00 0%, #090700 60%, #0c0900 100%)",
            zIndex: 10,
          }}>

          {/* Preview content */}
          <div className="flex-1 flex flex-col items-center justify-center px-3 gap-3" style={{ minHeight: 0 }}>

            {previewLoadout ? (
              <>
                {/* Rarity label */}
                <div
                  style={{
                    fontSize: "8px",
                    fontFamily: "monospace",
                    fontWeight: 900,
                    letterSpacing: "0.25em",
                    color: previewCfg.text,
                    textShadow: `0 0 8px ${previewCfg.glow}`,
                    textTransform: "uppercase",
                  }}>
                  {previewCfg.label}
                </div>

                {/* Loadout name */}
                <div
                  style={{
                    fontSize: "18px",
                    fontFamily: "monospace",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    color: "#ffffff",
                    textShadow: `0 0 18px ${previewCfg.glow}, 0 0 6px rgba(0,0,0,0.8)`,
                    textTransform: "uppercase",
                    textAlign: "center",
                    lineHeight: 1.1,
                  }}>
                  {previewLoadout.name}
                </div>

                {/* Role */}
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase",
                  }}>
                  {previewLoadout.role}
                </div>

                {/* Divider */}
                <div style={{ width: "80%", height: "1px", background: `linear-gradient(90deg, transparent, ${previewCfg.border}, transparent)` }} />

                {/* Description */}
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "monospace",
                    color: "rgba(255,255,255,0.38)",
                    textAlign: "center",
                    lineHeight: 1.5,
                    letterSpacing: "0.04em",
                    padding: "0 4px",
                  }}>
                  {previewLoadout.description}
                </div>

                {/* Gear slots */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {previewLoadout.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "rgba(255,200,40,0.05)",
                        border: `1px solid ${previewCfg.border}`,
                        borderRadius: "4px",
                        padding: "4px 8px",
                        opacity: previewLoadout.unlocked ? 1 : 0.35,
                      }}>
                      <div style={{ width: "24px", height: "14px", color: previewCfg.text, flexShrink: 0 }}>
                        {slot.icon}
                      </div>
                      <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {slot.label}
                      </span>
                      <div style={{ flex: 1 }} />
                      {previewLoadout.unlocked
                        ? <Check style={{ width: "8px", height: "8px", color: previewCfg.text }} />
                        : <Lock style={{ width: "8px", height: "8px", color: "rgba(255,255,255,0.2)" }} />
                      }
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: "rgba(255,200,40,0.3)", fontFamily: "monospace", fontSize: "10px" }}>
                SELECT A LOADOUT
              </div>
            )}
          </div>

          {/* Equip / confirm button */}
          <div className="shrink-0 flex flex-col items-center pb-3" style={{ gap: "4px" }}>
            <button
              disabled={!previewLoadout || !previewLoadout.unlocked}
              onClick={() => previewLoadout && handleEquip(previewLoadout.id)}
              className="font-mono font-black tracking-[0.22em] uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontSize: "11px",
                width: "90px",
                height: "28px",
                borderRadius: "4px",
                border: previewLoadout?.selected
                  ? "1.5px solid rgba(255,200,40,0.5)"
                  : "1.5px solid rgba(255,200,40,0.75)",
                background: previewLoadout?.selected
                  ? "rgba(255,200,40,0.08)"
                  : "rgba(255,200,40,0.14)",
                color: "#ffffff",
                boxShadow: "0 0 14px rgba(255,200,40,0.18), inset 0 0 12px rgba(255,200,40,0.05)",
              }}>
              {previewLoadout?.selected ? "EQUIPPED" : "CONFIRM"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
