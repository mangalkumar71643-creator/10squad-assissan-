import { useLocation } from "wouter";
import { useGetCurrentPlayer } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { isLoading, data: player } = useGetCurrentPlayer({ query: { queryKey: ["player"], retry: 1 } });

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
    <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center">
      <InstallPrompt />
      {/* Aspect-ratio-locked frame matching the video's native 16:9, so the
          overlay button (percentage-positioned) always lines up with the
          baked-in CHARACTER graphic regardless of device screen ratio. */}
      <div className="relative" style={{ height: "100%", aspectRatio: "16 / 9", maxWidth: "100vw" }}>
        <video
          className="w-full h-full object-contain"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video-lobby.mp4" type="video/mp4" />
        </video>

        <button
          onClick={() => setLocation("/character")}
          className="absolute active:scale-95 transition-transform"
          style={{ left: "0%", top: "72.4%", width: "17.7%", height: "10.8%" }}
        >
          <img src="/assets/character-btn-video.png" alt="Character" className="w-full h-full object-contain" />
        </button>
      </div>
    </div>
  );
}
