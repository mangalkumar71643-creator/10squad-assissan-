import { useState } from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";
import {
  ChevronDown, Diamond, Coins,
  Settings, Mail,
  Gauge, Volume2, Sliders, Globe, Bell, Lock, Info, LogOut, ChevronRight, X
} from "lucide-react";

export default function Lobby() {
  const [, setLocation] = useLocation();
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
      <div
        className="absolute top-0 right-3 z-50 flex items-center gap-[60px]"
        style={{
          background: "rgba(0,0,0,0.25)",
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px))",
          padding: "0px 10px 8px 15px",
        }}
      >
        {/* Diamond + Gold currency */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" style={{ position: "relative", left: "-200px" }}>
            <span style={{ fontSize: "14px", display: "inline-block", transform: "rotate(30deg)" }}>💎</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "11px", color: "#00d4ff", textShadow: "0 0 6px rgba(0,212,255,0.8)" }}>{player?.diamonds ?? 0}</span>
          </div>
          <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.15)" }} />
          <div className="flex items-center gap-1">
            <span style={{ fontSize: "16px" }}>🪙</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "11px", color: "#f0c040", textShadow: "0 0 6px rgba(240,192,64,0.8)" }}>{player?.gold ?? 0}</span>
          </div>
        </div>

        {/* Email + Settings with divider */}
        <div className="flex items-center">
          <button
            onClick={() => setInboxOpen(true)}
            className="flex items-center justify-center w-9 h-7 active:scale-90 transition-transform"
          >
            <Mail className="w-4 h-4" style={{ color: "#00d4ff" }} />
          </button>
          <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center w-9 h-7 active:scale-90 transition-transform"
          >
            <Settings className="w-4 h-4" style={{ color: "#00d4ff" }} />
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* ══ CENTER ══ */}
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

      {/* ── PLAYER ID CARD — top-left ── */}
      <div
        className="absolute z-50 flex items-center"
        style={{ left: "4px", gap: "5px", top: "2px" }}
      >
        {/* Box 1 — Profile Icon + Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            background: "rgba(5,15,30,0.82)",
            border: "1.5px solid rgba(0,210,255,0.35)",
            borderRadius: "0 0 6px 6px",
            height: "28px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(0,20,50,0.9)",
              borderRight: "1.5px solid rgba(0,210,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="10" r="6" fill="rgba(0,210,255,0.15)" stroke="rgba(0,210,255,0.6)" strokeWidth="1"/>
              <ellipse cx="16" cy="10" rx="3.5" ry="4" fill="rgba(180,200,220,0.7)"/>
              <path d="M5 30 Q6 18 16 17 Q26 18 27 30Z" fill="rgba(0,210,255,0.12)" stroke="rgba(0,210,255,0.5)" strokeWidth="1"/>
              <path d="M8 20 Q10 15 16 14 Q22 15 24 20 Q20 19 16 19 Q12 19 8 20Z" fill="rgba(0,180,255,0.25)"/>
            </svg>
          </div>
          <div style={{ padding: "0 10px", display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: "13px",
                letterSpacing: "0.12em",
                color: "#ffffff",
                textShadow: "0 0 10px rgba(0,210,255,0.7)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {player?.username ?? "PLAYER_01"}
            </span>
          </div>
        </div>


        {/* Box 3 — Level Badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "7px", fontWeight: 700, color: "rgba(0,210,255,0.9)", letterSpacing: "0.05em", lineHeight: 1 }}>LVL</span>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, textShadow: "0 0 8px rgba(0,210,255,0.8)" }}>
            {player?.level ?? 1}
          </span>
        </div>
      </div>

      {/* ── CHARACTER BUTTON — left side ── */}
      <div
        className="absolute z-50"
        style={{ left: 0, top: "132px" }}
      >
        <button
          onClick={() => setLocation("/character")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(10,5,30,0.88)",
            border: "1.5px solid rgba(140,80,255,0.7)",
            borderLeft: "none",
            borderRadius: "0 10px 10px 0",
            padding: "0 8px 0 8px",
            height: "35px",
            width: "100px",
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(140,80,255,0.35), inset 0 0 12px rgba(140,80,255,0.08)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 28px rgba(140,80,255,0.7), inset 0 0 16px rgba(140,80,255,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 18px rgba(140,80,255,0.35), inset 0 0 12px rgba(140,80,255,0.08)")}
        >
          {/* People icon */}
          <svg width="12" height="12" viewBox="0 0 32 28" fill="none">
            <circle cx="12" cy="8" r="5" stroke="rgba(160,100,255,0.9)" strokeWidth="1.8" fill="rgba(140,80,255,0.15)"/>
            <path d="M2 26 Q3 16 12 15 Q21 16 22 26" stroke="rgba(160,100,255,0.9)" strokeWidth="1.8" fill="rgba(140,80,255,0.1)" strokeLinecap="round"/>
            <circle cx="23" cy="7" r="4" stroke="rgba(160,100,255,0.7)" strokeWidth="1.5" fill="rgba(140,80,255,0.1)"/>
            <path d="M18 26 Q18.5 18 23 17 Q28 18 30 26" stroke="rgba(160,100,255,0.7)" strokeWidth="1.5" fill="rgba(140,80,255,0.08)" strokeLinecap="round"/>
          </svg>
          {/* Text */}
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "rgba(190,140,255,0.95)",
              textShadow: "0 0 12px rgba(160,100,255,0.9)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            CHARACTER
          </span>
          {/* Arrow */}
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ marginLeft: "4px" }}>
            <path d="M1 1 L7 7 L1 13" stroke="rgba(160,100,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── WEAPON BUTTON — left side, below CHARACTER ── */}
      <div
        className="absolute z-50"
        style={{ left: 0, top: "175px" }}
      >
        <button
          onClick={() => setLocation("/weapon")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(30,8,5,0.88)",
            border: "1.5px solid rgba(255,100,30,0.7)",
            borderLeft: "none",
            borderRadius: "0 10px 10px 0",
            padding: "0 8px 0 8px",
            height: "35px",
            width: "100px",
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(255,100,30,0.35), inset 0 0 12px rgba(255,100,30,0.08)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 28px rgba(255,100,30,0.7), inset 0 0 16px rgba(255,100,30,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 18px rgba(255,100,30,0.35), inset 0 0 12px rgba(255,100,30,0.08)")}
        >
          {/* Gun icon */}
          <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="12" width="16" height="8" rx="2" stroke="rgba(255,120,50,0.9)" strokeWidth="1.8" fill="rgba(255,100,30,0.15)"/>
            <rect x="18" y="13" width="10" height="3" rx="1" stroke="rgba(255,120,50,0.9)" strokeWidth="1.5" fill="rgba(255,100,30,0.1)"/>
            <rect x="8" y="20" width="5" height="5" rx="1" stroke="rgba(255,120,50,0.7)" strokeWidth="1.5" fill="rgba(255,100,30,0.1)"/>
            <circle cx="6" cy="16" r="2" fill="rgba(255,120,50,0.5)"/>
          </svg>
          {/* Text */}
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "rgba(255,160,100,0.95)",
              textShadow: "0 0 12px rgba(255,100,30,0.9)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            WEAPON
          </span>
          {/* Arrow */}
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ marginLeft: "4px" }}>
            <path d="M1 1 L7 7 L1 13" stroke="rgba(255,120,50,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
