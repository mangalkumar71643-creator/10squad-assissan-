import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";
import {
  ChevronLeft, ChevronDown, Plus, Diamond, Coins, Hexagon,
  Settings, Mail, User, Shield, Zap, Swords, Target, Crosshair
} from "lucide-react";

const FRIENDS = [
  {
    name: "Talpor_Dosh",
    shortName: "Talpor_...",
    status: "ONLINE/Lobby",
    online: true,
    rank: "Gold",
    rankColor: "text-yellow-400",
    rankBg: "bg-yellow-500/20 border-yellow-500/40",
    avatarFrom: "from-orange-500",
    avatarTo: "to-red-600",
    initials: "T",
  },
  {
    name: "Comentova",
    shortName: "Coment...",
    status: "IN MATCH: Space Station",
    online: true,
    rank: "Platinum",
    rankColor: "text-cyan-300",
    rankBg: "bg-cyan-500/20 border-cyan-400/40",
    avatarFrom: "from-blue-500",
    avatarTo: "to-cyan-600",
    initials: "C",
  },
  {
    name: "Demngoor",
    shortName: "Demngoor",
    status: "OFFLINE",
    online: false,
    rank: "",
    rankColor: "",
    rankBg: "",
    avatarFrom: "from-gray-600",
    avatarTo: "to-gray-700",
    initials: "D",
  },
  {
    name: "Gimv_Aman",
    shortName: "Gimv_Aman",
    status: "ONLINE/Ready",
    online: true,
    rank: "Diamond",
    rankColor: "text-blue-300",
    rankBg: "bg-blue-500/20 border-blue-400/40",
    avatarFrom: "from-purple-500",
    avatarTo: "to-indigo-600",
    initials: "G",
  },
];

const WEAPONS = [
  { icon: "🔫", name: "W416", rarity: "legendary", border: "border-orange-500/80", bg: "bg-orange-950/60", glow: "shadow-[0_0_10px_rgba(249,115,22,0.5)]" },
  { icon: "🔫", name: "UZI Pro", rarity: "legendary", border: "border-orange-500/80", bg: "bg-orange-950/60", glow: "shadow-[0_0_10px_rgba(249,115,22,0.5)]" },
  { icon: "🧨", name: "Frag", rarity: "rare", border: "border-blue-500/70", bg: "bg-blue-950/60", glow: "shadow-[0_0_8px_rgba(59,130,246,0.4)]" },
  { icon: "💊", name: "Medkit", rarity: "common", border: "border-blue-400/60", bg: "bg-blue-950/50", glow: "" },
  { icon: "🛡️", name: "Shield", rarity: "rare", border: "border-blue-500/70", bg: "bg-blue-950/60", glow: "shadow-[0_0_8px_rgba(59,130,246,0.4)]" },
  { icon: "💣", name: "C4", rarity: "legendary", border: "border-orange-500/80", bg: "bg-orange-950/60", glow: "shadow-[0_0_10px_rgba(249,115,22,0.5)]" },
  { icon: "🔧", name: "Repair", rarity: "common", border: "border-gray-500/50", bg: "bg-gray-800/60", glow: "" },
  { icon: "⚡", name: "EMP", rarity: "epic", border: "border-purple-500/80", bg: "bg-purple-950/60", glow: "shadow-[0_0_8px_rgba(168,85,247,0.5)]" },
];

