import React, { useState, Suspense } from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";
import {
  ChevronLeft, ChevronDown, Plus, Diamond, Coins, Hexagon,
  Settings, Mail, User, Shield, Zap, Swords, Target, Crosshair, Users, Check,
  Gauge, Volume2, Sliders, RotateCcw, Globe, Bell, Lock, Info, LogOut, ChevronRight, X
} from "lucide-react";
import CharacterCanvas from "@/components/CharacterCanvas";

const CHARACTER_SLOTS = [
  { id: "hacker-girl-1", name: "HACKER-GIRL", borderType: "orange", is3D: true },
  { id: "ninja-x-1",     name: "NINJA-X",     borderType: "gray",   is3D: false },
  { id: "tank-unit-1",   name: "TANK-UNIT",   borderType: "gray",   is3D: false },
  { id: "tank-unit-2",   name: "TANK-UNIT",   borderType: "orange", is3D: false },
  { id: "support-mage",  name: "Support-Mage",borderType: "gray",   is3D: false },
  { id: "ghost-1",       name: "GHOST",       borderType: "gray",   is3D: false },
  { id: "ghost-2",       name: "GHOST",       borderType: "cyan",   is3D: false },
  { id: "eerics",        name: "EERICS",      borderType: "gray",   is3D: false },
  { id: "hacker-girl-2", name: "HACKER-GIRL", borderType: "gray",   is3D: false },
  { id: "sanpot-mage",   name: "SANPOT-MAGE", borderType: "gray",   is3D: false },
  { id: "ninja-x-2",     name: "NINJA-X",     borderType: "gray",   is3D: false },
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
  const [loadoutOpen, setLoadoutOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [fps, setFps] = useState<"60"|"90"|"120">("60");
  const [audio, setAudio] = useState<"On"|"Off">("On");
  const [sensitivity, setSensitivity] = useState<"Medium"|"High">("Medium");
  const [language, setLanguage] = useState<"Hindi"|"English">("Hindi");
  const [notifications, setNotifications] = useState<"On"|"Off">("On");
  const [expandedSetting, setExpandedSetting] = useState<string|null>(null);
  const { data: player, isLoading } = useGetCurrentPlayer();
  const { data: lobby } = useGetLobby();

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
    <div className="h-screen w-screen bg-transparent flex flex-col overflow-hidden text-white font-sans">
      <InstallPrompt />

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")', opacity: 0.45 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0d14]/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d14]/70 via-transparent to-[#0a0d14]/70" />
      </div>


      {/* ── TOP-RIGHT ICONS ── */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <button
          onClick={() => setInboxOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg active:scale-90 transition-transform"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(0,210,255,0.35)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 0 10px rgba(0,210,255,0.15)",
          }}>
          <Mail className="w-4 h-4" style={{ color: "#00d4ff", filter: "drop-shadow(0 0 4px rgba(0,212,255,0.7))" }} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg active:scale-90 transition-transform"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(0,210,255,0.35)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 0 10px rgba(0,210,255,0.15)",
          }}>
          <Settings className="w-4 h-4" style={{ color: "#00d4ff", filter: "drop-shadow(0 0 4px rgba(0,212,255,0.7))" }} />
        </button>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* ══ LEFT: LOADOUT DRAWER (Free Fire style) ══ */}

        {/* Backdrop overlay — tap outside to close */}
        {loadoutOpen && (
          <div
            className="absolute inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            onClick={() => setLoadoutOpen(false)}
          />
        )}

        {/* CHARACTER tab button — above loadout */}
        {!loadoutOpen && !charOpen && (
          <button
            onClick={() => setCharOpen(true)}
            className="absolute left-0 z-40 flex flex-row items-center justify-between gap-3 rounded-tr-2xl cursor-pointer select-none"
            style={{
              bottom: "56px",
              width: "148px",
              paddingTop: "9px",
              paddingBottom: "9px",
              paddingLeft: "14px",
              paddingRight: "12px",
              background: "linear-gradient(105deg, rgba(0,0,0,0.75) 0%, rgba(20,0,40,0.85) 60%, rgba(168,85,247,0.12) 100%)",
              border: "1px solid rgba(168,85,247,0.5)",
              borderLeft: "none",
              boxShadow: "6px 0 28px rgba(168,85,247,0.2), inset 0 1px 0 rgba(168,85,247,0.12)",
            }}
          >
            <Users className="w-4 h-4 shrink-0" style={{ color: "#a855f7", filter: "drop-shadow(0 0 5px rgba(168,85,247,0.9))" }} />
            <span className="font-black text-[11px] tracking-[0.22em] uppercase flex-1"
              style={{ color: "#d8b4fe", textShadow: "0 0 10px rgba(168,85,247,0.85)" }}>
              CHARACTER
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 -rotate-90" style={{ color: "#a855f7" }} />
          </button>
        )}

        {/* CHARACTER PANEL — backdrop */}
        {charOpen && (
          <div
            className="absolute inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
            onClick={() => setCharOpen(false)}
          />
        )}

        {/* CHARACTER PANEL — slide-in drawer */}
        <div
          className="absolute left-0 top-0 h-full z-40 flex flex-col"
          style={{
            width: "82vw",
            maxWidth: "340px",
            background: "linear-gradient(180deg, #1a1f2e 0%, #141820 50%, #0f1218 100%)",
            backdropFilter: "blur(20px)",
            borderRight: "2px solid rgba(80,100,140,0.5)",
            boxShadow: charOpen ? "8px 0 40px rgba(0,0,0,0.8)" : "none",
            transform: charOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Tech grid overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(150,180,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(150,180,255,1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "linear-gradient(90deg, rgba(30,40,60,0.9) 0%, rgba(20,28,45,0.9) 100%)",
              borderBottom: "1px solid rgba(80,120,180,0.35)",
            }}>
            {/* Accent bar left */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r"
              style={{ background: "linear-gradient(180deg, #00d4ff 0%, #0066aa 100%)" }} />
            <span className="font-black text-[15px] tracking-[0.12em] text-white pl-2">
              Character List
            </span>
            <button
              onClick={() => setCharOpen(false)}
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <ChevronDown className="w-4 h-4 text-gray-300 rotate-90" />
            </button>
          </div>

          {/* 3-column character grid */}
          <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-3 gap-2.5">
              {CHARACTER_SLOTS.map((slot) => {
                const isSelected = selectedChar === slot.id;
                const borderColor =
                  isSelected
                    ? "#00d4ff"
                    : slot.borderType === "orange"
                    ? "#d97706"
                    : slot.borderType === "cyan"
                    ? "#00d4ff"
                    : "rgba(80,100,130,0.55)";
                const glowColor =
                  isSelected
                    ? "0 0 14px rgba(0,212,255,0.85), 0 0 28px rgba(0,212,255,0.35)"
                    : slot.borderType === "cyan"
                    ? "0 0 10px rgba(0,212,255,0.5)"
                    : slot.borderType === "orange"
                    ? "0 0 10px rgba(217,119,6,0.4)"
                    : "none";

                const isHackerGirl = slot.id === "hacker-girl-1";
                const is3DChar = isHackerGirl;

                return (
                  <button
                    key={slot.id}
                    onClick={() => { setSelectedChar(slot.id); setCharOpen(false); }}
                    className="flex flex-col items-center active:scale-95 transition-transform"
                  >
                    {/* Square card area */}
                    <div
                      className="w-full aspect-square rounded-lg relative overflow-hidden"
                      style={{
                        border: `2px solid ${borderColor}`,
                        boxShadow: isHackerGirl
                          ? "0 0 18px rgba(255,100,200,0.9), 0 0 36px rgba(255,60,180,0.35)"
                          : glowColor,
                        background: isHackerGirl
                          ? "linear-gradient(135deg, #200a18 0%, #0f0510 100%)"
                          : "linear-gradient(135deg, #1c2235 0%, #141820 100%)",
                      }}
                    >
                      {/* Inner panel effect */}
                      <div className="absolute inset-[3px] rounded"
                        style={{ background: "linear-gradient(135deg, rgba(30,40,60,0.6) 0%, rgba(10,14,22,0.8) 100%)", border: "1px solid rgba(80,110,160,0.2)" }} />

                      {/* 3D character indicator (HackerGirl only) */}
                      {is3DChar && (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div style={{ fontSize: 22, filter: "drop-shadow(0 0 8px #ff44cc)" }}>⬡</div>
                          </div>
                          {/* Scanning line */}
                          <div className="absolute inset-x-0 z-10 pointer-events-none"
                            style={{
                              height: "2px",
                              background: "linear-gradient(90deg, transparent, rgba(255,80,200,0.7), transparent)",
                              animation: "scan-line 2s linear infinite",
                            }} />
                          {/* 3D badge */}
                          <div className="absolute top-1 right-1 z-20 px-1 rounded-sm"
                            style={{
                              background: "rgba(255,60,180,0.18)",
                              border: "1px solid rgba(255,60,180,0.7)",
                              fontSize: 7,
                              fontWeight: 900,
                              color: "#ff44cc",
                              letterSpacing: "0.05em",
                              textShadow: "0 0 6px rgba(255,60,180,0.9)",
                              lineHeight: "14px",
                            }}>3D</div>
                        </>
                      )}

                      {/* Corner rivets */}
                      {[["top-1 left-1"],["top-1 right-1"],["bottom-1 left-1"],["bottom-1 right-1"]].map(([pos], i) => (
                        <div key={i} className={`absolute ${pos} w-1.5 h-1.5 rounded-full`}
                          style={{ background: isSelected ? "#00d4ff" : "rgba(100,130,170,0.5)" }} />
                      ))}

                      {/* Selected glow overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 rounded"
                          style={{ background: "radial-gradient(ellipse at center, rgba(0,212,255,0.08) 0%, transparent 70%)" }} />
                      )}
                    </div>

                    {/* Name label */}
                    <span
                      className="mt-1.5 text-center font-bold text-[9px] uppercase tracking-wide leading-tight"
                      style={{
                        color: isSelected
                          ? "#00d4ff"
                          : slot.borderType === "orange"
                          ? "#fbbf24"
                          : "#94a3b8",
                        textShadow: isSelected ? "0 0 8px rgba(0,212,255,0.8)" : "none",
                      }}
                    >
                      {slot.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Horizontal wide tab button (always visible when closed) */}
        {!loadoutOpen && !charOpen && (
          <button
            onClick={() => setLoadoutOpen(true)}
            className="absolute left-0 bottom-0 z-40 flex flex-row items-center justify-between gap-3 rounded-tr-2xl cursor-pointer select-none"
            style={{
              width: "148px",
              paddingTop: "10px",
              paddingBottom: "10px",
              paddingLeft: "14px",
              paddingRight: "12px",
              background: "linear-gradient(105deg, rgba(0,0,0,0.75) 0%, rgba(0,30,50,0.85) 60%, rgba(0,210,255,0.12) 100%)",
              border: "1px solid rgba(0,210,255,0.5)",
              borderLeft: "none",
              boxShadow: "6px 0 28px rgba(0,210,255,0.22), inset 0 1px 0 rgba(0,210,255,0.15), inset 0 -1px 0 rgba(0,210,255,0.08)",
            }}
          >
            {/* Left: icon */}
            <Shield
              className="w-4 h-4 shrink-0"
              style={{ color: "#00d2ff", filter: "drop-shadow(0 0 6px rgba(0,210,255,0.9))" }}
            />

            {/* Center: label */}
            <span
              className="font-black text-[11px] tracking-[0.22em] uppercase flex-1"
              style={{
                color: "#a5f3fc",
                textShadow: "0 0 10px rgba(0,210,255,0.85)",
                letterSpacing: "0.22em",
              }}
            >
              LOADOUT
            </span>

            {/* Right: chevron */}
            <ChevronDown
              className="w-4 h-4 shrink-0 -rotate-90"
              style={{ color: "#00d2ff", filter: "drop-shadow(0 0 4px rgba(0,210,255,0.7))" }}
            />
          </button>
        )}

        {/* Slide-in drawer panel */}
        <div
          className="absolute left-0 top-0 h-full z-40 flex flex-col"
          style={{
            width: "72vw",
            maxWidth: "320px",
            background: "linear-gradient(135deg, rgba(10,13,25,0.97) 0%, rgba(15,10,35,0.97) 100%)",
            backdropFilter: "blur(16px)",
            borderRight: "1px solid rgba(0,210,255,0.3)",
            boxShadow: loadoutOpen ? "8px 0 40px rgba(0,210,255,0.2), 2px 0 12px rgba(0,0,0,0.8)" : "none",
            transform: loadoutOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
            style={{ borderColor: "rgba(0,210,255,0.2)", background: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" style={{ filter: "drop-shadow(0 0 6px rgba(0,210,255,0.8))" }} />
              <span className="font-black text-[12px] tracking-[0.25em] uppercase text-white"
                style={{ textShadow: "0 0 10px rgba(0,210,255,0.6)" }}>
                LOADOUT
              </span>
            </div>
            {/* Close button */}
            <button
              onClick={() => setLoadoutOpen(false)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <ChevronDown className="w-4 h-4 text-gray-300 rotate-90" />
            </button>
          </div>

          {/* GEAR / ABILITIES tabs */}
          <div className="flex border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.15)" }}>
            {(["gear", "abilities"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "text-cyan-300 border-b-2 border-cyan-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
                style={activeTab === tab ? {
                  background: "rgba(0,210,255,0.08)",
                  textShadow: "0 0 8px rgba(0,210,255,0.6)",
                } : {}}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

            {/* WEAPONS label */}
            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
              <Swords className="w-3 h-3 text-cyan-400/70" />
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">WEAPONS</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(0,210,255,0.3), transparent)" }} />
            </div>

            {/* 4x2 weapon grid */}
            <div className="px-2.5 pb-3">
              <div className="grid grid-cols-4 gap-2">
                {WEAPONS.map((w, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 cursor-pointer group">
                    <div className={`w-full aspect-square border rounded-lg flex items-center justify-center relative ${w.border} ${w.bg} ${w.glow} group-hover:scale-110 transition-transform`}>
                      <span className="text-xl leading-none">{w.icon}</span>
                      {w.rarity === "legendary" && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400"
                          style={{ boxShadow: "0 0 4px rgba(249,115,22,0.8)" }} />
                      )}
                    </div>
                    <span className="text-[7px] font-mono text-gray-400 truncate w-full text-center">{w.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-3 border-t" style={{ borderColor: "rgba(0,210,255,0.1)" }} />

            {/* STATS label */}
            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
              <Target className="w-3 h-3 text-purple-400/70" />
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">STATS</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(168,85,247,0.3), transparent)" }} />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-around px-2 py-2">
              <CircleStat value="4.2" label="K/D" color="#4ade80" />
              <CircleStat value="38" label="WIN%" color="#facc15" />
              <CircleStat value="1,247" label="KILLS" color="#a855f7" icon="⚡" />
            </div>

            {/* Divider */}
            <div className="mx-3 border-t" style={{ borderColor: "rgba(0,210,255,0.1)" }} />

            {/* MATCH HISTORY teaser */}
            <div className="px-3 pt-3 pb-1 flex items-center gap-2">
              <Crosshair className="w-3 h-3 text-orange-400/70" />
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">LAST MATCHES</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(249,115,22,0.3), transparent)" }} />
            </div>
            <div className="px-2.5 pb-3 flex flex-col gap-1.5">
              {[
                { map: "Space Heist", kills: 8, rank: "#2", result: "TOP 2", color: "#facc15" },
                { map: "City Hunt",   kills: 5, rank: "#1", result: "WIN",   color: "#4ade80" },
                { map: "Neon Vault",  kills: 3, rank: "#7", result: "TOP 10", color: "#60a5fa" },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <p className="text-[9px] font-bold text-white">{m.map}</p>
                    <p className="text-[7px] font-mono text-gray-500">{m.kills} kills · {m.rank}</p>
                  </div>
                  <span className="text-[9px] font-black" style={{ color: m.color, textShadow: `0 0 8px ${m.color}` }}>
                    {m.result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Squad footer */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderTop: "1px solid rgba(0,210,255,0.15)", background: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-mono text-gray-300 uppercase tracking-wider">
                  Squad {lobby?.currentPlayers ?? 1}/{lobby?.maxPlayers ?? 5}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: lobby?.maxPlayers ?? 5 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full border ${i < (lobby?.currentPlayers ?? 1) ? "bg-cyan-400 border-cyan-400" : "border-white/25"}`}
                    style={i < (lobby?.currentPlayers ?? 1) ? { boxShadow: "0 0 4px rgba(0,210,255,0.7)" } : {}} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ CENTER: CHARACTER ══ */}
        <div className="flex-1 relative flex flex-col items-center overflow-hidden">

          {/* Characters area — full remaining height */}
          <div className="flex-1 w-full relative overflow-hidden">

            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[70%]"
                style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(0,180,255,0.18) 0%, rgba(120,0,255,0.10) 45%, transparent 70%)" }} />
            </div>


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

            {/* MAIN CHARACTER — 3D if selected, else 2D PNG */}
            <div className="absolute inset-0 z-20">

              {selectedChar && (
                <Suspense fallback={null}>
                  <CharacterCanvas characterId={selectedChar} />
                </Suspense>
              )}
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

      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative z-20 flex items-center justify-end px-3 py-2 shrink-0">
        <button
          onClick={() => {}}
          className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-yellow-400 text-white font-black text-[11px] uppercase tracking-[0.12em] rounded-lg shadow-[0_0_20px_rgba(255,136,0,0.45)] border border-orange-400/60 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,136,0,0.7)] active:scale-95 whitespace-nowrap"
        >
          START MISSION
        </button>
      </div>

      {/* ══ INBOX PANEL ══ */}
      {inboxOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setInboxOpen(false)}
          />

          {/* Drawer — slides in from right */}
          <div
            className="fixed top-0 right-0 h-full z-[70] flex flex-col"
            style={{
              width: "82vw",
              maxWidth: "340px",
              background: "linear-gradient(160deg, #090d18 0%, #060a12 100%)",
              borderLeft: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.8), -2px 0 20px rgba(0,212,255,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(0,212,255,0.15)" }}>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" style={{ color: "#00d4ff", filter: "drop-shadow(0 0 5px rgba(0,212,255,0.8))" }} />
                <span className="font-black text-[13px] uppercase tracking-[0.25em]"
                  style={{ color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.7)" }}>
                  INBOX
                </span>
              </div>
              <button onClick={() => setInboxOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg active:scale-90 transition-transform"
                style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)" }}>
                <X className="w-4 h-4" style={{ color: "#00d4ff" }} />
              </button>
            </div>

            {/* Empty state — no messages */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              {/* Glowing mail icon */}
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
                  border: "1px solid rgba(0,212,255,0.15)",
                }}>
                <Mail
                  className="w-9 h-9"
                  style={{ color: "rgba(0,212,255,0.3)", filter: "drop-shadow(0 0 8px rgba(0,212,255,0.2))" }}
                />
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full animate-ping opacity-10"
                  style={{ border: "2px solid rgba(0,212,255,0.5)" }} />
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-black text-[13px] uppercase tracking-[0.2em]"
                  style={{ color: "rgba(0,212,255,0.5)" }}>
                  NO MESSAGES
                </span>
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
                  Your inbox is empty
                </span>
              </div>
            </div>

            {/* Bottom action buttons */}
            <div className="flex items-center gap-2.5 px-4 py-4 shrink-0"
              style={{ borderTop: "1px solid rgba(0,212,255,0.15)" }}>
              {/* Collect Reward — left */}
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-[0.12em] active:scale-95 transition-all"
                style={{
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.35)",
                  color: "#00d4ff",
                  textShadow: "0 0 8px rgba(0,212,255,0.5)",
                  boxShadow: "0 0 10px rgba(0,212,255,0.08)",
                }}>
                <Diamond className="w-3 h-3" style={{ color: "#00d4ff" }} />
                COLLECT REWARD
              </button>

              {/* Collect All Rewards — right */}
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-[0.12em] active:scale-95 transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(249,115,22,0.85) 0%, rgba(234,179,8,0.85) 100%)",
                  border: "1px solid rgba(249,115,22,0.6)",
                  color: "#fff",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  boxShadow: "0 0 14px rgba(249,115,22,0.35)",
                }}>
                <Coins className="w-3 h-3" style={{ color: "#fef08a" }} />
                COLLECT ALL
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ SETTINGS PANEL ══ */}
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setSettingsOpen(false)}
          />

          {/* Drawer — slides in from right */}
          <div
            className="fixed top-0 right-0 h-full z-[70] flex flex-col"
            style={{
              width: "80vw",
              maxWidth: "320px",
              background: "linear-gradient(160deg, #090d18 0%, #060a12 100%)",
              borderLeft: "1px solid rgba(0,212,255,0.25)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.8), -2px 0 20px rgba(0,212,255,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(0,212,255,0.15)" }}>
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" style={{ color: "#00d4ff", filter: "drop-shadow(0 0 5px rgba(0,212,255,0.8))" }} />
                <span className="font-black text-[13px] uppercase tracking-[0.25em]"
                  style={{ color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.7)" }}>
                  SETTINGS
                </span>
              </div>
              <button onClick={() => setSettingsOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg active:scale-90 transition-transform"
                style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)" }}>
                <X className="w-4 h-4" style={{ color: "#00d4ff" }} />
              </button>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-2">

              {/* ── FPS ── */}
              {(() => {
                const open = expandedSetting === "fps";
                return (
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetting(open ? null : "fps")}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                          <Gauge className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/90 tracking-wide">FPS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "rgba(0,212,255,0.7)" }}>{fps} FPS</span>
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none" }} />
                      </div>
                    </button>
                    {open && (
                      <div className="flex gap-2 px-5 pb-3.5">
                        {(["60","90","120"] as const).map(v => (
                          <button key={v} onClick={() => setFps(v)}
                            className="flex-1 py-2 rounded-lg text-[12px] font-black tracking-wider transition-all active:scale-95"
                            style={{
                              background: fps === v ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
                              border: fps === v ? "1px solid rgba(0,212,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
                              color: fps === v ? "#00d4ff" : "#94a3b8",
                              boxShadow: fps === v ? "0 0 10px rgba(0,212,255,0.25)" : "none",
                            }}>{v}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Audio ── */}
              {(() => {
                const open = expandedSetting === "audio";
                return (
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetting(open ? null : "audio")}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/90 tracking-wide">Audio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: audio === "On" ? "rgba(0,212,255,0.7)" : "rgba(255,255,255,0.3)" }}>{audio}</span>
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none" }} />
                      </div>
                    </button>
                    {open && (
                      <div className="flex gap-2 px-5 pb-3.5">
                        {(["On","Off"] as const).map(v => (
                          <button key={v} onClick={() => setAudio(v)}
                            className="flex-1 py-2 rounded-lg text-[12px] font-black tracking-wider transition-all active:scale-95"
                            style={{
                              background: audio === v ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
                              border: audio === v ? "1px solid rgba(0,212,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
                              color: audio === v ? "#00d4ff" : "#94a3b8",
                              boxShadow: audio === v ? "0 0 10px rgba(0,212,255,0.25)" : "none",
                            }}>{v}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Sensitivity ── */}
              {(() => {
                const open = expandedSetting === "sensitivity";
                return (
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetting(open ? null : "sensitivity")}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                          <Sliders className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/90 tracking-wide">Sensitivity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "rgba(0,212,255,0.7)" }}>{sensitivity}</span>
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none" }} />
                      </div>
                    </button>
                    {open && (
                      <div className="flex gap-2 px-5 pb-3.5">
                        {(["Medium","High"] as const).map(v => (
                          <button key={v} onClick={() => setSensitivity(v)}
                            className="flex-1 py-2 rounded-lg text-[12px] font-black tracking-wider transition-all active:scale-95"
                            style={{
                              background: sensitivity === v ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
                              border: sensitivity === v ? "1px solid rgba(0,212,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
                              color: sensitivity === v ? "#00d4ff" : "#94a3b8",
                              boxShadow: sensitivity === v ? "0 0 10px rgba(0,212,255,0.25)" : "none",
                            }}>{v}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Language ── */}
              {(() => {
                const open = expandedSetting === "language";
                return (
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetting(open ? null : "language")}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/90 tracking-wide">Language</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "rgba(0,212,255,0.7)" }}>{language}</span>
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none" }} />
                      </div>
                    </button>
                    {open && (
                      <div className="flex gap-2 px-5 pb-3.5">
                        {(["Hindi","English"] as const).map(v => (
                          <button key={v} onClick={() => setLanguage(v)}
                            className="flex-1 py-2 rounded-lg text-[12px] font-black tracking-wider transition-all active:scale-95"
                            style={{
                              background: language === v ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
                              border: language === v ? "1px solid rgba(0,212,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
                              color: language === v ? "#00d4ff" : "#94a3b8",
                              boxShadow: language === v ? "0 0 10px rgba(0,212,255,0.25)" : "none",
                            }}>{v}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Notifications ── */}
              {(() => {
                const open = expandedSetting === "notifications";
                return (
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetting(open ? null : "notifications")}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/90 tracking-wide">Notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: notifications === "On" ? "rgba(0,212,255,0.7)" : "rgba(255,255,255,0.3)" }}>{notifications}</span>
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none" }} />
                      </div>
                    </button>
                    {open && (
                      <div className="flex gap-2 px-5 pb-3.5">
                        {(["On","Off"] as const).map(v => (
                          <button key={v} onClick={() => setNotifications(v)}
                            className="flex-1 py-2 rounded-lg text-[12px] font-black tracking-wider transition-all active:scale-95"
                            style={{
                              background: notifications === v ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.05)",
                              border: notifications === v ? "1px solid rgba(0,212,255,0.7)" : "1px solid rgba(255,255,255,0.1)",
                              color: notifications === v ? "#00d4ff" : "#94a3b8",
                              boxShadow: notifications === v ? "0 0 10px rgba(0,212,255,0.25)" : "none",
                            }}>{v}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Privacy */}
              <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                    style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-semibold text-white/90 tracking-wide">Privacy</span>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
              </button>

              {/* About */}
              <button className="w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                    style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-semibold text-white/90 tracking-wide">About</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: "rgba(0,212,255,0.5)" }}>v1.0.0</span>
                  <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                </div>
              </button>

              {/* Logout — red accent */}
              <button
                className="w-full flex items-center gap-3 px-5 py-3.5 mt-2 active:bg-red-950/30 transition-colors"
                style={{ borderTop: "1px solid rgba(255,60,60,0.15)" }}>
                <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                  style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", color: "#f87171" }}>
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-semibold tracking-wide" style={{ color: "#f87171" }}>
                  Logout
                </span>
              </button>
            </div>

            {/* Bottom accent line */}
            <div className="h-0.5 shrink-0"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)" }} />
          </div>
        </>
      )}
    </div>
  );
}
