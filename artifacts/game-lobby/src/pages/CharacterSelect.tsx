import { useState } from "react";
import { useLocation } from "wouter";
import { useGetPlayerCharacters, useGetCurrentPlayer } from "@workspace/api-client-react";
import { ChevronLeft, Lock, Shuffle, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CharacterCanvas from "@/components/CharacterCanvas";

const RARITY_CONFIG = {
  common:    { border: "rgba(0,200,255,0.45)", glow: "rgba(0,200,255,0.25)", text: "#60c8ff", label: "COMMON" },
  rare:      { border: "rgba(0,180,255,0.7)",  glow: "rgba(0,180,255,0.35)", text: "#00b4ff", label: "RARE" },
  epic:      { border: "rgba(160,80,255,0.8)", glow: "rgba(160,80,255,0.4)", text: "#a050ff", label: "EPIC" },
  legendary: { border: "rgba(255,180,0,0.9)", glow: "rgba(255,180,0,0.5)",  text: "#ffb400", label: "LEGENDARY" },
} as const;

const CHAR_3D_MAP: Record<string, string> = {
  "Cyber Ghost":   "ninja-x-1",
  "Neon Striker":  "nova",
  "Shadow Runner": "phantom",
  "Volt Reaper":   "",
};

const CARDS_PER_PAGE = 8;

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
          <radialGradient id="pgFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,160,255,0.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="50" rx="105" ry="18" fill="url(#pgFill)" opacity="0.7" />
        <ellipse cx="120" cy="50" rx="105" ry="18"
          fill="none" stroke="rgba(0,200,255,0.55)" strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 5px rgba(0,200,255,0.9))" }} />
        <ellipse cx="120" cy="50" rx="72" ry="12"
          fill="none" stroke="rgba(0,140,255,0.35)" strokeWidth="0.75" strokeDasharray="10 5" />
        <ellipse cx="120" cy="50" rx="42" ry="7"
          fill="none" stroke="rgba(0,100,255,0.25)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading } = useGetPlayerCharacters();
  const { data: player } = useGetCurrentPlayer();
  const queryClient = useQueryClient();

  const equippedChar = characters?.find(c => c.selected) ?? characters?.[0];
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const previewChar = previewId
    ? characters?.find(c => c.id === previewId)
    : equippedChar;

  const characterId3D = CHAR_3D_MAP[previewChar?.name ?? ""] ?? "";

  const equipMutation = useMutation({
    mutationFn: async (charId: number) => {
      const res = await fetch(`/api/players/me/characters/${charId}/equip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to equip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/me/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/me"] });
      setTimeout(() => setLocation("/lobby"), 600);
    },
  });

  const allChars = characters ?? [];
  const totalSlots = Math.max(CARDS_PER_PAGE, allChars.length);
  const totalPages = Math.ceil(totalSlots / CARDS_PER_PAGE);
  const pageSlots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => allChars[page * CARDS_PER_PAGE + i] ?? null);

  const previewRarity = (previewChar?.rarity ?? "common") as keyof typeof RARITY_CONFIG;
  const previewCfg = RARITY_CONFIG[previewRarity] ?? RARITY_CONFIG.common;

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
    <div className="relative h-screen w-screen overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(155deg, #07101f 0%, #050a14 60%, #060c18 100%)" }}>


      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(0,100,200,0.14) 0%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(0,80,200,0.10) 0%, transparent 55%)" }} />

      {/* ── HEADER ── */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setLocation("/lobby")}
          className="flex items-center justify-center w-8 h-8 rounded active:scale-90 transition-transform"
          style={{ border: "1.5px solid rgba(0,200,255,0.45)", background: "rgba(0,0,0,0.5)" }}>
          <X className="w-5 h-5" style={{ color: "#00c8ff" }} />
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="flex" style={{ height: "calc(100vh - 60px)" }}>

        {/* LEFT: Card grid */}
        <div className="flex flex-col" style={{ flex: "3 3 0%", padding: "10px 8px 6px 10px", gap: "8px" }}>

          {/* 2×4 grid */}
          <div className="grid grid-cols-4 grid-rows-2 flex-1" style={{ gap: "6px" }}>
            {pageSlots.map((char, i) => {
              if (!char) {
                return (
                  <div
                    key={`empty-${page}-${i}`}
                    className="relative rounded overflow-hidden flex items-center justify-center"
                    style={{
                      border: "1.5px solid rgba(0,200,255,0.13)",
                      background: "rgba(0,8,22,0.55)",
                    }}>
                    <CyberpunkCorners color="rgba(0,200,255,0.25)" />
                    <Lock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.08)" }} />
                  </div>
                );
              }

              const r = (char.rarity ?? "common") as keyof typeof RARITY_CONFIG;
              const cfg = RARITY_CONFIG[r] ?? RARITY_CONFIG.common;
              const isActive = char.id === previewChar?.id;
              const isEquipped = char.selected;

              return (
                <button
                  key={char.id}
                  onClick={() => setPreviewId(char.id)}
                  className="relative rounded overflow-hidden flex flex-col transition-all active:scale-95"
                  style={{
                    border: isActive
                      ? `2px solid ${cfg.border}`
                      : "1.5px solid rgba(0,200,255,0.18)",
                    background: isActive
                      ? `rgba(0,25,55,0.9)`
                      : "rgba(0,8,22,0.65)",
                    boxShadow: isActive ? `0 0 18px ${cfg.glow}` : "none",
                    transition: "all 0.15s ease",
                  }}>

                  <CyberpunkCorners color={isActive ? cfg.border : "rgba(0,200,255,0.28)"} />

                  {/* Image fill */}
                  <div
                    className="flex-1 relative overflow-hidden flex items-end justify-center"
                    style={{
                      background: isActive
                        ? `radial-gradient(ellipse at 50% 90%, ${cfg.glow} 0%, rgba(0,0,0,0.4) 70%)`
                        : "rgba(0,0,0,0.35)",
                      minHeight: 0,
                    }}>

                    {char.image ? (
                      <img
                        src={char.image}
                        alt={char.name}
                        className="w-full h-full object-cover absolute inset-0"
                        style={{
                          filter: char.unlocked
                            ? isActive ? `drop-shadow(0 0 8px ${cfg.glow})` : "none"
                            : "grayscale(1) brightness(0.25)",
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ opacity: 0.3 }}>
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ background: cfg.glow }} />
                      </div>
                    )}

                    {!char.unlocked && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.72)" }}>
                        <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.22)" }} />
                      </div>
                    )}

                    {isEquipped && (
                      <div
                        className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center z-10"
                        style={{ background: "#00c8ff", boxShadow: "0 0 5px rgba(0,200,255,0.9)" }}>
                        <span style={{ fontSize: "6px", color: "#000", fontWeight: 900, lineHeight: 1 }}>✓</span>
                      </div>
                    )}

                    {isActive && (
                      <div
                        className="absolute inset-x-0 bottom-0 h-[2px]"
                        style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* RIGHT: 3D viewer */}
        <div
          className="flex flex-col relative"
          style={{
            flex: "2 2 0%",
            borderLeft: "1px solid rgba(0,200,255,0.14)",
          }}>

          {/* 3D canvas */}
          <div className="flex-1 relative overflow-hidden">
            {characterId3D ? (
              <CharacterCanvas key={characterId3D} characterId={characterId3D} />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 65%, rgba(0,120,255,0.07) 0%, transparent 70%)",
                }} />
            )}
            <PlatformRing />
          </div>

        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4"
        style={{
          height: "60px",
          gap: "10px",
          paddingBottom: "0px",
        }}>

        {/* CONFIRM + RANDOM */}
        <div className="flex items-center" style={{ gap: "10px" }}>
          <button
            disabled={!previewChar?.unlocked || equipMutation.isPending}
            onClick={() => previewChar?.id && equipMutation.mutate(previewChar.id)}
            className="font-mono font-black tracking-[0.22em] uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontSize: "11px",
              padding: "9px 22px",
              borderRadius: "4px",
              border: previewChar?.selected
                ? "1.5px solid rgba(0,200,255,0.5)"
                : "1.5px solid rgba(0,200,255,0.7)",
              background: previewChar?.selected
                ? "rgba(0,200,255,0.08)"
                : "rgba(0,200,255,0.12)",
              color: "#ffffff",
              boxShadow: "0 0 14px rgba(0,200,255,0.18), inset 0 0 12px rgba(0,200,255,0.05)",
            }}>
            {equipMutation.isPending
              ? "..."
              : previewChar?.selected
              ? "✓ EQUIPPED"
              : "CONFIRM"}
          </button>

        </div>

        {/* Right: currency + buy */}
        <div className="flex items-center" style={{ gap: "12px" }}>
          <div className="flex items-center" style={{ gap: "6px" }}>
            <span style={{ fontSize: "14px", lineHeight: 1, display: "inline-block", transform: "rotate(30deg)" }}>💎</span>
            <span className="font-mono font-bold text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>0</span>
            <div style={{ width: "20px" }} />
            <span style={{ fontSize: "15px", lineHeight: 1 }}>🪙</span>
            <span className="font-mono font-bold text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {player?.gold ?? 0}
            </span>
          </div>

          <div
            className="h-4 w-px"
            style={{ background: "rgba(255,255,255,0.12)" }} />

          <button
            className="flex items-center font-mono font-black tracking-[0.15em] uppercase transition-all active:scale-95"
            style={{
              fontSize: "10px",
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1.5px solid rgba(130,80,255,0.55)",
              background: "rgba(90,50,200,0.12)",
              color: "#a080ff",
            }}>
            BUY
          </button>
        </div>
      </div>
    </div>
  );
}
