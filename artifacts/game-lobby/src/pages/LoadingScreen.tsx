import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { getCurrentPlayer, getLobby } from "@workspace/api-client-react";
import { queryClient } from "@/App";
import {
  isAuthenticated,
  setStoredToken,
  loginAsGuest,
  loginWithEmail,
  registerWithEmail,
} from "@/lib/auth";

// 20 real frames sampled from the ~10s reference video (already landscape,
// 1280x720) — we crossfade through them in order rather than trying to
// recreate the baked-in neon signs / explosion / title fade with CSS.
const FRAME_COUNT = 20;
const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => `/loading-frames/frame-${String(i + 1).padStart(2, "0")}.jpg`);
const FRAME_TIMESTAMPS_MS = [
  250, 750, 1251, 1751, 2251, 2751, 3252, 3752, 4252, 4752,
  5253, 5753, 6253, 6753, 7254, 7754, 8254, 8754, 9255, 9755,
];
type EmailMode = "login" | "register";

export default function LoadingScreen() {
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);

  const prefetchLobbyData = () =>
    Promise.all([
      queryClient.prefetchQuery({ queryKey: ["player"], queryFn: () => getCurrentPlayer() }),
      queryClient.prefetchQuery({ queryKey: ["lobby"], queryFn: () => getLobby() }),
    ]).catch(() => {
      // If the API is slow/unreachable, the lobby will just fetch it itself.
    });

  const enterGame = async () => {
    await prefetchLobbyData();
    if (cancelledRef.current) return;
    setFlash(true);
    setTimeout(() => {
      if (!cancelledRef.current) setLocation("/lobby", { replace: true });
    }, 450);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const alreadyLoggedIn = isAuthenticated();

    // Kick off the lobby's own data fetches now, in parallel with the splash
    // animation, so a returning (already logged-in) player never sees a
    // loading spinner right after this screen.
    const dataPrefetch = alreadyLoggedIn ? prefetchLobbyData() : Promise.resolve();

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
      if (cancelledRef.current) return;

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

      const visualSequenceDone = new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, 10400));
      });

      if (alreadyLoggedIn) {
        // Returning player with a session — skip login, go straight in once
        // both the animation and the data are ready.
        timers.push(setTimeout(() => setFlash(true), 9900));
        Promise.all([visualSequenceDone, dataPrefetch]).then(() => {
          if (!cancelledRef.current) setLocation("/lobby", { replace: true });
        });
      } else {
        // First-time / logged-out — hold on the last frame and show login.
        visualSequenceDone.then(() => {
          if (!cancelledRef.current) setShowLogin(true);
        });
      }
    });

    return () => {
      cancelledRef.current = true;
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

  async function handleGuest() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { token } = await loginAsGuest();
      setStoredToken(token);
      await enterGame();
    } catch {
      setAuthError("Couldn't start a guest session. Check your connection and try again.");
      setAuthBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { token } =
        emailMode === "login" ? await loginWithEmail(email, password) : await registerWithEmail(email, password);
      setStoredToken(token);
      await enterGame();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setAuthBusy(false);
    }
  }

  function handleFacebook() {
    setAuthError("Facebook login isn't set up yet for this build.");
  }

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

      {/* Login overlay — appears once the splash holds on its last frame */}
      {showLogin && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[6%] gap-3 px-6"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 75%)" }}
        >
          {!showEmailForm ? (
            <div className="flex flex-col items-stretch gap-2.5" style={{ width: "min(360px, 90vw)" }}>
              <button
                onClick={handleFacebook}
                disabled={authBusy}
                className="font-mono font-bold tracking-wide uppercase text-white rounded-md py-2.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ background: "#1877F2" }}
              >
                Continue with Facebook
              </button>
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={authBusy}
                className="font-mono font-bold tracking-wide uppercase text-white rounded-md py-2.5 text-sm border border-white/30 bg-white/10 transition-transform active:scale-95 disabled:opacity-50"
              >
                Continue with Email
              </button>
              <button
                onClick={handleGuest}
                disabled={authBusy}
                className="font-mono font-bold tracking-wide uppercase rounded-md py-2.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ color: "#8ef6ff", background: "rgba(77,216,255,0.12)", border: "1px solid rgba(77,216,255,0.5)" }}
              >
                {authBusy ? "..." : "Play as Guest"}
              </button>
              {authError && <p className="text-red-400 text-xs font-mono text-center mt-1">{authError}</p>}
            </div>
          ) : (
            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col items-stretch gap-2.5"
              style={{ width: "min(360px, 90vw)" }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-md py-2.5 px-3 text-sm bg-white/10 border border-white/30 text-white placeholder:text-white/50 font-mono"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-md py-2.5 px-3 text-sm bg-white/10 border border-white/30 text-white placeholder:text-white/50 font-mono"
              />
              <button
                type="submit"
                disabled={authBusy}
                className="font-mono font-bold tracking-wide uppercase rounded-md py-2.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
                style={{ color: "#8ef6ff", background: "rgba(77,216,255,0.12)", border: "1px solid rgba(77,216,255,0.5)" }}
              >
                {authBusy ? "..." : emailMode === "login" ? "Login" : "Sign Up"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode((m) => (m === "login" ? "register" : "login"));
                  setAuthError(null);
                }}
                className="text-white/70 text-xs font-mono underline text-center"
              >
                {emailMode === "login" ? "New here? Create an account" : "Already have an account? Login"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setAuthError(null);
                }}
                className="text-white/50 text-xs font-mono text-center"
              >
                ← Back
              </button>
              {authError && <p className="text-red-400 text-xs font-mono text-center">{authError}</p>}
            </form>
          )}
        </div>
      )}

      {/* White transition flash before the lobby reveal */}
      <div
        className="absolute inset-0 pointer-events-none bg-white"
        style={{ opacity: flash ? 1 : 0, transition: flash ? "opacity 450ms ease-in" : "opacity 300ms ease-out" }}
      />
    </div>
  );
}
