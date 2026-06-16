import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots } from "@workspace/api-client-react";
import {
  ChevronLeft, ChevronDown, Plus, Diamond, Coins, Hexagon,
  Settings, Bell, Mail, Users, User, Crosshair, Shield,
  Zap, Package, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FRIENDS = [
  { name: "Talpor_Dosh", status: "Online", level: 28, color: "text-green-400" },
  { name: "Comentova", status: "Online", level: 35, color: "text-green-400" },
  { name: "Demngoor", status: "Online", level: 19, color: "text-green-400" },
  { name: "Gimv_Aman", status: "Offline", level: 44, color: "text-gray-500" },
];

const WEAPON_SLOTS = [
  { icon: "🔫", name: "Rifle", rarity: "epic" },
  { icon: "🔫", name: "SMG", rarity: "rare" },
  { icon: "🧨", name: "Grenade", rarity: "common" },
  { icon: "💊", name: "Medkit", rarity: "common" },
  { icon: "⚡", name: "Ability", rarity: "epic" },
  { icon: "🛡️", name: "Shield", rarity: "rare" },
  { icon: "🔧", name: "Tool", rarity: "common" },
  { icon: "💣", name: "C4", rarity: "legendary" },
];

const rarityColor: Record<string, string> = {
  common: "border-gray-500/50 bg-gray-800/60",
  rare: "border-blue-500/60 bg-blue-900/40",
  epic: "border-purple-500/60 bg-purple-900/40",
  legendary: "border-yellow-500/60 bg-yellow-900/40",
};

export default function Lobby() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"loadout" | "abilities" | "appearance">("loadout");
  const { data: player, isLoading: playerLoading } = useGetCurrentPlayer();
  const { data: lobby } = useGetLobby();
  const { data: slots } = useGetLobbySlots();

  if (playerLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-cyan-400 font-mono text-xl tracking-widest">INITIALIZING...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      {/* 16:9 container — fills height, letterboxed horizontally */}
      <div
        className="relative overflow-hidden text-white font-sans"
        style={{ aspectRatio: "16/9", height: "100%", maxWidth: "177.78vh" }}
      >
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")', opacity: 0.55 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />

        {/* ── TOP BAR ─────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-sm border-b border-white/10">
          {/* Left */}
          <div className="flex items-center gap-2">
            <button className="text-white hover:text-cyan-400 transition-colors p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm lg:text-base tracking-widest uppercase text-white">
              PRE-GAME LOBBY
            </span>
          </div>
          {/* Center: Currencies */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-mono text-xs font-bold">{player?.gold?.toLocaleString() ?? "33,225"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Diamond className="w-4 h-4 text-cyan-300" />
              <span className="font-mono text-xs font-bold">{player?.diamonds?.toLocaleString() ?? "0,240"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hexagon className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-xs font-bold">{player?.tokens?.toLocaleString() ?? "283"}</span>
              <button className="text-purple-400 hover:text-purple-300 ml-0.5">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {/* Right: Icons */}
          <div className="flex items-center gap-2 text-gray-400">
            <button className="hover:text-white transition-colors"><Mail className="w-4 h-4" /></button>
            <button className="hover:text-white transition-colors"><Bell className="w-4 h-4" /></button>
            <button className="hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── MAIN AREA (below top bar) ────────────────────────── */}
        <div className="absolute inset-0 top-[10%] bottom-[12%] flex z-10">

          {/* ── LEFT PANEL: LOADOUT ─────────────────────────────── */}
          <div className="w-[28%] h-full flex flex-col bg-black/60 backdrop-blur-md border-r border-white/10">
            {/* Tab row */}
            <div className="flex items-center gap-1 px-2 pt-2 pb-1 border-b border-white/10">
              <button className="glass-panel p-1.5 rounded hover:border-cyan-400/50 transition-colors border border-white/20">
                <Users className="w-3 h-3 text-gray-300" />
              </button>
              <button className="glass-panel p-1.5 rounded hover:border-cyan-400/50 transition-colors border border-white/20 border-cyan-400/60">
                <Package className="w-3 h-3 text-cyan-400" />
              </button>
              <button className="glass-panel p-1.5 rounded hover:border-cyan-400/50 transition-colors border border-white/20">
                <Crosshair className="w-3 h-3 text-gray-300" />
              </button>
              <button className="glass-panel p-1.5 rounded hover:border-cyan-400/50 transition-colors border border-white/20">
                <Zap className="w-3 h-3 text-gray-300" />
              </button>
              <span className="ml-1 font-bold text-xs text-cyan-400 uppercase tracking-wider">LOADOUT</span>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-white/10">
              {(["loadout", "abilities", "appearance"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wide transition-colors
                    ${activeTab === tab
                      ? "text-white border-b-2 border-cyan-400 bg-cyan-400/10"
                      : "text-gray-500 hover:text-gray-300"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Weapon Grid */}
            <div className="flex-1 overflow-hidden p-2">
              {activeTab === "loadout" && (
                <div className="grid grid-cols-4 gap-1.5">
                  {WEAPON_SLOTS.map((slot, i) => (
                    <div
                      key={i}
                      className={`aspect-square border rounded flex items-center justify-center text-lg cursor-pointer hover:scale-105 transition-transform ${rarityColor[slot.rarity]}`}
                    >
                      <span className="text-sm">{slot.icon}</span>
                    </div>
                  ))}
                  {/* Empty slots */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square border border-dashed border-white/10 rounded flex items-center justify-center cursor-pointer hover:border-white/25 transition-colors bg-white/5"
                    >
                      <Plus className="w-3 h-3 text-white/20" />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "abilities" && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[{ icon: "⚡", r: "epic" }, { icon: "🛡️", r: "rare" }, { icon: "💨", r: "common" }, { icon: "🔮", r: "legendary" }].map((a, i) => (
                    <div key={i} className={`aspect-square border rounded flex items-center justify-center text-lg cursor-pointer hover:scale-105 transition-transform ${rarityColor[a.r]}`}>
                      <span className="text-sm">{a.icon}</span>
                    </div>
                  ))}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square border border-dashed border-white/10 rounded flex items-center justify-center bg-white/5">
                      <Plus className="w-3 h-3 text-white/20" />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "appearance" && (
                <div className="flex flex-col gap-2 pt-1">
                  {["Skin", "Helmet", "Backpack", "Banner"].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-2 glass-panel border border-white/10 rounded cursor-pointer hover:border-purple-400/40 transition-colors">
                      <div className="w-8 h-8 rounded border border-white/20 bg-purple-900/40 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-xs text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: CHARACTER ────────────────────────────────── */}
          <div className="flex-1 h-full relative flex flex-col items-center justify-between">
            {/* Player name + dropdown */}
            <div className="mt-2 flex items-center gap-2 glass-panel px-3 py-1 rounded border border-white/15">
              <User className="w-3 h-3 text-cyan-400" />
              <span className="font-bold text-xs lg:text-sm tracking-widest uppercase text-white">
                {player?.username ?? "PROJECT 10"}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>

            {/* Character + squad invite buttons */}
            <div className="flex-1 w-full flex items-end justify-center relative">
              {/* Left squad slot */}
              <div className="absolute left-[10%] bottom-[15%] z-10">
                {slots?.[1]?.status === "occupied" ? (
                  <div className="w-10 h-14 lg:w-14 lg:h-20 border border-cyan-500/50 glass-panel rounded flex flex-col items-center justify-center bg-cyan-900/30">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                ) : (
                  <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 border-white/25 glass-panel flex items-center justify-center hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all group">
                    <Plus className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Character model */}
              <div className="relative flex items-end justify-center h-[90%]">
                <div className="absolute bottom-[5%] w-[120px] lg:w-[180px] h-[20px] lg:h-[30px] bg-cyan-400/25 blur-[30px] rounded-full" />
                <img
                  src="/assets/character-model.png"
                  alt="Character"
                  className="h-full w-auto object-contain drop-shadow-[0_0_18px_rgba(0,255,255,0.35)] animate-hologram"
                />
              </div>

              {/* Right squad slot */}
              <div className="absolute right-[10%] bottom-[15%] z-10">
                {slots?.[2]?.status === "occupied" ? (
                  <div className="w-10 h-14 lg:w-14 lg:h-20 border border-cyan-500/50 glass-panel rounded flex flex-col items-center justify-center bg-cyan-900/30">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                ) : (
                  <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 border-white/25 glass-panel flex items-center justify-center hover:border-cyan-400/60 hover:bg-cyan-400/10 transition-all group">
                    <Plus className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: SOCIAL ──────────────────────────────── */}
          <div className="w-[22%] h-full flex flex-col bg-black/60 backdrop-blur-md border-l border-white/10">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">SOCIAL</span>
            </div>

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
              {FRIENDS.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 glass-panel border border-white/10 rounded cursor-pointer hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all"
                >
                  <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] lg:text-[10px] font-bold text-white truncate">{f.name}</p>
                    <p className={`text-[8px] lg:text-[9px] font-mono ${f.color}`}>
                      {f.status} · LVL {f.level}
                    </p>
                  </div>
                  {f.status === "Online" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            {/* Enter for mode */}
            <div className="p-2 border-t border-white/10">
              <div className="flex items-center gap-2 p-2 glass-panel border border-white/10 rounded cursor-pointer hover:bg-white/5 transition-colors">
                <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="text-[9px] text-gray-400 font-mono">Enter for mode...</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR ───────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-black/70 backdrop-blur-sm border-t border-white/10">
          {/* Left info */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>SQUAD: {lobby?.currentPlayers ?? 1}/{lobby?.maxPlayers ?? 5}</span>
          </div>

          {/* Center buttons */}
          <div className="flex items-center gap-2">
            <button className="px-4 lg:px-6 py-1.5 lg:py-2 bg-gray-700/80 hover:bg-gray-600/80 border border-white/20 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest transition-colors">
              ONLEY
            </button>
            <button className="px-4 lg:px-6 py-1.5 lg:py-2 bg-gray-700/80 hover:bg-gray-600/80 border border-white/20 text-white font-bold text-[10px] lg:text-xs uppercase tracking-widest transition-colors">
              SPACK
            </button>
            <button
              onClick={() => setLocation("/matchmaking")}
              className="px-8 lg:px-12 py-1.5 lg:py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-yellow-400 text-white font-bold text-xs lg:text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(255,136,0,0.5)] border border-orange-400/50 transition-all hover:scale-105 active:scale-95"
            >
              MATCHMAKING
            </button>
          </div>

          {/* Right: level info */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span className="text-cyan-400 font-bold">{player?.username ?? "PROJECT_10"}</span>
            <span>LVL {player?.level ?? 42}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
