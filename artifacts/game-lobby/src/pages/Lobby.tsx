import React from "react";
import { useLocation } from "wouter";
import { useGetCurrentPlayer, useGetLobby, useGetLobbySlots } from "@workspace/api-client-react";
import { ChevronLeft, MessageSquare, Plus, Diamond, Coins, Hexagon, Shield, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { data: player, isLoading: playerLoading } = useGetCurrentPlayer();
  const { data: lobby, isLoading: lobbyLoading } = useGetLobby();
  const { data: slots, isLoading: slotsLoading } = useGetLobbySlots();

  if (playerLoading || lobbyLoading || slotsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-cyan-400 font-mono text-xl tracking-widest">INITIALIZING SYSTEMS...</div>
      </div>
    );
  }

  const handleMatchmaking = () => {
    setLocation("/matchmaking");
  };

  const handleCharacterSelect = () => {
    setLocation("/character");
  };

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden p-2 lg:p-4">
      {/* Container: Full screen on mobile, 16:9 on desktop */}
      <div className="relative w-full h-full lg:aspect-[16/9] lg:max-h-[90vh] lg:max-w-[160vh] overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30 shadow-2xl border border-white/5">
        
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_bottom,rgba(180,0,255,0.15)_0%,transparent_60%)]" />

        {/* Content Layout - Flexbox for proper positioning */}
        <div className="relative z-10 h-full flex flex-col">
          
          {/* Header Bar */}
          <div className="flex justify-between items-start p-3 lg:p-4 shrink-0">
            {/* Left: Title */}
            <div className="flex items-center gap-2 lg:gap-3">
              <Button variant="ghost" size="icon" className="text-white hover:text-cyan-400 hover:bg-white/5 border border-white/10 glass-panel h-8 w-8 shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-base lg:text-xl font-bold tracking-tighter text-white uppercase neon-text-cyan whitespace-nowrap">
                  PRE-GAME LOBBY
                </h1>
                <div className="text-cyan-400/70 font-mono text-[10px] lg:text-xs tracking-widest uppercase flex items-center gap-2 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shrink-0" />
                  <span className="hidden sm:inline">SERVER: N-AMER-01 // PING: 24MS</span>
                  <span className="sm:hidden">N-AMER-01 // 24MS</span>
                </div>
                <div className="mt-1 text-[8px] lg:text-[10px] font-mono text-yellow-400/80 tracking-wider italic">
                  SYSTEM: ONLINE
                </div>
                {/* Text 1 - Android FPS Style */}
                <div className="mt-1 text-[8px] lg:text-[10px] font-mono text-red-500 animate-pulse tracking-wider font-bold bg-red-500/10 px-1 py-0.5 rounded inline-block">
                  ⚠️ FPS LOW // UR NOT AUTO (ohh actuall ohh eee)
                </div>
                {/* Text 2 - Hindi Style */}
                <div className="mt-1 text-[8px] lg:text-[10px] font-mono text-green-400/80 tracking-wider">
                  A B C D E F (a b c d e f kho dikaha)
                </div>
                {/* Text 3 - Loud Tool Mode */}
                <div className="mt-1 text-[8px] lg:text-[10px] font-mono text-purple-400/80 tracking-wider italic bg-purple-500/10 px-1 py-0.5 rounded inline-block">
                  🎧 LOUD TOOL MODE: ON (Bass full hai!)
                </div>
              </div>
            </div>

            {/* Right: Currency */}
            <div className="flex items-center gap-2 lg:gap-3 glass-panel px-2 lg:px-4 py-1.5 lg:py-2 rounded-none skew-x-[-10deg]">
              <div className="flex items-center gap-1 skew-x-[10deg]">
                <Coins className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-400" />
                <span className="font-mono text-xs lg:text-sm font-bold">{player?.gold?.toLocaleString() || '0'}</span>
              </div>
              <div className="w-px h-3 lg:h-4 bg-white/20 skew-x-[10deg]" />
              <div className="flex items-center gap-1 skew-x-[10deg]">
                <Diamond className="h-3 w-3 lg:h-4 lg:w-4 text-cyan-400" />
                <span className="font-mono text-xs lg:text-sm font-bold">{player?.diamonds?.toLocaleString() || '0'}</span>
              </div>
              <div className="w-px h-3 lg:h-4 bg-white/20 skew-x-[10deg]" />
              <div className="flex items-center gap-1 skew-x-[10deg]">
                <Hexagon className="h-3 w-3 lg:h-4 lg:w-4 text-purple-400" />
                <span className="font-mono text-xs lg:text-sm font-bold">{player?.tokens?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          {/* Main Content - Center */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
            
            {/* Player Profile */}
            <div className="flex flex-col items-center gap-1 mb-2 lg:mb-4 animate-float shrink-0">
              <div className="glass-panel px-4 lg:px-6 py-1.5 lg:py-2 border-t-2 border-t-cyan-500 border-b-2 border-b-purple-500">
                <h2 className="text-lg lg:text-xl font-bold tracking-widest text-center uppercase neon-text-purple">
                  {player?.username || "UNKNOWN_USER"}
                </h2>
                <div className="flex items-center justify-center gap-2 text-[10px] lg:text-xs font-mono text-gray-400 mt-1">
                  <span className="text-cyan-400">LVL {player?.level || 1}</span>
                  <span>//</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-purple-400"/> {player?.rank || "UNRANKED"}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="text-[10px] lg:text-xs font-mono text-white/50 hover:text-cyan-400 hover:bg-transparent py-1 h-auto"
                onClick={handleCharacterSelect}
              >
                [ CHANGE LOADOUT ]
              </Button>
            </div>

            {/* Character Model */}
            <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
              <div className="absolute bottom-[10%] w-[150px] lg:w-[200px] h-[30px] lg:h-[40px] bg-cyan-500/20 blur-[40px] rounded-[100%]" />
              <img 
                src="/assets/character-model.png" 
                alt="Character" 
                className="h-[85%] lg:h-[90%] w-auto max-w-[80%] object-contain filter drop-shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-hologram"
              />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="shrink-0 flex flex-col gap-2 lg:gap-4">
            
            {/* Squad Slots */}
            <div className="flex justify-center items-end gap-2 lg:gap-4 px-2 lg:px-4">
              {slots?.map((slot, idx) => (
                <div key={slot.id || idx} className="flex flex-col items-center gap-1">
                  {slot.status === 'occupied' ? (
                    <div className="w-16 lg:w-24 h-24 lg:h-32 border border-cyan-500/50 glass-panel flex flex-col items-center justify-end pb-2 bg-cyan-900/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/80 to-transparent z-0" />
                      <User className="w-6 h-6 lg:w-8 lg:h-8 text-cyan-500/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      <div className="relative z-10 flex flex-col items-center">
                        <span className="font-bold text-[10px] lg:text-xs text-cyan-400 uppercase">{player?.username?.substring(0,8) || "PLAYER"}</span>
                        <span className="font-mono text-[10px] lg:text-xs text-cyan-400/70">LVL {player?.level || 1}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 lg:w-24 h-24 lg:h-32 border border-white/10 glass-panel flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-cyan-400/60 group-hover:scale-110 transition-all bg-black/30 backdrop-blur-sm">
                        <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <span className="mt-1 lg:mt-2 font-mono text-[10px] lg:text-xs text-white/40 group-hover:text-cyan-400/80 transition-colors tracking-wider">INVITE</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-end px-2 lg:px-4 pb-2 lg:pb-4 gap-2 lg:gap-4">
              {/* Left: Squad Info */}
              <div className="glass-panel p-2 lg:p-3 w-32 lg:w-40 border-l-4 border-l-cyan-500 shrink-0">
                <h3 className="font-bold text-xs lg:text-sm text-white mb-1 uppercase">CURRENT SQUAD</h3>
                <div className="flex items-center gap-2 text-[10px] lg:text-xs text-gray-400 font-mono">
                  <Users className="w-3 h-3" />
                  <span>{lobby?.currentPlayers || 1} / {lobby?.maxPlayers || 5} MEMBERS</span>
                </div>
              </div>

              {/* Center: Matchmaking Button */}
              <div className="flex flex-col items-center gap-1 lg:gap-2 flex-1 justify-end">
                <Button 
                  size="lg" 
                  className="h-10 lg:h-14 px-6 lg:px-12 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-base lg:text-xl tracking-widest uppercase rounded-none skew-x-[-15deg] shadow-[0_0_20px_rgba(255,136,0,0.5)] border-2 border-orange-400/50 transition-all hover:scale-105 active:scale-95 animate-pulse-glow"
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

              {/* Right: Chat */}
              <div className="glass-panel p-2 lg:p-3 flex items-center gap-2 w-32 lg:w-48 cursor-pointer hover:bg-white/5 transition-colors border-r-4 border-r-purple-500 shrink-0">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 font-mono text-[10px] lg:text-xs hidden lg:inline">Enter via message...</span>
                <span className="text-gray-400 font-mono text-[10px] lg:hidden">Chat...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