function CircleStat({ value, label, color, icon }: { value: string; label: string; color: string; icon?: React.ReactNode }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = label === "K/D" ? Math.min(parseFloat(value) / 6, 1) : label === "WIN%" ? parseFloat(value) / 100 : 0.85;
  const dash = pct * circumference;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-[62px] h-[62px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="62" height="62" viewBox="0 0 62 62">
          <circle cx="31" cy="31" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="31" cy="31" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="flex flex-col items-center">
          {icon && <span className="text-[8px] mb-0.5">{icon}</span>}
          <span className="font-black text-[11px] text-white leading-none">{value}</span>
        </div>
      </div>
      <span className="text-[8px] font-mono text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function Lobby() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"gear" | "abilities">("gear");
  const { data: player, isLoading } = useGetCurrentPlayer();
  const { data: lobby } = useGetLobby();

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

  return (
    <div className="h-screen w-screen bg-[#0a0d14] flex flex-col overflow-hidden text-white font-sans">
      <InstallPrompt />

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")', opacity: 0.45 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d14]/80 via-transparent to-[#0a0d14]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d14]/70 via-transparent to-[#0a0d14]/70" />
      </div>

      {/* ── TOP BAR ── */}
      <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-[#0d1117]/80 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <button className="w-7 h-7 rounded-md border border-white/20 bg-white/5 flex items-center justify-center hover:border-cyan-400/60 transition-all">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <p className="font-black text-[13px] tracking-[0.15em] uppercase text-white leading-none">PRE-GAME LOBBY</p>
            <p className="text-[8px] font-mono text-cyan-400/70 tracking-widest mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              N-AMER-01 · 24MS
            </p>
          </div>
        </div>

        {/* Currencies */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/50 border border-yellow-500/30 px-2.5 py-1 rounded-full">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold text-[11px] text-white">{(player?.gold ?? 33228).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/50 border border-cyan-500/30 px-2.5 py-1 rounded-full">
            <Diamond className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-[11px] text-white">{(player?.diamonds ?? 8240).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/50 border border-purple-500/30 px-2.5 py-1 rounded-full">
            <Hexagon className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold text-[11px] text-white">{(player?.tokens ?? 268).toLocaleString()}</span>
            <button className="text-purple-400 hover:text-purple-300"><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-md border border-white/15 bg-white/5 flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <Mail className="w-4 h-4 text-gray-300" />
          </button>
          <button className="w-8 h-8 rounded-md border border-white/15 bg-white/5 flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <Settings className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* ══ LEFT: LOADOUT PANEL ══ */}
        <div className="w-[32%] flex flex-col bg-[#0d1117]/75 backdrop-blur-md border-r border-white/10">

          {/* Panel header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-black text-[11px] tracking-[0.2em] uppercase text-white">LOADOUT</span>
          </div>

          {/* GEAR / ABILITIES tabs */}
          <div className="flex border-b border-white/10">
            {(["gear", "abilities"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "text-white bg-white/15 border-b-2 border-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* WEAPONS label */}
          <div className="px-3 pt-2 pb-1">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.25em]">WEAPONS</span>
          </div>

          {/* 4x2 weapon grid */}
          <div className="px-2 pb-2">
            <div className="grid grid-cols-4 gap-1.5">
              {WEAPONS.map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 cursor-pointer group">
                  <div className={`w-full aspect-square border rounded-md flex items-center justify-center relative ${w.border} ${w.bg} ${w.glow} hover:scale-105 transition-transform`}>
                    <span className="text-lg leading-none">{w.icon}</span>
                  </div>
                  <span className="text-[7px] font-mono text-gray-400 truncate w-full text-center">{w.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-white/10" />

          {/* Stats row */}
          <div className="flex items-center justify-around px-2 py-2">
            <CircleStat value="4.2" label="K/D" color="#4ade80" />
            <CircleStat value="38" label="WIN%" color="#facc15" />
            <CircleStat value="1,247" label="KILLS" color="#a855f7" icon="⚡" />
          </div>

          {/* Squad */}
          <div className="mt-auto px-3 py-2 border-t border-white/10 bg-black/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-mono text-gray-300 uppercase tracking-wider">
                  Squad {lobby?.currentPlayers ?? 1}/{lobby?.maxPlayers ?? 5}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: lobby?.maxPlayers ?? 5 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full border ${i < (lobby?.currentPlayers ?? 1) ? "bg-cyan-400 border-cyan-400" : "border-white/25"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ CENTER: CHARACTER ══ */}
        <div className="flex-1 relative flex flex-col items-center overflow-hidden">

          {/* Player name + rank */}
          <div className="relative z-20 mt-2 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 bg-black/70 border border-cyan-400/30 px-4 py-1.5 rounded-full backdrop-blur-sm"
              style={{ boxShadow: "0 0 18px rgba(0,210,255,0.25), inset 0 0 10px rgba(0,210,255,0.06)" }}>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center"
                style={{ boxShadow: "0 0 8px rgba(0,210,255,0.6)" }}>
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="font-black text-sm tracking-[0.15em] uppercase text-white"
                style={{ textShadow: "0 0 12px rgba(0,210,255,0.7)" }}>
                {player?.username ?? "PROJECT_10"}
              </span>
              <ChevronDown className="w-4 h-4 text-cyan-400/70" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono"
              style={{ textShadow: "0 0 8px rgba(0,210,255,0.6)" }}>
              <span className="text-cyan-400">◆</span>
              <span className="text-cyan-300 uppercase tracking-wider font-bold">{player?.rank ?? "DIAMOND"}</span>
              <span className="text-gray-500 mx-1">|</span>
              <span className="text-white font-bold">LVL {player?.level ?? 42}</span>
            </div>
          </div>

          {/* Characters area — full remaining height */}
          <div className="flex-1 w-full relative overflow-hidden">

            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[70%]"
                style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(0,180,255,0.18) 0%, rgba(120,0,255,0.10) 45%, transparent 70%)" }} />
            </div>

            {/* Squad member (small, left) */}
            <div className="absolute left-[4%] bottom-0 z-10 flex items-end"
              style={{ height: "55%" }}>
              <img
                src="/assets/character-model.png"
                alt="Squad member"
                className="h-full w-auto object-contain scale-x-[-1]"
                style={{
                  filter: "brightness(0.55) saturate(0.6) drop-shadow(0 0 6px rgba(100,100,255,0.4))",
                  opacity: 0.8,
                }}
              />
            </div>

            {/* Add squad slot (right) */}
            <button className="absolute right-[6%] bottom-[22%] z-10 w-11 h-11 rounded-full border-2 border-white/20 bg-black/50 flex items-center justify-center hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all backdrop-blur-sm"
              style={{ boxShadow: "0 0 12px rgba(0,210,255,0.15)" }}>
              <Plus className="w-5 h-5 text-white/40" />
            </button>

            {/* PLATFORM — glowing disc */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10" style={{ width: "65%", height: "22%" }}>
              {/* Outer diffuse glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[55%] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(0,210,255,0.35) 0%, transparent 70%)", filter: "blur(12px)" }} />
              {/* Mid ring glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[72%] h-[35%] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(0,210,255,0.55) 0%, transparent 65%)", filter: "blur(6px)" }} />
              {/* Solid bright core line */}
              <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-[50%] h-[10%] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(180,240,255,0.9) 0%, rgba(0,210,255,0.6) 50%, transparent 100%)", filter: "blur(3px)" }} />
              {/* Outer ring SVG */}
              <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full" viewBox="0 0 200 60" style={{ overflow: "visible" }}>
                <ellipse cx="100" cy="45" rx="95" ry="14"
                  fill="none" stroke="rgba(0,210,255,0.5)" strokeWidth="1"
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,210,255,0.8))" }} />
                <ellipse cx="100" cy="45" rx="68" ry="10"
                  fill="none" stroke="rgba(0,210,255,0.3)" strokeWidth="0.5"
                  strokeDasharray="8 4" />
              </svg>
            </div>

            {/* MAIN CHARACTER — perfectly centered with idle breathing */}
            <div className="absolute inset-0 flex items-end justify-center z-20 pb-[3%]">
              <img
                src="/assets/character-model.png"
                alt="Character"
                className="w-auto object-contain"
                style={{
                  height: "92%",
                  filter: "drop-shadow(0 0 25px rgba(0,210,255,0.7)) drop-shadow(0 0 60px rgba(120,0,255,0.45)) drop-shadow(0 0 8px rgba(255,255,255,0.3))",
                  animation: "holographic 3s ease-in-out infinite, idle-breathe 4s ease-in-out infinite",
                  transformOrigin: "bottom center",
                }}
              />
            </div>

            {/* Scan line effect */}
            <div className="absolute inset-x-0 z-30 pointer-events-none overflow-hidden" style={{ top: 0, bottom: 0 }}>
              <div style={{
                position: "absolute",
                left: 0, right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, rgba(0,210,255,0.4), transparent)",
                animation: "scan-line 4s linear infinite",
              }} />
            </div>
          </div>
        </div>

        {/* ══ RIGHT: SOCIAL PANEL ══ */}
        <div className="w-[28%] flex flex-col bg-[#0d1117]/75 backdrop-blur-md border-l border-white/10">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30">
            <span className="font-black text-[11px] tracking-[0.2em] uppercase text-white">SOCIAL</span>
            <span className="text-[8px] font-mono text-green-400 bg-green-400/10 border border-green-400/25 px-2 py-0.5 rounded-full">
              {FRIENDS.filter(f => f.online).length} Online
            </span>
          </div>

          {/* Friends */}
          <div className="flex-1 flex flex-col p-2 gap-1.5 overflow-hidden">
            {FRIENDS.map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer group ${
                  f.online
                    ? "bg-white/5 border-white/10 hover:bg-cyan-400/8 hover:border-cyan-400/30"
                    : "bg-black/20 border-white/5"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${f.avatarFrom} ${f.avatarTo} flex items-center justify-center border-2 ${f.online ? "border-white/30" : "border-white/10"}`}>
                    <span className="font-black text-sm text-white">{f.initials}</span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1117] ${f.online ? "bg-green-400" : "bg-gray-600"}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white leading-none truncate">{f.shortName}</p>
                  <p className={`text-[8px] font-mono mt-0.5 truncate ${f.online ? "text-gray-400" : "text-gray-600"}`}>{f.status}</p>
                  {f.rank && (
                    <span className={`inline-block mt-0.5 text-[7px] font-bold px-1.5 py-px rounded border ${f.rankBg} ${f.rankColor}`}>
                      {f.rank}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-[#0d1117]/90 backdrop-blur-md border-t border-white/10 shrink-0">
        {/* Left: player pill + add */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-cyan-900/40 border border-cyan-500/50 px-2.5 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-cyan-600/60 border border-cyan-400/50 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-cyan-200 leading-none">{player?.username ?? "Project_1"}</p>
              <p className="text-[8px] text-cyan-500/70 font-mono">Lvl {player?.level ?? 42}</p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center hover:border-cyan-400/50 hover:bg-cyan-400/8 transition-all">
            <Plus className="w-4 h-4 text-white/35" />
          </button>
        </div>

        {/* Center: mode selectors */}
        <div className="flex items-center gap-3">
          <button className="flex flex-col items-center px-4 py-1.5 bg-white/5 border border-white/15 rounded-lg hover:border-white/30 hover:bg-white/10 transition-all">
            <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider">RANKED:</span>
            <span className="text-[11px] font-black text-white tracking-wide">Space Heist</span>
          </button>
          <button className="flex flex-col items-center px-4 py-1.5 bg-white/5 border border-white/15 rounded-lg hover:border-white/30 hover:bg-white/10 transition-all">
            <span className="text-[8px] text-gray-400 font-mono uppercase tracking-wider">CASUAL:</span>
            <span className="text-[11px] font-black text-white tracking-wide">City Hunt</span>
          </button>
        </div>

        {/* Right: Find Squad button */}
        <button
          onClick={() => setLocation("/matchmaking")}
          className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-yellow-400 text-white font-black text-[11px] uppercase tracking-[0.12em] rounded-lg shadow-[0_0_20px_rgba(255,136,0,0.45)] border border-orange-400/60 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,136,0,0.7)] active:scale-95 whitespace-nowrap"
        >
          FIND SQUAD / START MISSION
        </button>
      </div>
    </div>
  );
}
