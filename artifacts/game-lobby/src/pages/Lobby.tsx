import { useGetCurrentPlayer } from "@workspace/api-client-react";
import InstallPrompt from "@/components/InstallPrompt";

export default function Lobby() {
  useGetCurrentPlayer({ query: { queryKey: ["player"], retry: 1 } });

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex items-center justify-center">
      <InstallPrompt />
      <img src="/logo.png" alt="10 Squad Assassin" className="max-w-[70%] max-h-[70%] object-contain" />
    </div>
  );
}
