import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";
import {
  ChevronLeft, ChevronDown, Plus, Diamond, Coins, Hexagon,
  Settings, Bell, Mail, Users, User, Crosshair, Shield,
  Zap, Package, UserPlus, Sword, Target, Flame
} from "lucide-react";

const FRIENDS = [
  { name: "Talpor_Dosh", status: "Online", level: 28, rank: "Gold" },
  { name: "Comentova", status: "Online", level: 35, rank: "Platinum" },
  { name: "Demngoor", status: "Online", level: 19, rank: "Silver" },
  { name: "Gimv_Aman", status: "Offline", level: 44, rank: "Diamond" },
  { name: "ShadowX99", status: "Online", level: 31, rank: "Gold" },
];

const LOADOUT: Record<string, { slots: { icon: string; name: string; rarity: string; count?: string }[] }> = {
  loadout: {
    slots: [
      { icon: "🔫", name: "M416", rarity: "epic" },
      { icon: "🔫", name: "UZI Pro", rarity: "rare" },
      { icon: "🧨", name: "Frag x3", rarity: "common", count: "x3" },
      { icon: "💊", name: "Medkit", rarity: "common", count: "x2" },
      { icon: "🛡️", name: "Shield", rarity: "rare" },
      { icon: "💣", name: "C4", rarity: "legendary" },
      { icon: "🔧", name: "Repair", rarity: "common" },
      { icon: "⚡", name: "EMP", rarity: "epic" },
    ],
  },
  abilities: {
    slots: [
      { icon: "⚡", name: "Surge", rarity: "epic" },
      { icon: "🛡️", name: "Barrier", rarity: "rare" },
      { icon: "💨", name: "Dash", rarity: "legendary" },
      { icon: "🔮", name: "Cloak", rarity: "epic" },
      { icon: "🎯", name: "Snipe", rarity: "rare" },
      { icon: "💥", name: "Blast", rarity: "common" },
    ],
  },
  appearance: {
    slots: [
      { icon: "👤", name: "Neon Suit", rarity: "legendary" },
      { icon: "⛑️", name: "Cyber Helm", rarity: "epic" },
      { icon: "🎒", name: "Ghost Pack", rarity: "rare" },
      { icon: "🏷️", name: "Skull Tag", rarity: "common" },
    ],
  },
};

const RARITY_STYLE: Record<string, { border: string; bg: string; glow: string; label: string }> = {
  common:    { border: "border-gray-500/60",  bg: "bg-gray-800/70",   glow: "",                                   label: "text-gray-400" },
  rare:      { border: "border-blue-500/70",  bg: "bg-blue-950/70",   glow: "shadow-[0_0_8px_rgba(59,130,246,0.4)]", label: "text-blue-400" },
  epic:      { border: "border-purple-500/80",bg: "bg-purple-950/70", glow: "shadow-[0_0_8px_rgba(168,85,247,0.5)]", label: "text-purple-400" },
  legendary: { border: "border-yellow-500/90",bg: "bg-yellow-950/70", glow: "shadow-[0_0_12px_rgba(234,179,8,0.6)]", label: "text-yellow-400" },
};

const RANK_COLOR: Record<string, string> = {
  Silver: "text-gray-300", Gold: "text-yellow-400",
  Platinum: "text-cyan-300", Diamond: "text-blue-400",
};

