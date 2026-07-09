import { useGetCurrentPlayer } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";

export default function Lobby() {
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
    <div className="h-screen w-screen bg-black overflow-hidden">
      <InstallPrompt />
      <video
        className="fixed inset-0 z-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/video-lobby.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
