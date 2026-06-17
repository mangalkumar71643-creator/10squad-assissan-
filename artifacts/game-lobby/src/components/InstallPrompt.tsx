import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-black/90 border border-cyan-400/60 shadow-[0_0_20px_rgba(0,255,255,0.25)] px-4 py-2.5 rounded backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
      <Download className="w-4 h-4 text-cyan-400 shrink-0" />
      <div className="flex flex-col">
        <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase">App Install Karo</span>
        <span className="text-[9px] text-gray-400">Full screen, no browser bar</span>
      </div>
      <button
        onClick={handleInstall}
        className="ml-2 px-3 py-1 bg-cyan-400 text-black text-[10px] font-black tracking-widest rounded hover:bg-cyan-300 transition-all uppercase"
      >
        Install
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
