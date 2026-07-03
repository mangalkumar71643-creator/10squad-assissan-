import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Canvas } from "@react-three/fiber";
import { Crosshair, LogOut, RefreshCw, Skull, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Arena from "@/components/game/Arena";
import PlayerRig from "@/components/game/PlayerRig";
import EnemySquad from "@/components/game/EnemySquad";
import { createWorld, GameStatus, TOTAL_ENEMIES, World } from "@/game/world";

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!ctx;
  } catch {
    return false;
  }
}

interface HudSnapshot {
  health: number;
  ammo: number;
  reloading: boolean;
  kills: number;
  status: GameStatus;
  timeMs: number;
  accuracy: number;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const JOY_RADIUS = 56;

export default function Game() {
  const [, setLocation] = useLocation();
  const [webglAvailable] = useState<boolean>(() => checkWebGL());
  const [round, setRound] = useState(0);
  const world = useMemo<World>(() => createWorld(), [round]);

  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<HudSnapshot>({
    health: 100,
    ammo: 30,
    reloading: false,
    kills: 0,
    status: "countdown",
    timeMs: 0,
    accuracy: 0,
  });
  const [hitmarker, setHitmarker] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);

  const joyRef = useRef<HTMLDivElement>(null);
  const [joyThumb, setJoyThumb] = useState({ x: 0, y: 0, active: false });
  const joyTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  // Dev/debug handle (used by automated tests; harmless in production)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__world = world;
  }, [world]);

  // --- Countdown 3-2-1-GO ---
  useEffect(() => {
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          world.status = "playing";
          world.startedAt = performance.now();
          return 0;
        }
        return c - 1;
      });
    }, 900);
    return () => clearInterval(iv);
  }, [world]);

  // --- HUD snapshot loop ---
  useEffect(() => {
    const iv = setInterval(() => {
      const now = performance.now();
      const end = world.endedAt || now;
      setHud({
        health: Math.round(world.player.health),
        ammo: world.player.ammo,
        reloading: world.player.reloading,
        kills: world.kills,
        status: world.status,
        timeMs: world.startedAt ? end - world.startedAt : 0,
        accuracy:
          world.shotsFired > 0
            ? Math.round((world.shotsHit / world.shotsFired) * 100)
            : 0,
      });
    }, 100);
    return () => clearInterval(iv);
  }, [world]);

  // --- Hitmarker + damage flash events ---
  useEffect(() => {
    let hmTimer: ReturnType<typeof setTimeout>;
    let dmTimer: ReturnType<typeof setTimeout>;
    const onHit = () => {
      setHitmarker(true);
      clearTimeout(hmTimer);
      hmTimer = setTimeout(() => setHitmarker(false), 120);
    };
    const onDamage = () => {
      setDamageFlash(true);
      clearTimeout(dmTimer);
      dmTimer = setTimeout(() => setDamageFlash(false), 300);
    };
    window.addEventListener("game:hitmarker", onHit);
    window.addEventListener("game:damage", onDamage);
    return () => {
      window.removeEventListener("game:hitmarker", onHit);
      window.removeEventListener("game:damage", onDamage);
      clearTimeout(hmTimer);
      clearTimeout(dmTimer);
    };
  }, []);

  // --- Desktop: keyboard + pointer lock mouse look ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) world.input.keys.add(k);
      if (k === "r") world.input.reloadRequested = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      world.input.keys.delete(e.key.toLowerCase());
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        world.input.lookDX += e.movementX;
        world.input.lookDY += e.movementY;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement && e.button === 0) world.input.firing = true;
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) world.input.firing = false;
    };
    const onLockChange = () => {
      if (!document.pointerLockElement) world.input.firing = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.exitPointerLock?.();
    };
  }, [world]);

  const requestLock = () => {
    if (window.matchMedia("(pointer: fine)").matches && !document.pointerLockElement) {
      const el = document.getElementById("game-root");
      el?.requestPointerLock?.();
    }
  };

  // --- Touch: left zone joystick ---
  const onJoyTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (joyTouchId.current !== null) return;
    joyTouchId.current = t.identifier;
    updateJoy(t.clientX, t.clientY);
  };
  const updateJoy = (cx: number, cy: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = cx - (rect.left + rect.width / 2);
    let dy = cy - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    setJoyThumb({ x: dx, y: dy, active: true });
    world.input.joy.x = dx / JOY_RADIUS;
    world.input.joy.y = dy / JOY_RADIUS;
  };
  const onJoyTouchMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchId.current) updateJoy(t.clientX, t.clientY);
    }
  };
  const onJoyTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoyThumb({ x: 0, y: 0, active: false });
        world.input.joy.x = 0;
        world.input.joy.y = 0;
      }
    }
  };

  // --- Touch: right zone look ---
  const onLookTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (lookTouchId.current !== null) return;
    lookTouchId.current = t.identifier;
    lookLast.current = { x: t.clientX, y: t.clientY };
  };
  const onLookTouchMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) {
        world.input.lookDX += (t.clientX - lookLast.current.x) * 1.6;
        world.input.lookDY += (t.clientY - lookLast.current.y) * 1.6;
        lookLast.current = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const onLookTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) lookTouchId.current = null;
    }
  };

  const ended = hud.status === "victory" || hud.status === "defeat";

  if (!webglAvailable) {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-orange-400">WebGL not available on this device.</p>
        <Button onClick={() => setLocation("/lobby")}>BACK TO LOBBY</Button>
      </div>
    );
  }

  return (
    <div
      id="game-root"
      className="relative h-screen w-screen bg-black text-white overflow-hidden select-none"
      onClick={requestLock}
    >
      <Canvas
        key={round}
        camera={{ position: [0, 1.6, 13], fov: 75, near: 0.05, far: 120 }}
        gl={{ antialias: true, failIfMajorPerformanceCaveat: false }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <Arena />
          <EnemySquad world={world} />
          <PlayerRig world={world} />
        </Suspense>
      </Canvas>

      {/* Damage vignette */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: damageFlash ? 1 : 0,
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(255,0,0,0.45) 100%)",
        }}
      />

      {/* Crosshair */}
      {!ended && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <Crosshair
            className={`w-7 h-7 transition-colors duration-75 ${
              hitmarker ? "text-red-400 scale-125" : "text-orange-300/90"
            }`}
          />
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between p-3 pointer-events-none">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLocation("/lobby");
          }}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded border border-white/15 bg-black/50 backdrop-blur font-mono text-xs tracking-widest text-gray-300 hover:text-white"
        >
          <LogOut className="w-4 h-4" /> EXIT
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="px-5 py-2 rounded border border-orange-500/40 bg-black/60 backdrop-blur flex items-center gap-4">
            <span className="font-mono text-orange-400 text-xs tracking-widest">
              KILLS
            </span>
            <span className="font-mono text-2xl font-bold text-white">
              {hud.kills}
              <span className="text-orange-500/70 text-base">/{TOTAL_ENEMIES}</span>
            </span>
          </div>
          <span className="font-mono text-xs text-gray-400 tracking-widest bg-black/50 px-2 rounded">
            {formatTime(hud.timeMs)}
          </span>
        </div>

        <div className="w-20" />
      </div>

      {/* Bottom HUD: health + ammo */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2 w-64">
        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${hud.health}%`,
              background:
                hud.health > 50
                  ? "linear-gradient(90deg,#22c55e,#84cc16)"
                  : hud.health > 25
                    ? "linear-gradient(90deg,#f59e0b,#f97316)"
                    : "linear-gradient(90deg,#ef4444,#dc2626)",
            }}
          />
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-xs text-gray-400 tracking-widest">HP {hud.health}</span>
          <span className="text-orange-400 text-lg font-bold tracking-widest">
            {hud.reloading ? "RELOADING…" : `${hud.ammo} / ∞`}
          </span>
        </div>
      </div>

      {/* Touch: joystick zone (left) */}
      <div
        className="absolute left-0 bottom-0 top-1/4 w-[40%] z-10"
        style={{ touchAction: "none" }}
        onTouchStart={onJoyTouchStart}
        onTouchMove={onJoyTouchMove}
        onTouchEnd={onJoyTouchEnd}
        onTouchCancel={onJoyTouchEnd}
      >
        <div
          ref={joyRef}
          className="absolute left-8 bottom-16 w-32 h-32 rounded-full border-2 border-white/15 bg-white/5"
        >
          <div
            className={`absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full border transition-colors ${
              joyThumb.active
                ? "bg-orange-500/50 border-orange-400"
                : "bg-white/15 border-white/25"
            }`}
            style={{ transform: `translate(${joyThumb.x}px, ${joyThumb.y}px)` }}
          />
        </div>
      </div>

      {/* Touch: look zone (right) */}
      <div
        className="absolute right-0 bottom-0 top-1/4 w-[60%] z-10"
        style={{ touchAction: "none" }}
        onTouchStart={onLookTouchStart}
        onTouchMove={onLookTouchMove}
        onTouchEnd={onLookTouchEnd}
        onTouchCancel={onLookTouchEnd}
      />

      {/* Touch: fire + reload buttons */}
      <div className="absolute right-6 bottom-14 z-20 flex flex-col items-center gap-4">
        <button
          className="w-14 h-14 rounded-full border border-cyan-400/40 bg-cyan-500/15 backdrop-blur flex items-center justify-center font-mono text-cyan-300 text-xs active:bg-cyan-500/40"
          style={{ touchAction: "none" }}
          onTouchStart={(e) => {
            e.stopPropagation();
            world.input.reloadRequested = true;
          }}
        >
          <RefreshCw className="w-6 h-6" />
        </button>
        <button
          className="w-24 h-24 rounded-full border-2 border-orange-400/60 bg-orange-500/20 backdrop-blur flex items-center justify-center active:bg-orange-500/50"
          style={{ touchAction: "none" }}
          onTouchStart={(e) => {
            e.stopPropagation();
            world.input.firing = true;
          }}
          onTouchEnd={() => {
            world.input.firing = false;
          }}
          onTouchCancel={() => {
            world.input.firing = false;
          }}
        >
          <Crosshair className="w-10 h-10 text-orange-300" />
        </button>
      </div>

      {/* Countdown overlay */}
      {hud.status === "countdown" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <span className="font-mono text-orange-400 tracking-[0.4em] text-sm mb-4">
            ELIMINATE THE ENEMY SQUAD
          </span>
          <span
            key={countdown}
            className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-amber-600 animate-ping-once"
            style={{ animation: "pulse 0.9s ease-out" }}
          >
            {countdown > 0 ? countdown : "GO!"}
          </span>
        </div>
      )}

      {/* Victory / Defeat overlay */}
      {ended && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-10 flex flex-col items-center gap-6 w-[min(90vw,26rem)] border-t-2 border-t-orange-500">
            {hud.status === "victory" ? (
              <>
                <Trophy className="w-16 h-16 text-amber-400" />
                <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 uppercase">
                  VICTORY
                </h1>
              </>
            ) : (
              <>
                <Skull className="w-16 h-16 text-red-500" />
                <h1 className="text-4xl font-bold tracking-widest text-red-500 uppercase">
                  DEFEATED
                </h1>
              </>
            )}

            <div className="grid grid-cols-3 gap-6 w-full text-center font-mono">
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs tracking-widest">KILLS</span>
                <span className="text-xl font-bold">
                  {hud.kills}/{TOTAL_ENEMIES}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs tracking-widest">TIME</span>
                <span className="text-xl font-bold">{formatTime(hud.timeMs)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xs tracking-widest">ACC</span>
                <span className="text-xl font-bold">{hud.accuracy}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                size="lg"
                className="w-full h-12 font-mono tracking-widest bg-gradient-to-r from-orange-500 to-amber-600 text-black hover:from-orange-400 hover:to-amber-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setRound((r) => r + 1);
                }}
              >
                PLAY AGAIN
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full h-12 font-mono tracking-widest text-gray-300 border border-white/15"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/lobby");
                }}
              >
                BACK TO LOBBY
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
