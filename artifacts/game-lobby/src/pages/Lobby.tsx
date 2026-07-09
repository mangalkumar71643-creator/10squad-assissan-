import { useLocation } from "wouter";
import { useGetCurrentPlayer } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";
import CharacterCanvas from "@/components/CharacterCanvas";
import { formatCurrency } from "@/lib/utils";
import { CHAR_3D_MAP } from "@/lib/characterModels";
import { ShoppingCart, Target, Users, Crosshair, ClipboardList, UsersRound, Package, Mail, Settings, Diamond, Coins, Plus } from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "STORE", icon: ShoppingCart, color: "#f0c040", path: null },
  { label: "LUCK ROYALE", icon: Target, color: "#c084fc", path: null },
  { label: "CHARACTERS", icon: Users, color: "#38bdf8", path: "/character" },
  { label: "WEAPONS", icon: Crosshair, color: "#34d399", path: "/weapon" },
  { label: "MISSIONS", icon: ClipboardList, color: "#fb923c", path: null },
  { label: "SQUAD", icon: UsersRound, color: "#e879f9", path: null },
  { label: "INVENTORY", icon: Package, color: "#60a5fa", path: null },
];

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { isLoading, data: player } = useGetCurrentPlayer({ query: { queryKey: ["player"], retry: 1 } });
  const characterId3D = CHAR_3D_MAP[player?.character ?? ""] ?? "";

  if (isLoading && !player) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-mono text-sm tracking-[0.3em] animate-pulse">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden text-white font-sans relative">
      <InstallPrompt />

      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
      </div>

      {/* ── CENTER: 3D character standing on the platform ── */}
      {characterId3D && (
        <div className="absolute inset-0 z-10">
          <CharacterCanvas key={characterId3D} characterId={characterId3D} showPad={true} />
        </div>
      )}

      {/* ── TOP-LEFT: profile card ── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5">
        <div className="w-11 h-11 rounded-lg overflow-hidden border-2 border-yellow-500/70 shrink-0 bg-black/50 flex items-center justify-center">
          <Users className="w-5 h-5 text-yellow-400/80" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-[13px] tracking-wide uppercase" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {player?.username ?? "GUEST"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-white/70">LVL {player?.level ?? 1}</span>
            <div className="w-24 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: "10%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP-RIGHT: currency + icons ── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-black/40 rounded-full pl-2 pr-1 py-1">
          <span className="text-base">🪙</span>
          <span className="font-bold text-[12px] text-yellow-300">{formatCurrency(player?.gold ?? 0)}</span>
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"><Plus className="w-3 h-3" /></div>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 rounded-full pl-2 pr-1 py-1">
          <Diamond className="w-3.5 h-3.5 text-cyan-300" />
          <span className="font-bold text-[12px] text-cyan-300">{formatCurrency(player?.diamonds ?? 0)}</span>
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"><Plus className="w-3 h-3" /></div>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4" />
          <Settings className="w-4 h-4" />
        </div>
      </div>

      {/* ── LEFT SIDEBAR ── */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        {SIDEBAR_ITEMS.map(({ label, icon: Icon, color, path }) => (
          <button
            key={label}
            disabled={!path}
            onClick={() => path && setLocation(path)}
            className="flex items-center gap-2 px-3 py-2 rounded-md disabled:opacity-60 active:scale-95 transition-transform"
            style={{ background: "rgba(10,14,22,0.75)", border: `1px solid ${color}66`, width: "150px" }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color }} />
            <span className="font-bold text-[11px] tracking-wide" style={{ color }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── BOTTOM-RIGHT: Deploy button ── */}
      <div className="absolute bottom-4 right-4 z-20">
        <button
          onClick={() => setLocation("/matchmaking")}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-lg font-black text-[13px] tracking-wide text-black shadow-[0_0_24px_rgba(240,192,64,0.5)] active:scale-95 transition-transform"
        >
          DEPLOY SQUAD
        </button>
      </div>
    </div>
  );
}