export default function Lobby() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"loadout" | "abilities" | "appearance">("loadout");
  const { data: player, isLoading } = useGetCurrentPlayer();
  const { data: lobby } = useGetLobby();
  const { data: slots } = useGetLobbySlots();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-mono text-sm tracking-[0.3em] animate-pulse">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  const currentSlots = LOADOUT[activeTab].slots;

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <InstallPrompt />
      <div className="relative overflow-hidden text-white font-sans w-full h-full" style={{ aspectRatio: "16/9", maxWidth: "177.78vh", margin: "0 auto" }}>

        {/* ── BACKGROUND ── */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")', opacity: 0.6 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

        {/* ── TOP BAR ── */}
        <div className="absolute top-0 left-0 right-0 z-30 h-[11%] flex items-center justify-between px-4 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm border-b border-white/8">
          <div className="flex items-center gap-3">
            <button className="w-7 h-7 rounded border border-white/20 bg-white/5 flex items-center justify-center hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <p className="font-black text-sm tracking-[0.2em] uppercase text-white leading-none">PRE-GAME LOBBY</p>
              <p className="text-[9px] font-mono text-cyan-400/70 tracking-widest mt-0.5 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green-400 inline-block animate-pulse" />
                N-AMER-01 · 24MS
              </p>
            </div>
          </div>

          {/* Currencies */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-black/40 border border-yellow-500/30 px-3 py-1 rounded-sm">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-mono text-xs font-bold text-yellow-100">{(player?.gold ?? 33228).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-cyan-500/30 px-3 py-1 rounded-sm">
              <Diamond className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-cyan-100">{(player?.diamonds ?? 8240).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 border border-purple-500/30 px-3 py-1 rounded-sm">
              <Hexagon className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-mono text-xs font-bold text-purple-100">{(player?.tokens ?? 268).toLocaleString()}</span>
              <button className="ml-0.5 text-purple-400 hover:text-purple-300"><Plus className="w-3 h-3" /></button>
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2">
            {[Mail, Bell, Settings].map((Icon, i) => (
              <button key={i} className="w-7 h-7 rounded border border-white/15 bg-white/5 flex items-center justify-center hover:border-cyan-400/50 hover:bg-cyan-400/10 transition-all">
                <Icon className="w-3.5 h-3.5 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN 3-COLUMN AREA ── */}
        <div className="absolute inset-0 top-[11%] bottom-[13%] flex z-10">

          {/* ══ LEFT: LOADOUT PANEL ══ */}
          <div className="w-[30%] h-full flex flex-col bg-black/55 backdrop-blur-md border-r border-white/10">

            {/* Category tabs row */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/10 bg-black/30">
              {[
                { icon: Users, id: "squad" },
                { icon: Package, id: "loadout" },
                { icon: Crosshair, id: "weapons" },
                { icon: Zap, id: "abilities2" },
              ].map(({ icon: Icon, id }) => (
                <button key={id} className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${id === "loadout" ? "border-cyan-400/80 bg-cyan-400/15 text-cyan-400" : "border-white/15 bg-white/5 text-gray-400 hover:border-white/30"}`}>
                  <Icon className="w-3 h-3" />
                </button>
              ))}
              <span className="ml-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">LOADOUT</span>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-white/10">
              {(["loadout", "abilities", "appearance"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab
                      ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/8"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/3"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Slots grid */}
            <div className="flex-1 p-2.5 overflow-hidden">
              <div className="grid grid-cols-4 gap-2 h-full content-start">
                {currentSlots.map((slot, i) => {
                  const s = RARITY_STYLE[slot.rarity];
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5 cursor-pointer group">
                      <div className={`w-full aspect-square border rounded flex flex-col items-center justify-center relative ${s.border} ${s.bg} ${s.glow} hover:scale-105 transition-transform`}>
                        <span className="text-base leading-none">{slot.icon}</span>
                        {slot.count && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white/80 bg-black/60 px-0.5 rounded">{slot.count}</span>
                        )}
                      </div>
                      <span className={`text-[7px] font-mono text-center leading-tight truncate w-full text-center ${s.label}`}>{slot.name}</span>
                    </div>
                  );
                })}

                {/* 1-2 empty add slots */}
                {Array.from({ length: Math.max(0, 4 - (currentSlots.length % 4)) % 4 === 0 ? 2 : Math.max(0, 4 - (currentSlots.length % 4)) }).map((_, i) => (
                  <div key={`e-${i}`} className="flex flex-col items-center gap-0.5 cursor-pointer group">
                    <div className="w-full aspect-square border border-dashed border-white/15 rounded flex items-center justify-center bg-white/3 hover:border-white/30 hover:bg-white/6 transition-all">
                      <Plus className="w-3 h-3 text-white/20 group-hover:text-white/40" />
                    </div>
                    <span className="text-[7px] font-mono text-white/20">empty</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Squad status at bottom of left panel */}
            <div className="px-2.5 py-2 border-t border-white/10 bg-black/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span className="text-[9px] font-mono text-gray-300 uppercase tracking-wider">
                    Squad {lobby?.currentPlayers ?? 1}/{lobby?.maxPlayers ?? 5}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: lobby?.maxPlayers ?? 5 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full border ${i < (lobby?.currentPlayers ?? 1) ? "bg-cyan-400 border-cyan-400" : "border-white/25 bg-transparent"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ══ CENTER: CHARACTER ══ */}
          <div className="flex-1 h-full relative flex flex-col items-center">

            {/* Player tag */}
            <div className="mt-2 flex items-center gap-2 bg-black/50 border border-white/15 px-3 py-1.5 rounded-sm backdrop-blur-sm">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="font-bold text-xs tracking-[0.15em] uppercase">{player?.username ?? "PROJECT_10"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>

            {/* Character + flanking squad slots */}
            <div className="flex-1 w-full flex items-end justify-center gap-4 pb-2 relative">

              {/* Left invite slot */}
              <div className="flex flex-col items-center gap-1 mb-4 self-end">
                {slots?.[1]?.status === "occupied" ? (
                  <div className="w-12 h-16 border border-cyan-500/60 bg-cyan-900/30 rounded flex flex-col items-center justify-center gap-1">
                    <User className="w-5 h-5 text-cyan-400" />
                    <span className="text-[7px] font-mono text-cyan-400">ALLY</span>
                  </div>
                ) : (
                  <button className="w-11 h-11 rounded-full border-2 border-white/20 bg-black/30 flex items-center justify-center hover:border-cyan-400/70 hover:bg-cyan-400/10 transition-all group backdrop-blur-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                    <Plus className="w-5 h-5 text-white/30 group-hover:text-cyan-400 transition-colors" />
                  </button>
                )}
              </div>

              {/* Character model */}
              <div className="relative flex-1 h-full flex items-end justify-center max-w-[55%]">
                {/* Platform glow */}
                <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[70%] h-[6%] bg-cyan-400/30 blur-[25px] rounded-full" />
                <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[45%] h-[3%] bg-cyan-400/50 blur-[12px] rounded-full" />
                <img
                  src="/assets/character-model.png"
                  alt="Character"
                  className="h-[96%] w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,255,0.4)] animate-hologram z-10 relative"
                />
              </div>

              {/* Right invite slot */}
              <div className="flex flex-col items-center gap-1 mb-4 self-end">
                {slots?.[2]?.status === "occupied" ? (
                  <div className="w-12 h-16 border border-cyan-500/60 bg-cyan-900/30 rounded flex flex-col items-center justify-center gap-1">
                    <User className="w-5 h-5 text-cyan-400" />
                    <span className="text-[7px] font-mono text-cyan-400">ALLY</span>
                  </div>
                ) : (
                  <button className="w-11 h-11 rounded-full border-2 border-white/20 bg-black/30 flex items-center justify-center hover:border-cyan-400/70 hover:bg-cyan-400/10 transition-all group backdrop-blur-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                    <Plus className="w-5 h-5 text-white/30 group-hover:text-cyan-400 transition-colors" />
                  </button>
                )}
              </div>
            </div>

            {/* Rank badge below character */}
            <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-purple-500/30 px-3 py-1 rounded-full text-[9px] font-mono backdrop-blur-sm">
              <span className="text-purple-400">◆</span>
              <span className="text-gray-300 uppercase tracking-wider">{player?.rank ?? "Diamond"}</span>
              <span className="text-gray-500">·</span>
              <span className="text-cyan-400">LVL {player?.level ?? 42}</span>
            </div>
          </div>

          {/* ══ RIGHT: SOCIAL PANEL ══ */}
          <div className="w-[26%] h-full flex flex-col bg-black/55 backdrop-blur-md border-l border-white/10">

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-[10px] text-white uppercase tracking-[0.2em]">SOCIAL</span>
              </div>
              <span className="text-[8px] font-mono text-green-400 bg-green-400/10 border border-green-400/25 px-1.5 py-0.5 rounded-full">
                {FRIENDS.filter(f => f.status === "Online").length} Online
              </span>
            </div>

            {/* Friends list */}
            <div className="flex-1 flex flex-col gap-1 p-2 overflow-hidden">
              {FRIENDS.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border transition-all cursor-pointer group
                    bg-black/30 border-white/8 hover:bg-cyan-400/6 hover:border-cyan-400/25"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-700 flex items-center justify-center border border-white/20">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${f.status === "Online" ? "bg-green-400" : "bg-gray-600"}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white leading-none">{f.name}</p>
                    <p className="text-[8px] font-mono mt-0.5">
                      <span className={RANK_COLOR[f.rank] ?? "text-gray-400"}>{f.rank}</span>
                      <span className="text-gray-500"> · Lv{f.level}</span>
                    </p>
                  </div>

                  {/* Invite button */}
                  {f.status === "Online" && (
                    <button className="shrink-0 w-5 h-5 rounded border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center hover:bg-cyan-500/25 hover:border-cyan-400/70 transition-all opacity-0 group-hover:opacity-100">
                      <UserPlus className="w-2.5 h-2.5 text-cyan-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Chat input */}
            <div className="p-2 border-t border-white/10 bg-black/40">
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-2 py-1.5 cursor-pointer hover:border-purple-400/40 transition-colors">
                <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-[9px] text-gray-500 font-mono">Enter for mode...</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-[13%] flex items-center justify-between px-4 bg-gradient-to-t from-black/95 to-transparent backdrop-blur-sm border-t border-white/8">
          {/* Left: squad pills */}
          <div className="flex items-center gap-2">
            {/* My slot */}
            <div className="flex items-center gap-1.5 bg-cyan-900/40 border border-cyan-500/50 px-2 py-1 rounded text-[9px] font-mono">
              <div className="w-4 h-4 rounded-full bg-cyan-600/60 flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-white" />
              </div>
              <div>
                <p className="text-cyan-300 font-bold text-[8px] leading-none">{player?.username?.substring(0, 8) ?? "PROJECT_"}</p>
                <p className="text-cyan-500/70 text-[7px]">LVL {player?.level ?? 42}</p>
              </div>
            </div>
            {/* Empty invite pills */}
            {Array.from({ length: (lobby?.maxPlayers ?? 5) - 1 }).map((_, i) => (
              <button key={i} className="flex items-center gap-1 bg-white/5 border border-dashed border-white/15 px-2 py-1 rounded hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all">
                <Plus className="w-2.5 h-2.5 text-white/25" />
                <span className="text-[8px] font-mono text-white/25">Invite</span>
              </button>
            ))}
          </div>

          {/* Center: action buttons */}
          <div className="flex items-center gap-2">
            <button className="px-5 py-2 bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 hover:border-white/35 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all">
              ONLEY
            </button>
            <button className="px-5 py-2 bg-gray-800/90 hover:bg-gray-700/90 border border-white/20 hover:border-white/35 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm transition-all">
              SPACK
            </button>
            <button
              onClick={() => setLocation("/matchmaking")}
              className="px-8 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-yellow-400 text-white font-black text-xs uppercase tracking-[0.15em] rounded-sm shadow-[0_0_20px_rgba(255,136,0,0.45)] border border-orange-400/60 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,136,0,0.65)] active:scale-95"
            >
              MATCHMAKING
            </button>
          </div>

          {/* Right: player info */}
          <div className="text-right">
            <p className="text-[10px] font-bold text-cyan-400 tracking-wider">{player?.username ?? "PROJECT_10"}</p>
            <p className="text-[8px] font-mono text-gray-500">LVL {player?.level ?? 42} · {player?.rank ?? "Diamond"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
