import React from "react";
import { useLocation } from "wouter";
import { useGetPlayerCharacters, useGetCurrentPlayer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lock, Star, Zap } from "lucide-react";

export default function CharacterSelect() {
  const [, setLocation] = useLocation();
  const { data: characters, isLoading: charactersLoading } = useGetPlayerCharacters();
  const { data: player } = useGetCurrentPlayer();

  if (charactersLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-black"><div className="animate-pulse text-cyan-400 font-mono text-xl tracking-widest">LOADING ARSENAL...</div></div>;
  }

  const handleBack = () => {
    setLocation("/lobby");
  };

  const rarityColors = {
    common: "border-gray-500 text-gray-400",
    rare: "border-cyan-500 text-cyan-400",
    epic: "border-purple-500 text-purple-400",
    legendary: "border-yellow-500 text-yellow-400",
  };

  return (
    <div className="relative h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-white hover:text-cyan-400 hover:bg-white/5 border border-white/10 glass-panel">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold tracking-widest text-white uppercase neon-text-cyan">
            SELECT OPERATIVE
          </h1>
        </div>
      </div>

      <div className="relative z-10 w-full h-full flex pt-28 pb-12 px-12 gap-8">
        {/* Main Focus Area (Selected Character) */}
        <div className="flex-1 glass-panel border-t-2 border-t-cyan-500 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05)_0%,transparent_60%)]" />
          
          <img 
            src="/assets/character-model.png" 
            alt="Selected Character"
            className="h-[80%] object-contain filter drop-shadow-[0_0_20px_rgba(0,255,255,0.4)] z-10"
          />
          
          <div className="absolute bottom-12 text-center z-20">
            <h2 className="text-5xl font-bold tracking-widest uppercase neon-text-cyan mb-2">
              PROJECT 10
            </h2>
            <div className="flex items-center justify-center gap-4 text-cyan-400 font-mono">
              <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> ASSAULT</span>
              <span>//</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-purple-400" /> ELITE TIER</span>
            </div>
            
            <Button className="mt-8 px-12 h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest rounded-none uppercase skew-x-[-10deg] shadow-[0_0_15px_rgba(0,255,255,0.4)]">
              <span className="skew-x-[10deg]">EQUIP OPERATIVE</span>
            </Button>
          </div>
        </div>

        {/* Character Roster */}
        <div className="w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {characters?.map((char) => (
            <div 
              key={char.id}
              className={`relative glass-panel p-4 flex gap-4 cursor-pointer transition-all hover:bg-white/5 border-l-4 ${char.selected ? 'border-l-cyan-500 bg-cyan-500/10' : 'border-l-transparent'}`}
            >
              <div className={`w-20 h-20 bg-black/50 border ${rarityColors[char.rarity]} flex items-center justify-center overflow-hidden`}>
                {char.image ? (
                  <img src={char.image} alt={char.name} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-10 h-10 bg-white/10 rounded-full" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className={`font-bold text-lg uppercase tracking-wide ${char.unlocked ? 'text-white' : 'text-gray-500'}`}>
                  {char.name}
                </h3>
                <span className={`text-xs font-mono uppercase ${rarityColors[char.rarity]}`}>
                  {char.rarity}
                </span>
              </div>

              {!char.unlocked && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <Lock className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {/* Dummy placeholders for visual completeness */}
          {[1, 2, 3, 4].map(i => (
            <div key={`dummy-${i}`} className="relative glass-panel p-4 flex gap-4 border-l-4 border-l-transparent opacity-50">
              <div className="w-20 h-20 bg-black/50 border border-gray-800 flex items-center justify-center">
                <span className="text-gray-700 font-mono">?</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="w-24 h-4 bg-gray-800 mb-2" />
                <div className="w-16 h-3 bg-gray-800/50" />
              </div>
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
