import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetMatchmakingStatus, useCancelMatchmaking, useStartMatchmaking, getGetMatchmakingStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Loader2, Radar, Users, Clock } from "lucide-react";

export default function Matchmaking() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const startMatchmaking = useStartMatchmaking();
  const cancelMatchmaking = useCancelMatchmaking();
  
  const { data: status, isLoading, isError } = useGetMatchmakingStatus({
    query: {
      refetchInterval: 2000,
      queryKey: getGetMatchmakingStatusQueryKey()
    }
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      startMatchmaking.mutate(
        { data: { gameMode: "ranked", playerCount: 5 } },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetMatchmakingStatusQueryKey(), data);
          }
        }
      );
    }
  }, [startMatchmaking, queryClient]);

  const handleCancel = () => {
    cancelMatchmaking.mutate(undefined, {
      onSettled: () => {
        setLocation("/lobby");
      }
    });
  };

  // If status is "found", we could auto-redirect
  useEffect(() => {
    if (status?.status === "found" || status?.status === "ready") {
      const timer = setTimeout(() => {
        setLocation("/lobby");
      }, 3000);
      return () => clearTimeout(timer);
    }
    return;
  }, [status, setLocation]);

  return (
    <div className="relative h-screen w-screen bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen grayscale"
        style={{ backgroundImage: 'url("/assets/cyberpunk-bg.png")' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,136,0,0.1)_0%,transparent_60%)]" />
      
      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-2xl">
        <h1 className="text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600 uppercase glitch-effect" data-text="MATCHMAKING">
          MATCHMAKING
        </h1>
        
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-ping" />
          <div className="absolute inset-4 border-2 border-orange-500/40 rounded-full animate-pulse" />
          <div className="absolute inset-8 border border-orange-500/60 rounded-full" />
          
          <Radar className="w-24 h-24 text-orange-500 animate-spin duration-3000" />
          
          {status?.status === "found" && (
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse-glow flex items-center justify-center backdrop-blur-sm">
              <span className="text-cyan-400 font-bold tracking-widest text-xl neon-text-cyan">MATCH FOUND</span>
            </div>
          )}
        </div>

        <div className="glass-panel w-full p-8 flex flex-col gap-6 border-t-2 border-t-orange-500">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-orange-400" />
              <span className="text-gray-400 font-mono text-sm">ELAPSED</span>
              <span className="font-mono text-2xl font-bold text-white">
                {status?.queueTime ? `00:${status.queueTime.toString().padStart(2, '0')}` : "00:00"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users className="w-6 h-6 text-orange-400" />
              <span className="text-gray-400 font-mono text-sm">PLAYERS</span>
              <span className="font-mono text-2xl font-bold text-white">
                {status?.playersFound || 0} / {status?.totalPlayers || 10}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <span className="text-orange-400/80 font-mono text-xs tracking-widest uppercase">
              ESTIMATED WAIT: {status?.estimatedWait ? `00:${status.estimatedWait.toString().padStart(2, '0')}` : "--:--"}
            </span>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-1/3 animate-pulse" />
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="lg"
          onClick={handleCancel}
          disabled={status?.status === "found" || cancelMatchmaking.isPending}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 px-12 h-14 font-mono tracking-widest uppercase"
        >
          {cancelMatchmaking.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><X className="w-5 h-5 mr-2" /> CANCEL QUEUE</>}
        </Button>
      </div>
    </div>
  );
}
