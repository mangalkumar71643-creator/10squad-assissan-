import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { getCurrentPlayer, getLobby } from "@workspace/api-client-react";
import { queryClient } from "@/App";

// 20 real frames sampled from the ~10s reference video (already landscape,
// 1280x720) — we crossfade through them in order rather than trying to
// recreate the baked-in neon signs / explosion / title fade with CSS.
const FRAME_COUNT = 20;
const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => `/loading-frames/frame-${String(i + 1).padStart(2, "0")}.jpg`);
const FRAME_TIMESTAMPS_MS = [
  250, 750, 1251, 1751, 2251, 2751, 3252, 3752, 4252, 4752,
  5253, 5753, 6253, 6753, 7254, 7754, 8254, 8754, 9255, 9755,
];

export default function LoadingScreen() {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Kick off the lobby's own data fetches now, in parallel with the
    // splash animation, so the lobby has its data already cached and
    // never shows its own "INITIALIZING..." spinner after this screen.
    const dataPrefetch = Promise.all([
      queryClient.prefetchQuery({ queryKey: ["player"], queryFn: () => getCurrentPlayer() }),
      queryClient.prefetchQuery({ queryKey: ["lobby"], queryFn: () => getLobby() }),
    ]).catch(() => {
      // If the API is slow/unreachable, the lobby will just fetch it itself.
    });

    Promise.all(
      FRAMES.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // one bad frame shouldn't block startup
            img.src = src;
          })
      )
    ).then(() => {
      if (cancelled) return;

      const audio = new Audio("/audio/loading.mp3");
      audio.volume = 0.9;
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay blocked (browser policy) — the visual sequence still runs.
      });

      FRAME_TIMESTAMPS_MS.forEach((t, i) => {
        if (i === 0) return; // frame 0 is already showing
        timers.push(setTimeout(() => setCurrentIndex(i), t));
      });

      timers.push(setTimeout(() => setFlash(true), 9900));

      const visualSequenceDone = new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, 10400));
      });
      // Navigate once BOTH the animation has finished AND the lobby's data
      // is ready — whichever takes longer — so the lobby never has to show
      // its own loading spinner right after this screen.
      Promise.all([visualSequenceDone, dataPrefetch]).then(() => {
        if (!cancelled) setLocation("/lobby", { replace: true });
      });
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
    // Run once on mount only — wouter's setLocation is not reference-stable
    // across renders, and re-running this effect would cancel every pending
    // timer via the cleanup above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999] select-none">
      {FRAMES.map((src, i) => (
        <img
          key={src}
          src={src}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: i === currentIndex ? 1 : 0,
            transition: "opacity 280ms ease-in-out",
            objectPosition: "center 90%",
          }}
        />
      ))}

      {/* White transition flash before the lobby reveal */}
      <div
        className="absolute inset-0 pointer-events-none bg-white"
        style={{ opacity: flash ? 1 : 0, transition: flash ? "opacity 450ms ease-in" : "opacity 300ms ease-out" }}
      />
    </div>
  );
}
