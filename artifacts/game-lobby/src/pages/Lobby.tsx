import React from "react";
import { useLocation, Link } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots, useGetPlayerById } from "@workspace/api-client-react";
import { ChevronLeft, MessageSquare, Plus, Diamond, Coins, Hexagon, Shield, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";

function OccupiedSlot({ playerId }: { playerId: string }) {
  const { data: player, isLoading } = useGetPlayerById(playerId);
  
  if (isLoading) {
    return (
      <div className="w-32 h-64 border border-cyan-500/30 glass-panel flex flex-col items-center justify-center bg-cyan-900/20">
        <div className="animate-pulse w-8 h-8 rounded-full border-t-2 border-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-32 h-64 border border-cyan-500/50 glass-panel flex flex-col items-center justify-end pb-4 bg-cyan-900/20 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 to-transparent z-0" />
      {/* Fake character silhouette for teammate */}
      <User className="w-16 h-16 text-cyan-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-bold text-sm text-cyan-400 uppercase">{player?.username || "PLAYER"}</span>
        <span className="font-mono text-xs text-cyan-400/70">LVL {player?.level || 1}</span>
      </div>
    </div>
  );
}

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { data: player, isLoading: playerLoading } = useGetCurrentPlayer();
  const { data: lobby, isLoading: lobbyLoading } = useGetLobby();
  const { data: slots, isLoading: slotsLoading } = useGetLobbySlots();

  if (playerLoading || lobbyLoading || slotsLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-black"><div className="animate-pulse text-cyan-400 font-mono text-xl tracking-widest">INITIALIZING SYSTEMS...</div></div>;
  }

  const handleMatchmaking = () => {
    setLocation("/matchmaking");
  };

  const handleCharacterSelect = () => {
    setLocation("/character");
  };

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden p-2">
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full max-w-[1280px] aspect-[16/9] overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30 shadow-2xl border border-white/5">
        {/* Background with overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")', backgroundPosition: 'center 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_bottom,rgba(180,0,255,0.15)_0%,transparent_60%)]" />

        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:text-cyan-400 hover:bg-white/5 border border-white/10 glass-panel h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-white uppercase neon-text-cyan" data-text="PRE-GAME LOBBY">
                PRE-GAME LOBBY
              </h1>
              <div className="text-cyan-400/70 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                SERVER: N-AMER-01 // PING: 24MS
              </div>
            </div>
          </div>

          {/* Currency/Resources */}
          <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-none skew-x-[-10deg] scale-90">
            <div className="flex items-center gap-1.5 skew-x-[10deg]">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="font-mono text-sm font-bold">{player?.gold?.toLocaleString() || '0'}</span>
            </div>
            <div className="w-px h-4 bg-white/20 skew-x-[10deg]" />
            <div className="flex items-center gap-1.5 skew-x-[10deg]">
              <Diamond className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-sm font-bold">{player?.diamonds?.toLocaleString() || '0'}</span>
            </div>
            <div className="w-px h-4 bg-white/20 skew-x-[10deg]" />
            <div className="flex items-center gap-1.5 skew-x-[10deg]">
              <Hexagon className="h-4 w-4 text-purple-400" />
              <span className="font-mono text-sm font-bold">{player?.tokens?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative w-full h-full flex flex-col items-center justify-center z-10 pt-12">
          
          {/* Player Profile Card floating above character */}
          <div className="absolute top-[15%] flex flex-col items-center gap-1 animate-float">
            <div className="glass-panel px-6 py-2 rounded-none border-t-2 border-t-cyan-500 border-b-2 border-b-purple-500">
              <h2 className="text-2xl font-bold tracking-widest text-center uppercase neon-text-purple">
                {player?.username || "UNKNOWN_USER"}
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-gray-400 mt-1">
                <span className="text-cyan-400">LVL {player?.level || 1}</span>
                <span>//</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-purple-400"/> {player?.rank || "UNRANKED"}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-xs font-mono text-white/50 hover:text-cyan-400 hover:bg-transparent py-1 h-auto"
              onClick={handleCharacterSelect}
            >
              [ CHANGE LOADOUT ]
            </Button>
          </div>

          {/* Character Model */}
          <div className="relative h-[45%] w-full flex items-end justify-center mt-4">
            <div className="absolute bottom-0 w-[250px] h-[50px] bg-cyan-500/20 blur-[40px] rounded-[100%]" />
            <img 
              src="/assets/character-model.png" 
              alt="Character" 
              className="h-[85%] object-contain filter drop-shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-hologram"
            />
          </div>

          {/* Squad Slots */}
          <div className="absolute bottom-[18%] w-full flex justify-center items-end gap-8 px-8">
            {slots?.map((slot, idx) => (
              <div key={slot.id || idx} className="flex flex-col items-center gap-2">
                {slot.status === 'occupied' && slot.player ? (
                  <div className="w-24 h-40 border border-cyan-500/50 glass-panel flex flex-col items-center justify-end pb-2 bg-cyan-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 to-transparent z-0" />
                    <User className="w-12 h-12 text-cyan-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10 flex flex-col items-center">
                      <span className="font-bold text-xs text-cyan-400 uppercase">{player?.username || "PLAYER"}</span>
                      <span className="font-mono text-xs text-cyan-400/70">LVL {player?.level || 1}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-40 border border-white/10 glass-panel flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-cyan-400/60 group-hover:scale-110 transition-all bg-black/30 backdrop-blur-sm">
                      <Plus className="w-6 h-6 text-white/50 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <span className="mt-3 font-mono text-xs text-white/40 group-hover:text-cyan-400/80 transition-colors tracking-wider">INVITE</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="absolute bottom-4 w-full flex justify-between items-end px-6">
            {/* Left info area */}
            <div className="glass-panel p-3 w-48 border-l-4 border-l-cyan-500">
              <h3 className="font-bold text-sm text-white mb-1 uppercase">CURRENT SQUAD</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                <Users className="w-3 h-3" />
                <span>{lobby?.currentPlayers || 1} / {lobby?.maxPlayers || 5} MEMBERS</span>
              </div>
            </div>

            {/* Center Matchmaking Button */}
            <div className="flex flex-col items-center gap-2">
              <Button 
                size="lg" 
                className="h-14 px-16 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-2xl tracking-widest uppercase rounded-none skew-x-[-15deg] shadow-[0_0_20px_rgba(255,136,0,0.5)] border-2 border-orange-400/50 transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
                onClick={handleMatchmaking}
              >
                <span className="skew-x-[15deg]">MATCHMAKING</span>
              </Button>
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-orange-500" />
                <span className="w-1 h-1 bg-orange-500/50" />
                <span className="w-1 h-1 bg-orange-500/20" />
              </div>
            </div>

            {/* Right Chat Area */}
            <div className="glass-panel p-3 flex items-center gap-2 w-56 cursor-pointer hover:bg-white/5 transition-colors border-r-4 border-r-purple-500">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 font-mono text-xs">Enter via message...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
