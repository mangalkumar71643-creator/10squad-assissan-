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
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
        style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(180,0,255,0.1)_0%,transparent_70%)]" />

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:text-cyan-400 hover:bg-white/5 border border-white/10 glass-panel">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-white uppercase neon-text-cyan" data-text="PRE-GAME LOBBY">
              PRE-GAME LOBBY
            </h1>
            <div className="text-cyan-400/70 font-mono text-sm tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              SERVER: N-AMER-01 // PING: 24MS
            </div>
          </div>
        </div>

        {/* Currency/Resources */}
        <div className="flex items-center gap-4 glass-panel px-6 py-3 rounded-none skew-x-[-10deg]">
          <div className="flex items-center gap-2 skew-x-[10deg]">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="font-mono text-lg font-bold">{player?.gold?.toLocaleString() || '0'}</span>
          </div>
          <div className="w-px h-6 bg-white/20 skew-x-[10deg]" />
          <div className="flex items-center gap-2 skew-x-[10deg]">
            <Diamond className="h-5 w-5 text-cyan-400" />
            <span className="font-mono text-lg font-bold">{player?.diamonds?.toLocaleString() || '0'}</span>
          </div>
          <div className="w-px h-6 bg-white/20 skew-x-[10deg]" />
          <div className="flex items-center gap-2 skew-x-[10deg]">
            <Hexagon className="h-5 w-5 text-purple-400" />
            <span className="font-mono text-lg font-bold">{player?.tokens?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full h-full flex flex-col items-center justify-center z-10 pt-20">
        
        {/* Player Profile Card floating above character */}
        <div className="absolute top-1/4 -translate-y-1/2 flex flex-col items-center gap-2 animate-float">
          <div className="glass-panel px-8 py-3 rounded-none border-t-2 border-t-cyan-500 border-b-2 border-b-purple-500">
            <h2 className="text-3xl font-bold tracking-widest text-center uppercase neon-text-purple">
              {player?.username || "UNKNOWN_USER"}
            </h2>
            <div className="flex items-center justify-center gap-3 text-sm font-mono text-gray-400 mt-1">
              <span className="text-cyan-400">LVL {player?.level || 1}</span>
              <span>//</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-purple-400"/> {player?.rank || "UNRANKED"}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="text-xs font-mono text-white/50 hover:text-cyan-400 hover:bg-transparent"
            onClick={handleCharacterSelect}
          >
            [ CHANGE LOADOUT ]
          </Button>
        </div>

        {/* Character Model */}
        <div className="relative h-[600px] w-full flex items-center justify-center mt-10">
          <div className="absolute bottom-0 w-[500px] h-[100px] bg-cyan-500/20 blur-[50px] rounded-[100%]" />
          <img 
            src="/assets/character-model.png" 
            alt="Character" 
            className="h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-hologram"
          />
        </div>

        {/* Squad Slots */}
        <div className="absolute bottom-40 w-full flex justify-center items-end gap-24 px-12">
          {slots?.map((slot, idx) => (
            <div key={slot.id || idx} className="flex flex-col items-center gap-4">
              {slot.status === 'occupied' && slot.player ? (
                <OccupiedSlot playerId={slot.player.id} />
              ) : (
                <div className="w-32 h-64 border border-white/10 glass-panel flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group neon-border-purple">
                  <div className="w-12 h-12 rounded-full border border-purple-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-purple-500/10">
                    <Plus className="w-6 h-6 text-purple-400 group-hover:text-cyan-400" />
                  </div>
                  <span className="mt-4 font-mono text-xs text-purple-400/70 group-hover:text-cyan-400">INVITE</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-12 w-full flex justify-between items-end px-12">
          {/* Left info area */}
          <div className="glass-panel p-4 w-64 border-l-4 border-l-cyan-500">
            <h3 className="font-bold text-lg text-white mb-1 uppercase">CURRENT SQUAD</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
              <Users className="w-4 h-4" />
              <span>{lobby?.currentPlayers || 1} / {lobby?.maxPlayers || 5} MEMBERS</span>
            </div>
          </div>

          {/* Center Matchmaking Button */}
          <div className="flex flex-col items-center gap-4">
            <Button 
              size="lg" 
              className="h-20 px-24 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-3xl tracking-widest uppercase rounded-none skew-x-[-15deg] shadow-[0_0_20px_rgba(255,136,0,0.5)] border-2 border-orange-400/50 transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
              onClick={handleMatchmaking}
            >
              <span className="skew-x-[15deg]">MATCHMAKING</span>
            </Button>
            <div className="flex gap-2">
              <span className="w-1 h-1 bg-orange-500" />
              <span className="w-1 h-1 bg-orange-500/50" />
              <span className="w-1 h-1 bg-orange-500/20" />
            </div>
          </div>

          {/* Right Chat Area */}
          <div className="glass-panel p-4 flex items-center gap-3 w-80 cursor-pointer hover:bg-white/5 transition-colors border-r-4 border-r-purple-500">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 font-mono text-sm">Enter via message...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
