import { useState } from "react";
import { useLocation } from "wouter";
import { useGetPlayerCharacters, useGetCurrentPlayer } from "@workspace/api-client-react";
import { Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const RARITY_CONFIG = {
  common:    { border: "#3ab8ff", glow: "rgba(58,184,255,0.5)",  dim: "rgba(58,184,255,0.18)" },
  rare:      { border: "#00c8ff", glow: "rgba(0,200,255,0.55)",  dim: "rgba(0,200,255,0.2)"  },
  epic:      { border: "#b060ff", glow: "rgba(176,96,255,0.55)", dim: "rgba(176,96,255,0.2)" },
  legendary: { border: "#ffb400", glow: "rgba(255,180,0,0.6)",   dim: "rgba(255,180,0,0.22)" },
} as const;

const CARDS_PER_PAGE = 10;

function TechFrame({ active, color, glow }: { active: boolean; color: string; glow: string }) {
  const c = active ? color : "rgba(0,180,255,0.45)";
  const g = active ? glow  : "rgba(0,180,255,0.0)";
  const bw = active ? 2 : 1.2;
  const cw = active ? 2.5 : 1.8;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 110 190"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={`glow-${active ? "a" : "b"}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={active ? "2.5" : "1.5"} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Main border - full rect with rounded corners */}
      <rect
        x="1" y="1" width="108" height="188" rx="5"
        fill="none"
        stroke={c}
        strokeWidth={bw}
        opacity="0.55"
      />

      {/* Corner brackets — top-left */}
      <path d={`M1,28 L1,5 Q1,1 5,1 L28,1`}
        fill="none" stroke={c} strokeWidth={cw}
        filter={active ? `url(#glow-a)` : undefined}
        style={{ filter: active ? `drop-shadow(0 0 4px ${g})` : undefined }}
      />
      {/* Corner brackets — top-right */}
      <path d={`M82,1 L105,1 Q109,1 109,5 L109,28`}
        fill="none" stroke={c} strokeWidth={cw}
        style={{ filter: active ? `drop-shadow(0 0 4px ${g})` : undefined }}
      />
      {/* Corner brackets — bottom-left */}
      <path d={`M1,162 L1,185 Q1,189 5,189 L28,189`}
        fill="none" stroke={c} strokeWidth={cw}
        style={{ filter: active ? `drop-shadow(0 0 4px ${g})` : undefined }}
      />
      {/* Corner brackets — bottom-right */}
      <path d={`M82,189 L105,189 Q109,189 109,185 L109,162`}
        fill="none" stroke={c} strokeWidth={cw}
        style={{ filter: active ? `drop-shadow(0 0 4px ${g})` : undefined }}
      />

      {/* Small tick marks on sides */}
      <line x1="1" y1="94" x2="6" y2="94" stroke={c} strokeWidth="1" opacity="0.5" />
      <line x1="104" y1="94" x2="109" y2="94" stroke={c} strokeWidth="1" opacity="0.5" />
      <line x1="54" y1="1" x2="54" y2="6" stroke={c} strokeWidth="1" opacity="0.5" />
      <line x1="54" y1="184" x2="54" y2="189" stroke={c} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading } = useGetPlayerCharacters();
  const { data: player } = useGetCurrentPlayer();
  const queryClient = useQueryClient();

  const equippedChar = characters?.find(c => c.selected) ?? characters?.[0];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const selectedChar = selectedId
    ? characters?.find(c => c.id === selectedId)
    : equippedChar;

  const equipMutation = useMutation({
    mutationFn: async (charId: number) => {
      const res = await fetch(`/api/players/me/characters/${charId}/equip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to equip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/me"] });
      setTimeout(() => setLocation("/lobby", { replace: true }), 400);
    },
  });

  const handleRandom = () => {
    const unlocked = (characters ?? []).filter(c => c.unlocked);
    if (!unlocked.length) return;
    const pick = unlocked[Math.floor(Math.random() * unlocked.length)];
    setSelectedId(pick.id);
  };

  const allChars = characters ?? [];
  const totalSlots = Math.max(CARDS_PER_PAGE, allChars.length);
  const totalPages = Math.ceil(totalSlots / CARDS_PER_PAGE);
  const pageSlots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => allChars[page * CARDS_PER_PAGE + i] ?? null);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#06090f" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[11px] tracking-[0.3em] text-cyan-400 animate-pulse">LOADING...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden text-white select-none flex flex-col"
      style={{ background: "linear-gradient(180deg, #08111f 0%, #060d1c 60%, #070e1d 100%)" }}
    >
      {/* Ambient bg glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,120,255,0.10) 0%, transparent 65%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(0,80,200,0.07) 0%, transparent 60%)" }} />

      {/* ── TOP BAR ── */}
      <div className="relative z-20 flex items-center px-4 shrink-0" style={{ height: "52px" }}>
        {/* Back button */}
        <button
          onClick={() => setLocation("/lobby", { replace: true })}
          className="flex items-center justify-center active:scale-90 transition-transform"
          style={{
            width: "36px", height: "36px",
            border: "1.5px solid rgba(0,200,255,0.4)",
            borderRadius: "8px",
            background: "rgba(0,20,50,0.7)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#00c8ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1 flex items-center justify-end pr-1">
          <span
            className="font-black tracking-[0.18em] uppercase"
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(14px, 3vw, 20px)",
              color: "#ffffff",
              textShadow: "0 0 18px rgba(0,200,255,0.6), 0 0 40px rgba(0,150,255,0.3)",
              letterSpacing: "0.18em",
            }}
          >
            CHARACTER SELECT
          </span>
          {/* Title accent dot */}
          <span
            className="ml-2 inline-block rounded-full"
            style={{ width: "6px", height: "6px", background: "#00c8ff", boxShadow: "0 0 8px #00c8ff" }}
          />
        </div>
      </div>

      {/* Thin divider line under header */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent)", flexShrink: 0 }} />

      {/* ── CARD GRID ── */}
      <div className="flex-1 flex flex-col" style={{ padding: "12px 14px 8px", minHeight: 0 }}>
        <div
          className="grid flex-1"
          style={{
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {pageSlots.map((char, i) => {
            if (!char) {
              return (
                <div
                  key={`empty-${page}-${i}`}
                  className="relative flex items-center justify-center"
                  style={{ background: "rgba(0,8,24,0.7)", borderRadius: "6px" }}
                >
                  <TechFrame active={false} color="rgba(0,200,255,0.45)" glow="rgba(0,200,255,0.3)" />
                  <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.08)", position: "relative", zIndex: 1 }} />
                </div>
              );
            }

            const r = (char.rarity ?? "common") as keyof typeof RARITY_CONFIG;
            const cfg = RARITY_CONFIG[r] ?? RARITY_CONFIG.common;
            const isActive = char.id === selectedChar?.id;

            return (
              <button
                key={char.id}
                onClick={() => setSelectedId(char.id)}
                className="relative flex flex-col items-center justify-end overflow-hidden active:scale-95 transition-all"
                style={{
                  background: isActive
                    ? `radial-gradient(ellipse at 50% 80%, ${cfg.dim} 0%, rgba(0,5,18,0.9) 80%)`
                    : "rgba(0,8,24,0.75)",
                  borderRadius: "6px",
                  boxShadow: isActive ? `0 0 20px ${cfg.glow}, inset 0 0 20px rgba(0,0,0,0.4)` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <TechFrame active={isActive} color={cfg.border} glow={cfg.glow} />

                {/* Character image */}
                {char.image && (
                  <img
                    src={char.image}
                    alt={char.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      filter: char.unlocked
                        ? isActive ? `drop-shadow(0 0 10px ${cfg.glow}) brightness(1.05)` : "brightness(0.85)"
                        : "grayscale(1) brightness(0.2)",
                      zIndex: 1,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                {/* Lock overlay */}
                {!char.unlocked && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.75)", zIndex: 2 }}
                  >
                    <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                  </div>
                )}

                {/* Equipped indicator strip */}
                {char.selected && (
                  <div
                    className="absolute bottom-0 inset-x-0 flex items-center justify-center"
                    style={{
                      height: "18px",
                      background: "rgba(0,200,255,0.15)",
                      borderTop: "1px solid rgba(0,200,255,0.4)",
                      zIndex: 3,
                    }}
                  >
                    <span
                      className="font-mono font-black uppercase tracking-widest"
                      style={{ fontSize: "7px", color: "#00d4ff" }}
                    >
                      EQUIPPED
                    </span>
                  </div>
                )}

                {/* Active bottom glow line */}
                {isActive && !char.selected && (
                  <div
                    className="absolute inset-x-0 bottom-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)`,
                      zIndex: 4,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PAGE DOTS ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center shrink-0" style={{ gap: "6px", paddingBottom: "6px" }}>
          {Array.from({ length: totalPages }, (_, pi) => (
            <button
              key={pi}
              onClick={() => setPage(pi)}
              className="rounded-full transition-all"
              style={{
                width: pi === page ? "18px" : "6px",
                height: "6px",
                background: pi === page ? "#00c8ff" : "rgba(0,200,255,0.28)",
                boxShadow: pi === page ? "0 0 6px #00c8ff" : "none",
              }}
            />
          ))}
        </div>
      )}

      {/* ── BOTTOM BUTTONS ── */}
      <div
        className="shrink-0 flex items-center"
        style={{ gap: "10px", padding: "8px 14px 14px" }}
      >
        {/* CONFIRM */}
        <button
          disabled={equipMutation.isPending || !selectedChar?.unlocked}
          onClick={() => selectedChar?.id && equipMutation.mutate(selectedChar.id)}
          className="flex-1 flex items-center justify-center font-black uppercase tracking-[0.18em] transition-all active:scale-95 disabled:opacity-40"
          style={{
            fontFamily: "monospace",
            fontSize: "clamp(12px, 2.5vw, 16px)",
            height: "48px",
            borderRadius: "6px",
            border: selectedChar?.selected
              ? "1.5px solid rgba(0,200,255,0.4)"
              : "1.5px solid rgba(0,200,255,0.65)",
            background: selectedChar?.selected
              ? "linear-gradient(135deg, rgba(0,30,60,0.9) 0%, rgba(0,20,45,0.95) 100%)"
              : "linear-gradient(135deg, rgba(0,40,80,0.85) 0%, rgba(0,25,55,0.9) 100%)",
            color: "#ffffff",
            boxShadow: "0 0 18px rgba(0,200,255,0.12)",
          }}
        >
          {equipMutation.isPending
            ? "..."
            : selectedChar?.selected
            ? "EQUIPPED"
            : "CONFIRM"}
        </button>

        {/* RANDOM */}
        <button
          onClick={handleRandom}
          className="flex-1 flex items-center justify-center font-black uppercase tracking-[0.18em] transition-all active:scale-95"
          style={{
            fontFamily: "monospace",
            fontSize: "clamp(12px, 2.5vw, 16px)",
            height: "48px",
            borderRadius: "6px",
            border: "1.5px solid rgba(120,130,160,0.45)",
            background: "linear-gradient(135deg, rgba(30,35,55,0.9) 0%, rgba(20,25,45,0.95) 100%)",
            color: "rgba(255,255,255,0.75)",
            boxShadow: "0 0 12px rgba(0,0,0,0.3)",
          }}
        >
          RANDOM
        </button>
      </div>
    </div>
  );
}
