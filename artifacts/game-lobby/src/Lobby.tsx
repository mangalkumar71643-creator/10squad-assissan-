import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinnedObject } from "three/examples/jsm/utils/SkeletonUtils.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

function StartMissionButton({
  pressed,
  onPress,
  onRelease,
  onClick,
}: {
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onClick: () => void;
}) {
  return (
    <button
      aria-label="Start Mission"
      onClick={onClick}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 120ms ease",
      }}
    >
      <style>{`
        @keyframes mission-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.035); filter: brightness(1.12); }
        }
        @keyframes mission-sweep {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          35%  { left: 130%; opacity: 1; }
          45%  { opacity: 0; }
          100% { left: 130%; opacity: 0; }
        }
      `}</style>
      {/* Pulse (breathing scale/brightness) wraps the shine layer so the
          two animations compose independently instead of fighting over
          one element's transform. Press feedback (scale on the outer
          button) pauses the pulse while held, same as the old button. */}
      <div
        style={{
          animation: pressed ? "none" : "mission-pulse 2.2s ease-in-out infinite",
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 999,
            width: "clamp(137px, 33.1vw, 216px)",
          }}
        >
          <img
            src="/lobby-start-mission.png"
            alt=""
            draggable={false}
            style={{ display: "block", width: "100%" }}
          />
          {/* Diagonal shine sweep, clipped to the button's own pill
              silhouette by the overflow:hidden wrapper above. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-20%",
              left: "-60%",
              width: "35%",
              height: "140%",
              background:
                "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)",
              transform: "skewX(-20deg)",
              animation: "mission-sweep 3.4s ease-in-out infinite",
              animationDelay: "1s",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </button>
  );
}

// Deterministic 2D value noise (hash-based, no Math.random) so the map
// renders identically every time instead of reshuffling on each mount.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = x - x0;
  const sy = y - y0;
  const n00 = hash2(x0, y0);
  const n10 = hash2(x0 + 1, y0);
  const n01 = hash2(x0, y0 + 1);
  const n11 = hash2(x0 + 1, y0 + 1);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}

// A real sci-fi floor-panel image for the main arena ground, tiled with
// RepeatWrapping the same way createFloorTexture's procedural texture is —
// same wrapping/repeat/anisotropy setup, just loaded from an image file
// instead of drawn on a canvas.
const sciFiFloorTextureLoader = new THREE.TextureLoader();
function createSciFiFloorTexture(repeatCount: number, maxAnisotropy: number): THREE.Texture {
  const texture = sciFiFloorTextureLoader.load("/textures/floor-scifi.jpg");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatCount, repeatCount);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// Two real sci-fi wall-panel images (rusted plating, glowing seams) — each
// loaded once and cloned per wall segment so every segment can carry its
// own repeat count (walls come in many different lengths across the level;
// cloning a THREE.Texture is cheap, it shares the same decoded image/GPU
// upload and only duplicates the small wrapper object holding repeat/wrap
// state). Variant 1 (calmer, intact panels) dresses the rooms; variant 2
// (bullet-scarred, hazard-striped panels) dresses the corridors/tunnels
// connecting them, so moving between rooms reads as leaving "clean" zones
// through more fought-over passageways.
const sciFiWallTextureBases: (THREE.Texture | null)[] = [null, null];
const SCIFI_WALL_URLS = ["/textures/wall-scifi.jpg", "/textures/wall-scifi-2.jpg"];
function createSciFiWallTexture(repeatX: number, repeatY: number, maxAnisotropy: number, variant: 0 | 1 = 0): THREE.Texture {
  if (!sciFiWallTextureBases[variant]) {
    const base = new THREE.TextureLoader().load(SCIFI_WALL_URLS[variant]);
    base.colorSpace = THREE.SRGBColorSpace;
    base.wrapS = THREE.RepeatWrapping;
    base.wrapT = THREE.RepeatWrapping;
    sciFiWallTextureBases[variant] = base;
  }
  const texture = sciFiWallTextureBases[variant]!.clone();
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// A real sci-fi ceiling-panel image (square plating, glowing cyan grid
// seams) — same load-once/clone-per-slab approach as the wall textures,
// so every ceiling slab in the level (rooms, corridors, tunnel) can carry
// its own repeat count sized to its own footprint.
let sciFiCeilingTextureBase: THREE.Texture | null = null;
function createSciFiCeilingTexture(repeatX: number, repeatY: number, maxAnisotropy: number): THREE.Texture {
  if (!sciFiCeilingTextureBase) {
    const base = new THREE.TextureLoader().load("/textures/ceiling-scifi.jpg");
    base.colorSpace = THREE.SRGBColorSpace;
    base.wrapS = THREE.RepeatWrapping;
    base.wrapT = THREE.RepeatWrapping;
    sciFiCeilingTextureBase = base;
  }
  const texture = sciFiCeilingTextureBase.clone();
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// The two sliding gate leaves get their own real door-panel images (frame
// pillar, keypad, hazard stripe, cyan seams) instead of reusing the plain
// wall texture — a single decal per leaf, not a repeating tile, so no
// repeat count is set here (left mirrored to right already at the image
// level: see the crop in the session that produced these two files).
const doorPanelTextures: (THREE.Texture | null)[] = [null, null];
const DOOR_PANEL_URLS = ["/textures/door-left.jpg", "/textures/door-right.jpg"];
function createDoorPanelTexture(side: 0 | 1, maxAnisotropy: number): THREE.Texture {
  if (!doorPanelTextures[side]) {
    const base = new THREE.TextureLoader().load(DOOR_PANEL_URLS[side]);
    base.colorSpace = THREE.SRGBColorSpace;
    doorPanelTextures[side] = base;
  }
  const texture = doorPanelTextures[side]!.clone();
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// Procedural sci-fi metal floor texture for the arena — dark blue-grey
// plating (layered value noise for subtle wear patches, fine speckle for
// grain) with beveled panel seams and a glowing cyan tactical-grid accent
// through each tile, echoing a holographic floor overlay.
function createFloorTexture(repeatCount: number, maxAnisotropy: number): THREE.CanvasTexture {
  // 1024px source (up from an earlier 256px pass) so panel seams and the
  // grain stay crisp instead of blurring/pixelating once the camera sits
  // this close to the ground — a low-res canvas was the main thing making
  // this look cheap up close, more than the actual art direction.
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const patch = valueNoise(x * 0.02, y * 0.02) * 0.6 + valueNoise(x * 0.06, y * 0.06) * 0.4;
      const speckle = hash2(x * 0.4, y * 0.4) * 0.1;
      const t = clamp(patch + speckle - 0.05, 0, 1);
      const r = Math.round(34 + t * 26);
      const g = Math.round(40 + t * 30);
      const b = Math.round(50 + t * 36);
      const i = (y * size + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Beveled panel seams — a dark line with a lighter highlight offset a
  // couple pixels over, suggesting welded metal plating rather than a
  // flat color.
  const panels = 4;
  const step = size / panels;
  for (let i = 1; i < panels; i++) {
    ctx.strokeStyle = "rgba(8,12,18,0.7)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,110,130,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(i * step + 3, 0);
    ctx.lineTo(i * step + 3, size);
    ctx.moveTo(0, i * step + 3);
    ctx.lineTo(size, i * step + 3);
    ctx.stroke();
  }

  // Glowing cyan tactical-grid accent through the tile center.
  ctx.save();
  ctx.shadowColor = "#6be2ff";
  ctx.shadowBlur = 36;
  ctx.strokeStyle = "rgba(107,226,255,0.55)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatCount, repeatCount);
  // Without this a ground plane viewed at the shallow grazing angle a
  // close chase camera sees goes visibly blurry/muddy at any distance,
  // regardless of source resolution — anisotropic filtering is what
  // actually fixes that.
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// Diagonal yellow/black hazard stripes for the floor decal at a doorway
// threshold.
function createHazardStripeTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#12100a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#e8c23a";
  const stripeWidth = size / 4;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-size, -size);
  for (let x = -size; x < size * 2; x += stripeWidth * 2) {
    ctx.fillRect(x, -size, stripeWidth, size * 4);
  }
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// A simple vertical-gradient sky, painted onto a canvas and wrapped around
// a big inward-facing sphere — without this the scene has no background
// at all (the canvas is alpha-transparent, so it just shows the page's
// near-black CSS background through it), which reads as floating in open
// space rather than standing outdoors, especially now that the arena is
// big enough for its edges to be visible in the distance.
function createSkyTexture(): THREE.CanvasTexture {
  const width = 4;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // A sphere's equator (v=0.5) is what a roughly-horizontal camera actually
  // sees, so the lit "horizon glow" band needs to sit there, not near the
  // bottom of the gradient — the very bottom of the sphere is hidden below
  // the ground plane and never visible anyway.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#050a14"); // zenith — near-black, matching the arena's night tone
  gradient.addColorStop(0.38, "#0d1f34");
  gradient.addColorStop(0.52, "#2f5678"); // lit horizon band, where the camera actually looks
  gradient.addColorStop(0.62, "#5f8aa3");
  gradient.addColorStop(1, "#5f8aa3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const ARENA_HALF = 350; // 700x700 arena, centered on the origin
// Everything else that depends on the arena's size — floor tile density,
// grid line density, fog distance, the sky sphere and the camera's far
// clip plane — is derived from ARENA_HALF below instead of hand-tuned
// constants, so resizing the arena again later is a one-line change
// instead of a multi-spot retune.
// The real sci-fi floor image already bakes in its own repeating panel
// grid, so it's tiled as one whole unit rather than sliced into smaller
// pieces — sized so each of its panels reads at roughly the same scale a
// standing fighter would.
const SCIFI_FLOOR_TILE_SIZE = 6;
const SCIFI_FLOOR_REPEAT = (ARENA_HALF * 2) / SCIFI_FLOOR_TILE_SIZE;
// The real sci-fi wall panel image, same tiling approach as the floor —
// sized so each tile covers one wall's full height (so it's never
// vertically squashed/stretched), repeating along the wall's long side.
const SCIFI_WALL_TILE_SIZE = 2.5;
const SCIFI_CEILING_TILE_SIZE = 6;
const FOG_NEAR = ARENA_HALF - 5;
const FOG_FAR = ARENA_HALF * 2.5;
const SKY_RADIUS = Math.max(350, ARENA_HALF * 4); // stays comfortably beyond the fog and the arena's own far corners
const CAMERA_FAR = SKY_RADIUS + 50;
// The player's target ground speed is a continuous function of how far the
// joystick is pushed (see PLAYER_MAX_SPEED below) rather than a fixed
// constant — full tilt sustained past SPRINT_ENGAGE_MAG additionally ramps
// in a sprint bonus.
const PLAYER_MAX_SPEED = 3.4;
const PLAYER_SPRINT_BONUS = 0.4; // extra fraction of top speed once sprint is fully engaged
const SPRINT_ENGAGE_MAG = 0.92; // joystick magnitude that starts building sprint
const SPRINT_BLEND_RATE = 2.4; // per-second ease rate in/out of sprint
const PLAYER_ACCEL_RATE = 9; // per-second damping rate speeding up
const PLAYER_DECEL_RATE = 15; // per-second damping rate slowing down (snappier stop than start)
const PLAYER_TURN_RATE = 11; // per-second damping rate turning to face the move direction
const GUN_RANGE = 14; // a shootout distance, not a melee reach

// A sci-fi outpost room off to the side of the arena — four walls around a
// 40x40 footprint, each with its own door gap (one "entrance" side, three
// "exit" sides, all functionally identical openings), dressed with crates,
// a floor grate, hazard stripes and a wall screen to match the reference
// sci-fi interior. Placed well away from the default spawn points so it
// doesn't interfere with the immediate spawn-adjacent fight.
const ROOM_SIZE = 20; // doubled from the original 10 — rooms 1-5 only, room 6 has its own fixed ROOM6_WIDTH/ROOM6_DEPTH
const ROOM_WALL_HEIGHT = 3.5;
const ROOM_WALL_THICKNESS = 0.6;
const ROOM_DOOR_WIDTH = 2;
const ROOM_POS = { x: 60, z: -50 };
// Room 2-5 centers are pushed out by the same amount ROOM_SIZE grew (5 extra
// half-extent per room facing a corridor), so every corridor's actual open
// length (see CORRIDOR_Z_NEAR/FAR etc. below) stays exactly what it was
// before the rooms doubled in size, instead of shrinking as the bigger
// rooms eat into the gap.
const ROOM2_POS = { x: 60, z: -160 }; // a second, identical room, corridor length unchanged from before the resize
const ROOM3_POS = { x: 60, z: -220 }; // a third, identical room, corridor length unchanged from before the resize
const ROOM4_POS = { x: ROOM3_POS.x + 60, z: ROOM3_POS.z }; // a fourth room, off the main line — corridor length unchanged from before the resize
const ROOM5_POS = { x: ROOM4_POS.x, z: ROOM4_POS.z - 60 }; // a fifth room, branching again — corridor length unchanged from before the resize
const ROOM_POSITIONS = [ROOM_POS, ROOM2_POS, ROOM3_POS, ROOM4_POS, ROOM5_POS];
const ROOM_SEG_WIDTH = (ROOM_SIZE - ROOM_DOOR_WIDTH) / 2;
const ROOM_SEG_OFFSET = ROOM_DOOR_WIDTH / 2 + ROOM_SEG_WIDTH / 2;
const ROOM_PAD = 0.4; // padded out by a fighter's body radius

interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  pad: number;
}

// Two wall segments per side (north/south run along x, east/west run along
// z), flanking a door-width gap at the room's center on that side.
function roomWallObstacles(pos: { x: number; z: number }): Obstacle[] {
  return [
    { x: pos.x - ROOM_SEG_OFFSET, z: pos.z - ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-west
    { x: pos.x + ROOM_SEG_OFFSET, z: pos.z - ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-east
    { x: pos.x - ROOM_SEG_OFFSET, z: pos.z + ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west
    { x: pos.x + ROOM_SEG_OFFSET, z: pos.z + ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east
    { x: pos.x - ROOM_SIZE / 2, z: pos.z - ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // west-north
    { x: pos.x - ROOM_SIZE / 2, z: pos.z + ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // west-south
    { x: pos.x + ROOM_SIZE / 2, z: pos.z - ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // east-north
    { x: pos.x + ROOM_SIZE / 2, z: pos.z + ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // east-south
  ];
}

// Storage crates (spawned as plain textured boxes — see
// loadCrateMaterial/placeCrate) — a symmetric footprint since they're
// actual cubes, unlike the old rotated rectangular boxes this replaced
// (which needed differently-shaped padding per rotation).
const CRATE_HALF_EXTENT = 0.9;
function roomCrateObstacles(pos: { x: number; z: number }): Obstacle[] {
  return [
    { x: pos.x - 2.5, z: pos.z - 2.5, halfX: CRATE_HALF_EXTENT, halfZ: CRATE_HALF_EXTENT, pad: ROOM_PAD }, // crate 1
    { x: pos.x + 2.75, z: pos.z - 2, halfX: CRATE_HALF_EXTENT, halfZ: CRATE_HALF_EXTENT, pad: ROOM_PAD }, // crate 2
    { x: pos.x + 2, z: pos.z + 2.75, halfX: CRATE_HALF_EXTENT, halfZ: CRATE_HALF_EXTENT, pad: ROOM_PAD }, // crate 3
  ];
}

// A covered corridor connecting the two rooms' facing doors — walled on
// both sides and roofed to match, so the two rooms read as one connected
// outpost. Runs from ROOM_POS's north (entrance) wall to ROOM2_POS's south
// (exit) wall. Wider than the ROOM_DOOR_WIDTH door gap it passes through,
// so it necks down at each end rather than being a uniform width.
const CORRIDOR_WIDTH = 3.5;
const CORRIDOR_Z_NEAR = ROOM_POS.z - ROOM_SIZE / 2;
const CORRIDOR_Z_FAR = ROOM2_POS.z + ROOM_SIZE / 2;
const CORRIDOR_CENTER_Z = (CORRIDOR_Z_NEAR + CORRIDOR_Z_FAR) / 2;
const CORRIDOR_SIDE_OFFSET = CORRIDOR_WIDTH / 2 + ROOM_WALL_THICKNESS / 2;

// A small 6x6 outpost built directly into the middle of the corridor, with
// a door on each of the two walls facing the corridor (ROOM_POS's side and
// ROOM2_POS's side) so all three rooms connect through one continuous path.
const MIDROOM_SIZE = 6;
const MIDROOM_POS = { x: ROOM_POS.x, z: CORRIDOR_CENTER_Z };
const MIDROOM_DOOR_WIDTH = ROOM_DOOR_WIDTH;
const MIDROOM_SEG_WIDTH = (MIDROOM_SIZE - MIDROOM_DOOR_WIDTH) / 2;
const MIDROOM_SEG_OFFSET = MIDROOM_DOOR_WIDTH / 2 + MIDROOM_SEG_WIDTH / 2;
const MIDROOM_SOUTH_Z = MIDROOM_POS.z + MIDROOM_SIZE / 2; // door side, facing ROOM_POS
const MIDROOM_NORTH_Z = MIDROOM_POS.z - MIDROOM_SIZE / 2; // door side, facing ROOM2_POS
const MIDROOM_WALLS: Obstacle[] = [
  { x: MIDROOM_POS.x - MIDROOM_SEG_OFFSET, z: MIDROOM_SOUTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west (door side)
  { x: MIDROOM_POS.x + MIDROOM_SEG_OFFSET, z: MIDROOM_SOUTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east (door side)
  { x: MIDROOM_POS.x - MIDROOM_SEG_OFFSET, z: MIDROOM_NORTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-west (door side)
  { x: MIDROOM_POS.x + MIDROOM_SEG_OFFSET, z: MIDROOM_NORTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-east (door side)
  { x: MIDROOM_POS.x - MIDROOM_SIZE / 2, z: MIDROOM_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: MIDROOM_SIZE / 2, pad: ROOM_PAD }, // west — solid
  { x: MIDROOM_POS.x + MIDROOM_SIZE / 2, z: MIDROOM_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: MIDROOM_SIZE / 2, pad: ROOM_PAD }, // east — solid
];

// The corridor is split into two segments by MIDROOM sitting in the middle:
// one running from ROOM_POS to the midroom's doored south wall, the other
// from ROOM2_POS to the midroom's solid north wall (a dead end).
const CORRIDOR_NEAR_Z1 = MIDROOM_SOUTH_Z + ROOM_WALL_THICKNESS / 2; // outer face of midroom's south wall
const CORRIDOR_NEAR_Z2 = CORRIDOR_Z_NEAR;
const CORRIDOR_NEAR_LENGTH = CORRIDOR_NEAR_Z2 - CORRIDOR_NEAR_Z1;
const CORRIDOR_NEAR_CENTER_Z = (CORRIDOR_NEAR_Z1 + CORRIDOR_NEAR_Z2) / 2;
const CORRIDOR_FAR_Z1 = CORRIDOR_Z_FAR;
const CORRIDOR_FAR_Z2 = MIDROOM_NORTH_Z - ROOM_WALL_THICKNESS / 2; // outer face of midroom's north wall
const CORRIDOR_FAR_LENGTH = CORRIDOR_FAR_Z2 - CORRIDOR_FAR_Z1;
const CORRIDOR_FAR_CENTER_Z = (CORRIDOR_FAR_Z1 + CORRIDOR_FAR_Z2) / 2;
const CORRIDOR_SEGMENTS = [
  { length: CORRIDOR_NEAR_LENGTH, centerZ: CORRIDOR_NEAR_CENTER_Z },
  { length: CORRIDOR_FAR_LENGTH, centerZ: CORRIDOR_FAR_CENTER_Z },
];
const CORRIDOR_WALLS: Obstacle[] = CORRIDOR_SEGMENTS.flatMap((seg) => [
  { x: ROOM_POS.x - CORRIDOR_SIDE_OFFSET, z: seg.centerZ, halfX: ROOM_WALL_THICKNESS / 2, halfZ: seg.length / 2, pad: ROOM_PAD }, // west
  { x: ROOM_POS.x + CORRIDOR_SIDE_OFFSET, z: seg.centerZ, halfX: ROOM_WALL_THICKNESS / 2, halfZ: seg.length / 2, pad: ROOM_PAD }, // east
]);

// A second, plain corridor (no mid-house this time) connecting ROOM2_POS's
// entrance wall to ROOM3_POS's exit wall.
const CORRIDOR2_Z_NEAR = ROOM2_POS.z - ROOM_SIZE / 2;
const CORRIDOR2_Z_FAR = ROOM3_POS.z + ROOM_SIZE / 2;
const CORRIDOR2_LENGTH = CORRIDOR2_Z_NEAR - CORRIDOR2_Z_FAR;
const CORRIDOR2_CENTER_Z = (CORRIDOR2_Z_NEAR + CORRIDOR2_Z_FAR) / 2;
const CORRIDOR2_WALLS: Obstacle[] = [
  { x: ROOM_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR2_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR2_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR2_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR2_LENGTH / 2, pad: ROOM_PAD }, // east
];

// A third corridor, running east-west this time (ROOM4_POS branches off to
// the side rather than continuing the north-south line), joining ROOM3_POS's
// east wall to ROOM4_POS's west wall. Same width/style, just rotated 90°:
// its walls flank the north/south sides instead of east/west.
const CORRIDOR3_X_NEAR = ROOM3_POS.x + ROOM_SIZE / 2;
const CORRIDOR3_X_FAR = ROOM4_POS.x - ROOM_SIZE / 2;
const CORRIDOR3_LENGTH = CORRIDOR3_X_FAR - CORRIDOR3_X_NEAR;
const CORRIDOR3_CENTER_X = (CORRIDOR3_X_NEAR + CORRIDOR3_X_FAR) / 2;
const CORRIDOR3_WALLS: Obstacle[] = [
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z - CORRIDOR_SIDE_OFFSET, halfX: CORRIDOR3_LENGTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z + CORRIDOR_SIDE_OFFSET, halfX: CORRIDOR3_LENGTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south
];

// A fourth corridor, back to running north-south, joining ROOM4_POS's north
// wall to ROOM5_POS's south wall — ROOM5_POS branches off again instead of
// continuing straight along corridor3's east-west line.
const CORRIDOR4_Z_NEAR = ROOM4_POS.z - ROOM_SIZE / 2;
const CORRIDOR4_Z_FAR = ROOM5_POS.z + ROOM_SIZE / 2;
const CORRIDOR4_LENGTH = CORRIDOR4_Z_NEAR - CORRIDOR4_Z_FAR;
const CORRIDOR4_CENTER_Z = (CORRIDOR4_Z_NEAR + CORRIDOR4_Z_FAR) / 2;
const CORRIDOR4_WALLS: Obstacle[] = [
  { x: ROOM4_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR4_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR4_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM4_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR4_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR4_LENGTH / 2, pad: ROOM_PAD }, // east
];

// ROOM6 — a larger 40x30 (width x depth) room built directly in front of
// ROOM5_POS, i.e. continuing further along the same north direction ROOM5
// branched off in. Unlike the other rooms it isn't square, so its wall
// segments are computed independently per axis rather than reusing
// roomWallObstacles(). Only one door (south, back to ROOM5_POS) remains —
// see ROOM6_WALLS below.
const ROOM6_WIDTH = 40;
const ROOM6_DEPTH = 30;
const ROOM6_DOOR_WIDTH = ROOM_DOOR_WIDTH;
const ROOM6_POS = { x: ROOM5_POS.x, z: ROOM5_POS.z - (ROOM_SIZE / 2 + 40 + ROOM6_DEPTH / 2) };
const ROOM6_SEG_WIDTH_X = (ROOM6_WIDTH - ROOM6_DOOR_WIDTH) / 2;
const ROOM6_SEG_OFFSET_X = ROOM6_DOOR_WIDTH / 2 + ROOM6_SEG_WIDTH_X / 2;
// Only the south wall keeps its door (the one linking back to ROOM5_POS via
// CORRIDOR5_WALLS) — north, east and west are sealed solid since they led
// nowhere but open exterior.
const ROOM6_WALLS: Obstacle[] = [
  { x: ROOM6_POS.x, z: ROOM6_POS.z - ROOM6_DEPTH / 2, halfX: ROOM6_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north — solid
  { x: ROOM6_POS.x - ROOM6_SEG_OFFSET_X, z: ROOM6_POS.z + ROOM6_DEPTH / 2, halfX: ROOM6_SEG_WIDTH_X / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west (door side)
  { x: ROOM6_POS.x + ROOM6_SEG_OFFSET_X, z: ROOM6_POS.z + ROOM6_DEPTH / 2, halfX: ROOM6_SEG_WIDTH_X / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east (door side)
  { x: ROOM6_POS.x - ROOM6_WIDTH / 2, z: ROOM6_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM6_DEPTH / 2, pad: ROOM_PAD }, // west — solid
  { x: ROOM6_POS.x + ROOM6_WIDTH / 2, z: ROOM6_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM6_DEPTH / 2, pad: ROOM_PAD }, // east — solid
];

// Fifth corridor joining ROOM5_POS's north door to ROOM6_POS's south door.
const CORRIDOR5_Z_NEAR = ROOM5_POS.z - ROOM_SIZE / 2;
const CORRIDOR5_Z_FAR = ROOM6_POS.z + ROOM6_DEPTH / 2;
const CORRIDOR5_LENGTH = CORRIDOR5_Z_NEAR - CORRIDOR5_Z_FAR;
const CORRIDOR5_CENTER_Z = (CORRIDOR5_Z_NEAR + CORRIDOR5_Z_FAR) / 2;
const CORRIDOR5_WALLS: Obstacle[] = [
  { x: ROOM5_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR5_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR5_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM5_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR5_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR5_LENGTH / 2, pad: ROOM_PAD }, // east
];

// Extra crates scattered through the spots that don't already have any —
// the midroom, every corridor, and ROOM6 (rooms 1-5 already get their own
// via roomCrateObstacles). Each is offset to one side of its walkway so
// there's still room to pass, not a full blockage.
const EXTRA_CRATES: Obstacle[] = [
  { x: 61.5, z: MIDROOM_POS.z + 1.5, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // midroom
  { x: 59, z: CORRIDOR_NEAR_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor near segment (room1<->midroom)
  { x: 61, z: CORRIDOR_FAR_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor far segment (midroom<->room2)
  { x: 59, z: CORRIDOR2_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor2 (room2<->room3)
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z - 1, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor3 (room3<->room4, east-west)
  { x: ROOM4_POS.x + 1, z: CORRIDOR4_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor4 (room4<->room5)
  { x: ROOM5_POS.x - 1, z: CORRIDOR5_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor5 (room5<->room6)
  { x: ROOM6_POS.x - 12, z: ROOM6_POS.z - 8, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
  { x: ROOM6_POS.x + 10, z: ROOM6_POS.z + 5, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
  { x: ROOM6_POS.x, z: ROOM6_POS.z + 10, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
];

// A new octagonal room attached directly to Room 1's west door (door 3) —
// no connecting corridor at all, the door opens straight into it. 20x20
// bounding box like the square rooms, but with all 4 corners chamfered at
// 45° so it reads as an octagon instead of another square or a round room.
// Only 7 wall segments are built (no separate east wall of its own): Room
// 1's own west wall — already split around the door 3 gap by
// roomWallObstacles() — is the shared partition between the two rooms, so
// this room's north/south walls and its two east-side (NE/SE) corner cuts
// simply terminate right at that existing wall instead of duplicating it.
const NEWROOM_HALF = 10; // 20x20 bounding box
const NEWROOM_CHAMFER = 6; // corner cut distance, in from each side
const NEWROOM_POS = { x: ROOM_POS.x - ROOM_SIZE / 2 - NEWROOM_HALF, z: ROOM_POS.z }; // flush against Room 1's west wall
const NEWROOM_STRAIGHT_HALF = (NEWROOM_HALF * 2 - NEWROOM_CHAMFER * 2) / 2; // half-length of each straight edge
const NEWROOM_WALLS: Obstacle[] = [
  { x: NEWROOM_POS.x, z: NEWROOM_POS.z - NEWROOM_HALF, halfX: NEWROOM_STRAIGHT_HALF, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north
  { x: NEWROOM_POS.x, z: NEWROOM_POS.z + NEWROOM_HALF, halfX: NEWROOM_STRAIGHT_HALF, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south
  { x: NEWROOM_POS.x - NEWROOM_HALF, z: NEWROOM_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: NEWROOM_STRAIGHT_HALF, pad: ROOM_PAD }, // west
  // The 4 chamfered corners, approximated as small square blocks for
  // collision (the collision system is axis-aligned only — see the
  // Obstacle interface — so a true 45° obstacle isn't possible; this just
  // conservatively seals each corner to match the diagonal wall mesh).
  {
    x: NEWROOM_POS.x - NEWROOM_STRAIGHT_HALF - NEWROOM_CHAMFER / 2,
    z: NEWROOM_POS.z - NEWROOM_STRAIGHT_HALF - NEWROOM_CHAMFER / 2,
    halfX: NEWROOM_CHAMFER / 2,
    halfZ: NEWROOM_CHAMFER / 2,
    pad: ROOM_PAD,
  }, // NW
  {
    x: NEWROOM_POS.x + NEWROOM_STRAIGHT_HALF + NEWROOM_CHAMFER / 2,
    z: NEWROOM_POS.z - NEWROOM_STRAIGHT_HALF - NEWROOM_CHAMFER / 2,
    halfX: NEWROOM_CHAMFER / 2,
    halfZ: NEWROOM_CHAMFER / 2,
    pad: ROOM_PAD,
  }, // NE
  {
    x: NEWROOM_POS.x - NEWROOM_STRAIGHT_HALF - NEWROOM_CHAMFER / 2,
    z: NEWROOM_POS.z + NEWROOM_STRAIGHT_HALF + NEWROOM_CHAMFER / 2,
    halfX: NEWROOM_CHAMFER / 2,
    halfZ: NEWROOM_CHAMFER / 2,
    pad: ROOM_PAD,
  }, // SW
  {
    x: NEWROOM_POS.x + NEWROOM_STRAIGHT_HALF + NEWROOM_CHAMFER / 2,
    z: NEWROOM_POS.z + NEWROOM_STRAIGHT_HALF + NEWROOM_CHAMFER / 2,
    halfX: NEWROOM_CHAMFER / 2,
    halfZ: NEWROOM_CHAMFER / 2,
    pad: ROOM_PAD,
  }, // SE
];

// An underground tunnel actually running beneath the real path between
// houses, at a lower Y (TUNNEL_Y) — not some separate tunnel off in
// unrelated empty arena. Since the collision system only checks X/Z (see
// resolveObstacleCollisions), reusing the exact same X/Z as the real
// walls/doors means the underground layer is automatically constrained
// to the exact same walkable route as the surface (the same door gaps,
// the same bend through the midroom and corridor 3's jog) — no separate
// collision needed, just every wall mirrored visually at TUNNEL_Y (see
// the scene-building code below) plus an open shaft in each house,
// "piercing through the middle of the house" the way it was asked for,
// rather than tucked in a corner.
const TUNNEL_Y = -3.5;
const TUNNEL_WALL_HEIGHT = 2.2;
const HOLE_HALF_SIZE = 1.65; // square, not round — half-extent (enlarged by 1 unit on request)
const HOLE_INNER_SIZE = HOLE_HALF_SIZE * 2 - 0.4;
// The shaft's footprint, oriented along the house's own tunnel connection
// (see ROOM_TUNNEL_DIR) rather than a plain square — a run, not just a
// point, so the opening reads as a real corridor down into the tunnel,
// with real walkable stairs (see addStairsInHole) filling it.
const RAMP_HALF_WIDTH = HOLE_INNER_SIZE / 2;
const RAMP_RUN_LENGTH = 4.5;
const RAMP_BAND = 0.5;
const ROOM_STAIRS_DOWN_POS = [ROOM_POS, ROOM2_POS, ROOM3_POS, ROOM4_POS, ROOM5_POS, ROOM6_POS];
const TUNNEL_STOPS = ROOM_STAIRS_DOWN_POS.map((p) => ({ x: p.x, z: p.z }));
// Which way each house's staircase actually descends, matching the real
// relative positions — the stairway (see RAMP_RUN_LENGTH) runs forward
// from the house center in this direction, toward the next house in the
// chain. Room 6 is the end of the chain, so it descends back toward Room
// 5 instead.
const ROOM_TUNNEL_DIR = [
  { x: 0, z: -1 }, // Room 1 -> Room 2
  { x: 0, z: -1 }, // Room 2 -> Room 3
  { x: 1, z: 0 }, // Room 3 -> Room 4
  { x: 0, z: -1 }, // Room 4 -> Room 5
  { x: 0, z: -1 }, // Room 5 -> Room 6
  { x: 0, z: 1 }, // Room 6 -> back toward Room 5 (end of the chain)
];
// The stairway's footprint at house i, as world-space (x,z) corners of
// the long rectangle running from the house center (along=0) out to
// RAMP_RUN_LENGTH in that house's descent direction, RAMP_HALF_WIDTH to
// each side — used to cut the matching hole through both the room floor
// and the tunnel ceiling below it.
function stairFootprintCorners(i: number) {
  const center = ROOM_STAIRS_DOWN_POS[i];
  const dir = ROOM_TUNNEL_DIR[i];
  const perpX = -dir.z;
  const perpZ = dir.x;
  const farX = center.x + dir.x * RAMP_RUN_LENGTH;
  const farZ = center.z + dir.z * RAMP_RUN_LENGTH;
  return {
    nearA: { x: center.x + perpX * RAMP_HALF_WIDTH, z: center.z + perpZ * RAMP_HALF_WIDTH },
    nearB: { x: center.x - perpX * RAMP_HALF_WIDTH, z: center.z - perpZ * RAMP_HALF_WIDTH },
    farA: { x: farX + perpX * RAMP_HALF_WIDTH, z: farZ + perpZ * RAMP_HALF_WIDTH },
    farB: { x: farX - perpX * RAMP_HALF_WIDTH, z: farZ - perpZ * RAMP_HALF_WIDTH },
  };
}
// A generous bounding box around every room/corridor, for the
// underground floor+ceiling slabs (see the scene-building code below).
const UNDERGROUND_MIN_X = Math.min(ROOM_POS.x, ROOM2_POS.x, ROOM3_POS.x, ROOM4_POS.x, ROOM5_POS.x, ROOM6_POS.x - ROOM6_WIDTH / 2) - ROOM_SIZE / 2 - 2;
const UNDERGROUND_MAX_X = Math.max(ROOM_POS.x, ROOM2_POS.x, ROOM3_POS.x, ROOM4_POS.x, ROOM5_POS.x, ROOM6_POS.x + ROOM6_WIDTH / 2) + ROOM_SIZE / 2 + 2;
const UNDERGROUND_MIN_Z = Math.min(ROOM_POS.z, ROOM2_POS.z, ROOM3_POS.z, ROOM4_POS.z, ROOM5_POS.z, ROOM6_POS.z - ROOM6_DEPTH / 2) - ROOM_SIZE / 2 - 2;
const UNDERGROUND_MAX_Z = Math.max(ROOM_POS.z, ROOM2_POS.z, ROOM3_POS.z, ROOM4_POS.z, ROOM5_POS.z, ROOM6_POS.z + ROOM6_DEPTH / 2) + ROOM_SIZE / 2 + 2;

const OBSTACLES: Obstacle[] = [
  ...ROOM_POSITIONS.flatMap((pos) => [...roomWallObstacles(pos), ...roomCrateObstacles(pos)]),
  ...MIDROOM_WALLS,
  ...CORRIDOR_WALLS,
  ...CORRIDOR2_WALLS,
  ...CORRIDOR3_WALLS,
  ...CORRIDOR4_WALLS,
  ...ROOM6_WALLS,
  ...CORRIDOR5_WALLS,
  ...NEWROOM_WALLS,
  ...EXTRA_CRATES,
];

// Every door opening in the map, catalogued so a sliding gate can be built
// for each one — closed by default, sliding apart automatically as a
// fighter approaches. `axis` is the direction the two panels slide apart:
// "x" for gaps in a wall that runs along x (north/south walls), "z" for
// gaps in a wall that runs along z (east/west walls).
interface Door {
  x: number;
  z: number;
  width: number;
  axis: "x" | "z";
}

function roomDoors(pos: { x: number; z: number }): Door[] {
  return [
    { x: pos.x, z: pos.z - ROOM_SIZE / 2, width: ROOM_DOOR_WIDTH, axis: "x" }, // north
    { x: pos.x, z: pos.z + ROOM_SIZE / 2, width: ROOM_DOOR_WIDTH, axis: "x" }, // south
    { x: pos.x - ROOM_SIZE / 2, z: pos.z, width: ROOM_DOOR_WIDTH, axis: "z" }, // west
    { x: pos.x + ROOM_SIZE / 2, z: pos.z, width: ROOM_DOOR_WIDTH, axis: "z" }, // east
  ];
}

const DOORS: Door[] = [
  ...ROOM_POSITIONS.flatMap(roomDoors),
  { x: ROOM6_POS.x, z: ROOM6_POS.z + ROOM6_DEPTH / 2, width: ROOM6_DOOR_WIDTH, axis: "x" }, // room6's one remaining door
  { x: MIDROOM_POS.x, z: MIDROOM_SOUTH_Z, width: MIDROOM_DOOR_WIDTH, axis: "x" },
  { x: MIDROOM_POS.x, z: MIDROOM_NORTH_Z, width: MIDROOM_DOOR_WIDTH, axis: "x" },
];

// Pushes a fighter's x/z position out of any obstacle's footprint, kicking
// it out along whichever axis has the least overlap.
function resolveObstacleCollisions(pos: { x: number; z: number }) {
  for (const ob of OBSTACLES) {
    const halfX = ob.halfX + ob.pad;
    const halfZ = ob.halfZ + ob.pad;
    const dx = pos.x - ob.x;
    const dz = pos.z - ob.z;
    if (Math.abs(dx) < halfX && Math.abs(dz) < halfZ) {
      const penX = halfX - Math.abs(dx);
      const penZ = halfZ - Math.abs(dz);
      if (penX < penZ) {
        pos.x = ob.x + halfX * (dx < 0 ? -1 : 1);
      } else {
        pos.z = ob.z + halfZ * (dz < 0 ? -1 : 1);
      }
    }
  }
}

// Whether the straight segment from (x1,z1) to (x2,z2) crosses this
// obstacle's footprint — a standard slab test against its axis-aligned
// rectangle, walked with the segment's own parametric range so a hit
// outside [0,1] (before the start or past the end) doesn't count. Uses
// the bare halfX/halfZ, not the movement-collision `pad` — that padding
// exists to keep a fighter's body from clipping into a wall, not to
// decide whether a bullet's sightline is blocked.
function segmentHitsObstacle(x1: number, z1: number, x2: number, z2: number, ob: Obstacle): boolean {
  const minX = ob.x - ob.halfX;
  const maxX = ob.x + ob.halfX;
  const minZ = ob.z - ob.halfZ;
  const maxZ = ob.z + ob.halfZ;
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Each door opening's sliding gate occupies a *gap* in OBSTACLES (see
// roomWallObstacles) — the wall geometry itself never blocks a shot
// through a doorway, open or closed. The gate panels are what actually
// seal it, and they move (see updateGatePanels in the tick loop), so
// their current footprint can't be a fixed entry in OBSTACLES; it's
// recomputed into this module-level list every tick (see the gate-slide
// block below) and checked by hasLineOfSight right alongside the static
// walls, so a shot is blocked by a still-closed or half-open gate the
// same way it's blocked by a solid wall, and clears the instant the gate
// finishes sliding open.
let gateBlockers: Obstacle[] = [];

// Whether a shot fired from (x1,z1) toward (x2,z2) actually has a clear
// path — walls are modelled as gapped segments (see roomWallObstacles;
// each door opening is a real gap in the geometry, not a separate flag),
// so this needs no special-casing for doors on its own: a shot through an
// open doorway simply never intersects any wall rectangle. The gate
// panels filling that gap (see gateBlockers) are checked separately,
// since a closed door should still stop a shot even though the wall
// behind it has no geometry there.
function hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
  for (const ob of OBSTACLES) {
    if (segmentHitsObstacle(x1, z1, x2, z2, ob)) return false;
  }
  for (const ob of gateBlockers) {
    if (segmentHitsObstacle(x1, z1, x2, z2, ob)) return false;
  }
  return true;
}

const PLAYER_DAMAGE = 14;
const BODY_SEPARATION = 0.85; // minimum center-to-center distance the fighters can close to
const BOT_SPEED = 3.8; // doubled — a fast, aggressive chase once it's spotted the player
const BOT_DAMAGE = 10;
const BOT_ATTACK_COOLDOWN = 1.3;
// The Boss — a sixth, tougher fighter stationed in Room 6 rather than
// roaming with the five regular guards. It doesn't patrol or chase; it
// stands its ground, already armed, and opens fire the moment the player
// comes within range and line of sight.
const BOSS_HP = 260;
const BOSS_DAMAGE = 16;
const BOSS_ATTACK_COOLDOWN = 1.0;
const BOSS_SCALE = 1.35; // visibly bigger than the regular guards
// Each guard's post — off to the side of its own room's center (the
// stairs down to the tunnel sit exactly at that center — see
// ROOM_STAIRS_DOWN_POS — and standing right on top of them used to carry
// a fighter through the stairway's height-follow zone), offset
// perpendicular to that room's own descent direction.
const BOT_GUARD_OFFSET = 6;
function guardSpawnFor(roomIndex: number) {
  const pos = ROOM_STAIRS_DOWN_POS[roomIndex];
  const dir = ROOM_TUNNEL_DIR[roomIndex];
  return { x: pos.x - dir.z * BOT_GUARD_OFFSET, z: pos.z + dir.x * BOT_GUARD_OFFSET };
}
const BOT_SPAWNS = ROOM_POSITIONS.map((_, i) => guardSpawnFor(i));
const BOSS_SPAWN = guardSpawnFor(5); // Room 6
// Wakes the instant the player is actually visible (see hasLineOfSight in
// the tick loop's alert check) rather than only within a small radius —
// DETECTION_RANGE just caps how far off that sight check still counts, set
// generously past the room's own diagonal so "visible anywhere in the
// room" is effectively "visible at all".
const DETECTION_RANGE = 30;
// Near-instant reaction once spotted — a beat just long enough to read as
// noticing the player rather than a jump-cut, not the old telegraphed pause.
const ALERT_TELEGRAPH_DURATION = 0.15;
// Gives up the chase and goes back to patrolling once it's genuinely lost
// the player — no clear line of sight for this long straight, not just
// one blocked frame while rounding a corner. Without this, a bot chasing a
// player who runs out through a door and out of the house has nothing to
// aim for but also nothing telling it to stop trying — it just keeps
// walking at the player's last known direction and piles up against
// whatever's in the way (a wall, a door frame) forever.
const LOSE_SIGHT_GIVEUP = 4;
// While dormant, the bot doesn't just hold one small loop around its post —
// it patrols the room's full interior, only steering clear of the narrow
// strip down the middle where the stairs cut through the floor (see
// PATROL_STAIRS_CLEARANCE below); once it's actually spotted the player it
// switches to the direct chase behavior below instead of these waypoints.
const PATROL_MARGIN = 2; // stays this far in from the room's own walls
const PATROL_STAIRS_CLEARANCE = 2.5; // wider than the stairs' own RAMP_HALF_WIDTH, so a waypoint never lands over the hole
const PATROL_SPEED = BOT_SPEED * 0.9;
const PATROL_ARRIVE_DIST = 0.6;
// There's no dedicated walk clip on this rig (only Idle and a full-sprint
// Running clip) — slowing the run clip's timeScale down to match the
// patrol speed still keeps its full running stride, which reads as a
// slow-motion sprint rather than an actual stroll. Blending it down
// toward idle instead (a partial run weight) softens that stride into
// something closer to an unhurried, restrained walk.
const PATROL_RUN_WEIGHT = 0.65;

// Picks a random waypoint anywhere in the given room's interior (room
// index into ROOM_POSITIONS, i.e. rooms 1-5 — each guard patrols its own
// room) — rejection-sampled against the stairs' own footprint (same
// along/perp rectangle the player's own height-follow check uses, just
// padded out by PATROL_STAIRS_CLEARANCE) so a waypoint never lands over
// the hole in the floor: the bot has no height-follow logic for the
// stairs the way the player does, so walking onto that hole would
// visibly clip it through the floor.
function pickRoomPatrolTarget(roomIndex: number): { x: number; z: number } {
  const roomPos = ROOM_POSITIONS[roomIndex];
  const half = ROOM_SIZE / 2 - PATROL_MARGIN;
  const dir = ROOM_TUNNEL_DIR[roomIndex];
  for (let attempt = 0; attempt < 8; attempt++) {
    const x = roomPos.x + (Math.random() * 2 - 1) * half;
    const z = roomPos.z + (Math.random() * 2 - 1) * half;
    const dx = x - roomPos.x;
    const dz = z - roomPos.z;
    const along = dx * dir.x + dz * dir.z;
    const perp = dz * dir.x - dx * dir.z;
    const overStairs =
      Math.abs(perp) < PATROL_STAIRS_CLEARANCE &&
      along > -RAMP_BAND - PATROL_STAIRS_CLEARANCE &&
      along < RAMP_RUN_LENGTH + RAMP_BAND + PATROL_STAIRS_CLEARANCE;
    if (!overStairs) return { x, z };
  }
  return { x: BOT_SPAWNS[roomIndex].x, z: BOT_SPAWNS[roomIndex].z };
}

const PLAYER_ATTACK_COOLDOWN = 0.55;
const LOOK_SENSITIVITY_BASE = 0.009;
const LOOK_SENSITIVITY_MIN = 0.4;
const LOOK_SENSITIVITY_MAX = 2.5;
const LOOK_SENSITIVITY_STORAGE_KEY = "10sa-look-sensitivity";
// A real firing/recoil animation ("RifleFire", grafted into the glb — see
// the merge that added it) plays on every shot, at its own native mocap
// pace (no artificial speed-up) — an earlier version compressed this into
// a fixed 0.4s window via timeScale, which made the motion look jerky
// instead of a clean recoil. Auto-fire (holding the FIRE button) can
// legitimately retrigger a shot before the previous one's animation
// finishes (the player's 0.55s cooldown is shorter than this), which
// simply restarts the clip from frame 0 — reads as continuous recoil
// rather than a glitch, the same way a real automatic weapon's cycle
// never fully completes between rounds.
const FIRE_ANIM_DURATION = 1.1667;
// How much of FIRE_ANIM_DURATION is spent blending in from / back out to
// whatever the idle/run blend already had that frame, rather than cutting
// straight to/from the fire clip.
const FIRE_FADE_IN = 0.15;
const FIRE_FADE_OUT = 0.4;
// How long a tracer stays visible before it's removed.
const TRACER_DURATION = 0.08;
// Roughly chest height — tracers aim here instead of at the root/feet.
const TRACER_TARGET_HEIGHT = 1.3;
// A new SMG model held in the hand — every fighter actually shoots with it
// (see the fire logic in the tick loop and applyFirePose/spawnTracer),
// with this rig's real finger joints curled around the grip on both
// hands (see curlGunGripFingers) instead of resting against a fixed
// open palm.
//
// Unlike the old rifle model (long axis on local X), this mesh's long
// axis is local Z, muzzle/silencer at -Z (the silencer part's bounding
// box sits at the most-negative Z of the whole mesh, the stock/latches at
// the most-positive Z) — measured directly off the converted glb's own
// part bounding boxes, not guessed. Grip is already a separate named part
// in this mesh, so its own bounding-box center is used directly as the
// hand target instead of a hand-tuned point.
const GUN_GRIP_LOCAL = new THREE.Vector3(0, -10.43, 18.33);
// Where the off-hand actually reaches for (see updateOffHandReach) — much
// further forward than the SMG's own foregrip. That point sits only ~11cm
// from the main grip on this short SMG, which put both hands so close
// together they read as one bunched-up fist instead of a two-handed
// hold; interpolated most of the way from the grip toward the muzzle tip
// (see MUZZLE_TIP_LOCAL) gives the classic "rear hand on the trigger,
// front hand out near the muzzle" look the reference grip has.
const GUN_OFFHAND_TARGET_LOCAL = new THREE.Vector3(0, -10.43, 18.33).lerp(new THREE.Vector3(0, 0, -31.4), 0.75);
const GUN_MUZZLE_AXIS = new THREE.Vector3(0, 0, -1);
// A real SMG is roughly this long; the rest of the transform is derived
// from that, not guessed independently.
const GUN_TARGET_LENGTH = 0.55;
// Where the muzzle should point, in RightHand-local space, at the idle
// pose's frame 0 — measured directly (character-forward transformed into
// RightHand's local frame at that pose). The direction from the grip hand
// to the off-hand (offHandLocal, normalized) looks like the obvious
// choice for this, but measuring both independently showed they're
// nearly orthogonal in this rig's RifleIdle pose — the off-hand doesn't
// sit out along the barrel the way it would on a real two-handed hold, so
// using it for orientation pointed the gun sideways instead of forward.
const GUN_MUZZLE_TARGET_LOCAL = new THREE.Vector3(0.20400064267090037, 0.5153436536777963, -0.8323488792936196);

// The gun model is a static (unskinned) mesh, so one glTF load is shared
// and cloned for whichever fighter needs it.
let gunPrototypePromise: Promise<THREE.Object3D> | null = null;
function loadGunPrototype(): Promise<THREE.Object3D> {
  if (!gunPrototypePromise) {
    gunPrototypePromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        "/characters/gun-smg.glb",
        (gltf) => resolve(gltf.scene),
        undefined,
        reject,
      );
    });
  }
  return gunPrototypePromise;
}

// A plain textured box crate — every face samples the same single crate-face
// texture (a self-contained panel design cropped from the user's own
// texture atlas), rather than loading and UV-mapping a real multi-thousand-
// triangle mesh. Far cheaper (12 triangles vs thousands per instance) and,
// since a flat box face maps that square texture 1:1 with no stretching or
// seams, it actually reads sharper than the real mesh did.
let crateMaterialPromise: Promise<THREE.MeshStandardMaterial> | null = null;
function loadCrateMaterial(): Promise<THREE.MeshStandardMaterial> {
  if (!crateMaterialPromise) {
    crateMaterialPromise = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        "/characters/crate_face.png",
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
        },
        undefined,
        reject,
      );
    });
  }
  return crateMaterialPromise;
}

// Places one box crate at (x,z), sized to the given half-extent and
// resting flush on the floor. Shares the one crate material/texture across
// every instance — crates are static props, nothing ever mutates their
// material per-instance the way a fighter's death-fade does.
function placeCrate(scene: THREE.Scene, material: THREE.MeshStandardMaterial, x: number, z: number, targetHalfExtent: number, rotY: number) {
  const size = targetHalfExtent * 2;
  const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
  crate.rotation.y = rotY;
  crate.position.set(x, targetHalfExtent, z);
  crate.receiveShadow = true;
  scene.add(crate);
}

// Parents a clone of the shared gun model onto a fighter's RightHand bone,
// sized and oriented so the barrel points forward (see
// GUN_MUZZLE_TARGET_LOCAL). Anchored purely off the grip hand — nudging
// the whole gun to also land the foregrip exactly on the off-hand
// (offHandLocal) dragged the grip itself away from RightHand and made it
// look like it was floating outside the hand instead of held in it; a
// solidly-gripped gun that isn't perfectly foregrip-touching reads better
// than a foregrip-perfect gun that visibly isn't in the hand at all.
function createGunAttachment(hand: THREE.Object3D, prototype: THREE.Object3D): THREE.Object3D {
  // hand.matrixWorld isn't guaranteed current here — this runs as soon as
  // the shared gun prototype resolves, which can be before the scene has
  // ever been rendered (matrixWorld only recomputes on render or an
  // explicit update), so a stale identity-scale matrix would silently
  // undo this rig's ~0.0094 model scale and shrink the gun to a speck.
  hand.updateWorldMatrix(true, false);
  const worldScale = new THREE.Vector3();
  hand.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
  const gun = prototype.clone(true);
  const rawLength = 79.03;
  const scale = (GUN_TARGET_LENGTH / rawLength) / (worldScale.x || 1);
  gun.scale.setScalar(scale);
  gun.quaternion.setFromUnitVectors(GUN_MUZZLE_AXIS, GUN_MUZZLE_TARGET_LOCAL.clone().normalize());
  gun.position.copy(GUN_GRIP_LOCAL).multiplyScalar(scale).applyQuaternion(gun.quaternion).multiplyScalar(-1);
  hand.add(gun);
  return gun;
}

// Rotates `bone` (in place, preserving its parent's current orientation)
// so the ray from `bone` to `child` points at `targetWorld` instead of
// wherever the baked animation clip currently has it — a single-joint
// aim, not a full two-bone IK solve, but enough to visibly plant the
// off-hand's forearm toward the gun's foregrip instead of leaving it
// hanging wherever RifleIdle's own arm pose happens to put it (that pose
// doesn't reach out along the barrel the way a real two-handed grip
// would — see GUN_MUZZLE_TARGET_LOCAL's comment). Computed in world
// space and converted back into the bone's own local space, since
// `bone.quaternion` is relative to its parent, not the world.
const reachDelta = new THREE.Quaternion();
const reachParentWorldQuat = new THREE.Quaternion();
const reachBoneWorldQuat = new THREE.Quaternion();
const reachBonePos = new THREE.Vector3();
const reachChildPos = new THREE.Vector3();
function pointBoneToward(bone: THREE.Object3D, child: THREE.Object3D, targetWorld: THREE.Vector3) {
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(true, false);
  bone.getWorldPosition(reachBonePos);
  child.getWorldPosition(reachChildPos);
  const currentDir = reachChildPos.clone().sub(reachBonePos).normalize();
  const targetDir = targetWorld.clone().sub(reachBonePos).normalize();
  reachDelta.setFromUnitVectors(currentDir, targetDir);
  bone.getWorldQuaternion(reachBoneWorldQuat);
  bone.parent!.getWorldQuaternion(reachParentWorldQuat);
  const newWorldQuat = reachDelta.multiply(reachBoneWorldQuat);
  bone.quaternion.copy(reachParentWorldQuat.invert().multiply(newWorldQuat));
}

// A real two-bone IK solve (law of cosines for the elbow bend, then
// pointBoneToward twice — once to swing the upper arm so the elbow
// lands where the math says it must, once to bend the forearm the rest
// of the way onto the target) instead of rotating only the forearm.
// Rotating just the forearm can only ever place the hand somewhere on a
// sphere centered on the (fixed-position) elbow, and if the real target
// is farther from the elbow than the forearm is long, it physically
// can't reach — the hand just points at the target and stops short,
// which is exactly why the off-hand used to land back near the grip
// hand instead of out at the foregrip. Swinging the shoulder first
// moves the elbow itself out along the target direction so the
// remaining forearm-only correction actually has enough reach.
const ikShoulderPos = new THREE.Vector3();
const ikElbowPos = new THREE.Vector3();
const ikHandPos = new THREE.Vector3();
const ikTargetDir = new THREE.Vector3();
const ikPoleDir = new THREE.Vector3();
const ikBendAxis = new THREE.Vector3();
const ikDesiredElbowPos = new THREE.Vector3();
function solveTwoBoneIK(shoulder: THREE.Object3D, elbow: THREE.Object3D, hand: THREE.Object3D, targetWorld: THREE.Vector3, poleWorld: THREE.Vector3) {
  shoulder.updateWorldMatrix(true, false);
  elbow.updateWorldMatrix(true, false);
  hand.updateWorldMatrix(true, false);
  shoulder.getWorldPosition(ikShoulderPos);
  elbow.getWorldPosition(ikElbowPos);
  hand.getWorldPosition(ikHandPos);

  const upperLen = ikShoulderPos.distanceTo(ikElbowPos);
  const foreLen = ikElbowPos.distanceTo(ikHandPos);

  ikTargetDir.copy(targetWorld).sub(ikShoulderPos);
  let targetDist = ikTargetDir.length();
  const maxReach = upperLen + foreLen - 0.001;
  const minReach = Math.abs(upperLen - foreLen) + 0.001;
  targetDist = clamp(targetDist, minReach, maxReach);
  ikTargetDir.normalize();

  // Angle at the shoulder, between shoulder->target and shoulder->elbow,
  // once the elbow is bent to actually put the hand on the target.
  const cosShoulderAngle = clamp(
    (upperLen * upperLen + targetDist * targetDist - foreLen * foreLen) / (2 * upperLen * targetDist),
    -1, 1,
  );
  const shoulderAngle = Math.acos(cosShoulderAngle);

  // The pole vector picks which side the elbow bends toward — without
  // it the shoulder angle alone leaves the bend direction undefined
  // (any point on a cone around the target direction would satisfy the
  // law of cosines).
  ikPoleDir.copy(poleWorld).sub(ikShoulderPos);
  ikBendAxis.crossVectors(ikTargetDir, ikPoleDir);
  if (ikBendAxis.lengthSq() < 1e-8) ikBendAxis.set(1, 0, 0);
  ikBendAxis.normalize();

  ikDesiredElbowPos.copy(ikTargetDir).applyAxisAngle(ikBendAxis, shoulderAngle).multiplyScalar(upperLen).add(ikShoulderPos);

  pointBoneToward(shoulder, elbow, ikDesiredElbowPos);
  pointBoneToward(elbow, hand, targetWorld);
}

// Bends a fighter's off-hand (shoulder + elbow), every tick, so the
// off-hand visibly reaches all the way to the gun's foregrip (see
// solveTwoBoneIK) — has to run every tick, not just once at gun-attach
// time, since the idle/run/fire mocap clips keep re-driving these arm
// bones' rotations on every mixer.update, which would otherwise
// immediately undo a one-time snap.
const offHandForward = new THREE.Vector3();
const offHandPoleWorld = new THREE.Vector3();
function updateOffHandReach(rig: FighterRig) {
  if (!rig.gun || !rig.leftArm || !rig.leftForeArm || !rig.leftHand) return;
  rig.gun.updateWorldMatrix(true, false);
  const foregripWorld = GUN_OFFHAND_TARGET_LOCAL.clone().applyMatrix4(rig.gun.matrixWorld);
  rig.leftArm.updateWorldMatrix(true, false);
  rig.leftArm.getWorldPosition(offHandPoleWorld);
  offHandForward.set(Math.sin(rig.root.rotation.y), 0, Math.cos(rig.root.rotation.y));
  // Elbow bends down and slightly forward from the shoulder, like a
  // natural two-handed grip, instead of an arbitrary/undefined direction.
  offHandPoleWorld.y -= 1;
  offHandPoleWorld.addScaledVector(offHandForward, 0.3);
  solveTwoBoneIK(rig.leftArm, rig.leftForeArm, rig.leftHand, foregripWorld, offHandPoleWorld);
}

// Curls a hand's finger joints in around the gun grip/foregrip — each
// joint gets a fixed rotation about its local Z axis, applied once at
// gun-attach time. This only needs to run once (not every tick): the
// rig's baked clips don't touch the finger bones at all, so there's
// nothing to fight frame to frame, and re-applying it every tick would
// just keep curling the fingers further closed. `mirror` flips the
// rotation sign for the off-hand, whose finger bones are mirrored across
// the skeleton's centerline.
const FINGER_CURL_AXIS = new THREE.Vector3(0, 0, 1);
const FINGER_CURL_ANGLES: Record<string, number> = {
  Index1: 0.55, Index2: 0.7, Index3: 0.6,
  Middle1: 0.6, Middle2: 0.75, Middle3: 0.65,
  Ring1: 0.65, Ring2: 0.8, Ring3: 0.7,
  Pinky1: 0.7, Pinky2: 0.85, Pinky3: 0.75,
  Thumb1: 0.2, Thumb2: 0.4, Thumb3: 0.35,
};
const fingerCurlQuat = new THREE.Quaternion();
function curlGunGripFingers(fingers: Record<string, THREE.Object3D>, mirror: 1 | -1) {
  for (const [joint, angle] of Object.entries(FINGER_CURL_ANGLES)) {
    const bone = fingers[joint];
    if (!bone) continue;
    fingerCurlQuat.setFromAxisAngle(FINGER_CURL_AXIS, angle * mirror);
    bone.quaternion.multiply(fingerCurlQuat);
  }
}

// A point roughly at the gun's muzzle tip, in the raw (unscaled, unrotated)
// mesh's own local space — the silencer's front face, at the mesh's own
// most-negative-Z extent (see the muzzle-axis measurement above).
const MUZZLE_TIP_LOCAL = new THREE.Vector3(0, 0, -31.4);

// Blends in the real "RifleFire" mocap clip (see the merge that grafted it
// into the glb) over whatever idle/run weights updateLocomotionAnim just
// set for this frame — replaces the old hand-tuned axis-angle recoil kick
// entirely now that a real firing animation exists. `rig.fireAction` is
// reset and (re)started once, right when the shot is fired (see the fire
// trigger sites in the tick loop); this runs every tick afterward purely
// to manage the crossfade weight while it plays out. Scaling the existing
// idle/run weights down by (1 - w), rather than just setting fireAction's
// weight alongside them unscaled, keeps the three actions properly
// normalized (summing to ~1) regardless of whether the fighter happens to
// be standing still or mid-run when the shot goes off.
function applyFirePose(rig: FighterRig, t: number) {
  if (!rig.fireAction) return;
  const w =
    t < FIRE_FADE_IN
      ? t / FIRE_FADE_IN
      : t > FIRE_ANIM_DURATION - FIRE_FADE_OUT
        ? clamp((FIRE_ANIM_DURATION - t) / FIRE_FADE_OUT, 0, 1)
        : 1;
  rig.fireAction.setEffectiveWeight(w);
  if (rig.idleAction) rig.idleAction.setEffectiveWeight(rig.idleAction.getEffectiveWeight() * (1 - w));
  if (rig.runAction) rig.runAction.setEffectiveWeight(rig.runAction.getEffectiveWeight() * (1 - w));
}

// A short-lived bright line from the gun's muzzle to whatever it just hit
// (or, on a miss, straight out to GUN_RANGE) — spawned per shot and ticked
// down by updateTracers until its lifetime runs out, at which point it's
// removed and disposed.
interface Tracer {
  line: THREE.Line;
  t: number;
}

function spawnTracer(scene: THREE.Scene, gun: THREE.Object3D | null, from: THREE.Vector3, to: THREE.Vector3): Tracer {
  const start = gun ? MUZZLE_TIP_LOCAL.clone().applyMatrix4(gun.matrixWorld) : from;
  const geometry = new THREE.BufferGeometry().setFromPoints([start, to]);
  const material = new THREE.LineBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 1 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return { line, t: 0 };
}

function updateTracers(tracers: Tracer[], dt: number) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tracer = tracers[i];
    tracer.t += dt;
    if (tracer.t >= TRACER_DURATION) {
      tracer.line.geometry.dispose();
      (tracer.line.material as THREE.Material).dispose();
      tracer.line.parent?.remove(tracer.line);
      tracers.splice(i, 1);
    } else {
      (tracer.line.material as THREE.LineBasicMaterial).opacity = 1 - tracer.t / TRACER_DURATION;
    }
  }
}

// The rig ships two real motion-captured clips grafted into the same
// glb — "Idle" and "Running" (same skeleton, so no retargeting needed) —
// crossfaded by weight based on current speed. This replaces the earlier
// hand-guessed sine-wave/IK locomotion entirely: the actual footwork,
// hip motion and push-off now come from real human motion capture, not
// approximated biomechanics.
//
// `runWeight` (0..1) blends Idle -> Running. `actualSpeed` (world units
// per second) drives the clip's playback rate: at RUN_REFERENCE_SPEED it
// plays at its natural, captured pace (timeScale 1); faster or slower
// movement speeds the cycle up or down to match, which is what keeps the
// feet from sliding relative to how far the root is actually travelling.
const RUN_REFERENCE_SPEED = PLAYER_MAX_SPEED;
const RUN_CLIP_MIN_TIMESCALE = 0.35;
const RUN_CLIP_MAX_TIMESCALE = 1.6;

function updateLocomotionAnim(rig: FighterRig, runWeight: number, actualSpeed: number) {
  if (!rig.idleAction || !rig.runAction) return;
  const w = clamp(runWeight, 0, 1);
  rig.idleAction.setEffectiveWeight(1 - w);
  rig.runAction.setEffectiveWeight(w);
  rig.runAction.timeScale = clamp(actualSpeed / RUN_REFERENCE_SPEED, RUN_CLIP_MIN_TIMESCALE, RUN_CLIP_MAX_TIMESCALE);
}

// A bot's movement is otherwise just "walk straight at the target" — with
// no awareness of the level's own geometry, that reads as mindless the
// moment a wall, crate, or door frame sits between it and where it's
// trying to go: it just keeps shoving into the obstacle every frame,
// pinned in place until it happens to get shoved clear. chooseHeading
// below is what actually fixes that — it looks a short distance ahead
// along the intended heading (the same segment-vs-obstacle test
// hasLineOfSight uses for gunfire) and, if that's blocked, tries
// progressively wider swings left/right of it until it finds one that
// isn't — an actual "which way avoids the wall" decision made before
// contact, not just a reaction to already being stuck.
const AVOID_PROBE_DIST = 1.4;
const AVOID_STEER_ANGLES = [0, 20, -20, 40, -40, 65, -65, 90, -90].map((d) => THREE.MathUtils.degToRad(d));

function probeClear(x: number, z: number, dirX: number, dirZ: number, dist: number): boolean {
  const toX = x + dirX * dist;
  const toZ = z + dirZ * dist;
  for (const ob of OBSTACLES) {
    if (segmentHitsObstacle(x, z, toX, toZ, ob)) return false;
  }
  for (const ob of gateBlockers) {
    if (segmentHitsObstacle(x, z, toX, toZ, ob)) return false;
  }
  return true;
}

// Tries the intended heading first, then increasingly wide swings to
// either side of it (see AVOID_STEER_ANGLES), returning the first one
// whose short look-ahead probe is actually clear — or null if every
// angle it tried is blocked (properly boxed into a corner), in which
// case moveWithAvoidance falls back to its older reactive nudge below.
function chooseHeading(x: number, z: number, dirX: number, dirZ: number): { x: number; z: number } | null {
  for (const angle of AVOID_STEER_ANGLES) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = dirX * cos - dirZ * sin;
    const rz = dirX * sin + dirZ * cos;
    if (probeClear(x, z, rx, rz, AVOID_PROBE_DIST)) return { x: rx, z: rz };
  }
  return null;
}

// This tracks how much ground a bot is actually covering versus how much
// its heading implies, purely as a last-resort fallback for the rare case
// chooseHeading can't find any clear angle at all (a proper dead end) —
// once it's been making close to zero progress for a bit, it starts
// steering mostly sideways (around whatever it's stuck on) instead of
// straight ahead, flipping which side it tries if that's blocked too.
const STUCK_AVOID_DELAY = 0.35;
const STUCK_AVOID_FLIP_DELAY = 1.1;
function moveWithAvoidance(
  rig: FighterRig,
  st: { stuckT: number; avoidSign: 1 | -1 },
  dirX: number,
  dirZ: number,
  speed: number,
  dt: number,
) {
  const beforeX = rig.root.position.x;
  const beforeZ = rig.root.position.z;

  const heading = chooseHeading(beforeX, beforeZ, dirX, dirZ);
  let moveX: number;
  let moveZ: number;
  if (heading) {
    moveX = heading.x;
    moveZ = heading.z;
  } else if (st.stuckT > STUCK_AVOID_DELAY) {
    // Mostly sideways (perpendicular to the blocked heading), with a
    // little forward bias so it still drifts back on course once clear.
    moveX = -dirZ * st.avoidSign * 0.85 + dirX * 0.25;
    moveZ = dirX * st.avoidSign * 0.85 + dirZ * 0.25;
  } else {
    moveX = dirX;
    moveZ = dirZ;
  }

  rig.root.position.x = clamp(rig.root.position.x + moveX * speed * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
  rig.root.position.z = clamp(rig.root.position.z + moveZ * speed * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
  resolveObstacleCollisions(rig.root.position);
  const moved = Math.hypot(rig.root.position.x - beforeX, rig.root.position.z - beforeZ);
  if (moved < speed * dt * 0.3) {
    st.stuckT += dt;
    if (st.stuckT > STUCK_AVOID_FLIP_DELAY) {
      st.avoidSign = st.avoidSign === 1 ? -1 : 1;
      st.stuckT = STUCK_AVOID_DELAY;
    }
  } else {
    st.stuckT = Math.max(0, st.stuckT - dt * 2);
  }
}

// "DeathFromBackHeadshot" is a real mocap collapse clip (retargeted from
// Mixamo, same skeleton, grafted into the glb) — its length here must
// match the merged clip's actual duration (see the merge that grafted it
// in). Root motion (the stagger/fall itself) is baked into the Hips
// bone's own keyframes, so playing the clip is enough; nothing needs to
// drive rig.root's transform by hand anymore.
const DEATH_ANIM_DURATION = 3.7;
const DEATH_FADE_DELAY = 2.7;
const DEATH_FADE_DURATION = 1.0;
const DEATH_TOTAL_DURATION = DEATH_ANIM_DURATION;

// Starts a defeated fighter's real death animation — cuts idle/run/fire
// to silence (a terminal pose doesn't need to keep blending against
// them) and plays the mocap collapse once, holding its last frame.
function startDeath(rig: FighterRig) {
  rig.idleAction?.setEffectiveWeight(0);
  rig.runAction?.setEffectiveWeight(0);
  rig.fireAction?.setEffectiveWeight(0);
  if (rig.deathAction) {
    rig.deathAction.reset();
    rig.deathAction.setEffectiveWeight(1);
    rig.deathAction.play();
  }
}

// Fades a defeated fighter out once the death animation has had time to
// land — the clip itself doesn't disappear the body, so this still
// drives material opacity by hand.
function applyDeathPose(rig: FighterRig, t: number) {
  const fadeP = clamp((t - DEATH_FADE_DELAY) / DEATH_FADE_DURATION, 0, 1);
  for (const mat of rig.materials) {
    mat.transparent = true;
    mat.opacity = 1 - fadeP;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Frame-rate-independent exponential smoothing: eases `current` toward
// `target` at `rate` per second regardless of dt, instead of a per-frame
// lerp factor that speeds up or slows down with the frame rate.
function approach(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

// Same, but for an angle: turns the short way around instead of the long
// way when the target crosses the -pi/pi wraparound.
function dampAngle(current: number, target: number, rate: number, dt: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-rate * dt));
}

interface FighterRig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  // Real motion-captured clips (same skeleton as this rig, grafted into
  // the same glb) crossfaded by weight based on current speed — replaces
  // the old hand-guessed sine/IK locomotion entirely.
  idleAction: THREE.AnimationAction | null;
  runAction: THREE.AnimationAction | null;
  // The real "RifleFire" mocap clip — reset and (re)started once per shot
  // (see the fire trigger sites in the tick loop), crossfaded against
  // idle/run every tick afterward while it plays out (see applyFirePose).
  fireAction: THREE.AnimationAction | null;
  // The real "DeathFromBackHeadshot" mocap clip — reset and (re)started
  // once a fighter's HP hits zero (see startDeath), then just left to
  // play out and hold its last frame (LoopOnce + clampWhenFinished).
  deathAction: THREE.AnimationAction | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  // Set once the shared gun model resolves and gets parented to RightHand
  // (see equipGun) — used to find the muzzle's current world position when
  // firing, so the tracer actually starts from the gun instead of the hand.
  gun: THREE.Object3D | null;
  // Real per-finger joints on this rig (mixamorig standard skeleton),
  // keyed by e.g. "Index1"/"Thumb2" — curled once around the grip/foregrip
  // at gun-attach time (see curlGunGripFingers) rather than every tick,
  // since the rig's baked clips never touch them.
  rightFingers: Record<string, THREE.Object3D>;
  leftFingers: Record<string, THREE.Object3D>;
  materials: THREE.MeshStandardMaterial[];
}

// Loads the one character model we have twice — once as the player (its
// natural color) and once as the bot (red-tinted) — since there's no
// separate enemy asset yet.
function loadFighter(
  scene: THREE.Scene,
  tint: THREE.ColorRepresentation,
  onLoaded: (rig: FighterRig) => void,
) {
  new GLTFLoader().load(
    "/characters/char-1.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 1.6 / (size.y || 1);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      // This is a standard Mixamo skeleton (mixamorig-prefixed bone
      // names), including real per-finger joints on both hands — captured
      // below so the gun's grip hand can actually curl around it (see
      // curlGunGripFingers).
      let rightArm: THREE.Object3D | null = null;
      let rightForeArm: THREE.Object3D | null = null;
      let rightHand: THREE.Object3D | null = null;
      let leftArm: THREE.Object3D | null = null;
      let leftForeArm: THREE.Object3D | null = null;
      let leftHand: THREE.Object3D | null = null;
      const rightFingers: Record<string, THREE.Object3D> = {};
      const leftFingers: Record<string, THREE.Object3D> = {};
      const materials: THREE.MeshStandardMaterial[] = [];

      model.traverse((o) => {
        if (o.name === "mixamorigRightArm") rightArm = o;
        if (o.name === "mixamorigRightForeArm") rightForeArm = o;
        if (o.name === "mixamorigRightHand") rightHand = o;
        if (o.name === "mixamorigLeftArm") leftArm = o;
        if (o.name === "mixamorigLeftForeArm") leftForeArm = o;
        if (o.name === "mixamorigLeftHand") leftHand = o;
        const rightFinger = o.name.match(/^mixamorigRightHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (rightFinger) rightFingers[`${rightFinger[1]}${rightFinger[2]}`] = o;
        const leftFinger = o.name.match(/^mixamorigLeftHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (leftFinger) leftFingers[`${leftFinger[1]}${leftFinger[2]}`] = o;
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const src = mesh.material as THREE.MeshStandardMaterial;
        const mat = src.clone();
        const tintColor = new THREE.Color(tint);
        // This model's texture is baked mostly as an emissive map (full-
        // intensity emissiveFactor), so tinting only the base `color`
        // barely shows — the glow washes it out. Tint emissive too.
        mat.color = src.color.clone().multiply(tintColor);
        if (mat.emissive) mat.emissive = src.emissive.clone().multiply(tintColor);
        mesh.material = mat;
        materials.push(mat);
      });

      const root = new THREE.Group();
      root.add(model);
      scene.add(root);

      let mixer: THREE.AnimationMixer | null = null;
      let idleAction: THREE.AnimationAction | null = null;
      let runAction: THREE.AnimationAction | null = null;
      let fireAction: THREE.AnimationAction | null = null;
      let deathAction: THREE.AnimationAction | null = null;
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        // "RifleIdle" is a real two-handed rifle-holding mocap clip
        // (retargeted from Mixamo, matched against a reference screenshot)
        // — every fighter is armed on spawn, so this is the default stance
        // now, ahead of the plain "IdleBreathing" clip.
        const idleClip = gltf.animations.find((c) => c.name === "RifleIdle") ?? gltf.animations.find((c) => c.name === "IdleBreathing") ?? gltf.animations.find((c) => c.tracks.length > 0) ?? gltf.animations[0];
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        // "RifleRun" (retargeted from Mixamo) is preferred over the plain
        // "Running" clip's normal arm swing, to match the RifleIdle stance
        // above.
        const runClip = gltf.animations.find((c) => c.name === "RifleRun") ?? gltf.animations.find((c) => c.name === "Running");
        if (runClip) {
          runAction = mixer.clipAction(runClip);
          runAction.play();
          runAction.setEffectiveWeight(0);
        }
        // "RifleFire" is a real firing/recoil mocap clip — played once per
        // shot (LoopOnce + clampWhenFinished, so it holds its last frame
        // rather than looping), crossfaded in over idle/run by
        // applyFirePose. Kept at weight 0 and already playing here so the
        // mixer has it bound and ready; each shot just resets its time
        // back to 0 (see the fire trigger sites in the tick loop) rather
        // than creating a new action.
        const fireClip = gltf.animations.find((c) => c.name === "RifleFire");
        if (fireClip) {
          fireAction = mixer.clipAction(fireClip);
          fireAction.setLoop(THREE.LoopOnce, 1);
          fireAction.clampWhenFinished = true;
          fireAction.play();
          fireAction.setEffectiveWeight(0);
        }
        // "DeathFromBackHeadshot" — a real mocap collapse, played once on
        // death (LoopOnce + clampWhenFinished) and left holding its last
        // frame (see startDeath).
        const deathClip = gltf.animations.find((c) => c.name === "DeathFromBackHeadshot");
        if (deathClip) {
          deathAction = mixer.clipAction(deathClip);
          deathAction.setLoop(THREE.LoopOnce, 1);
          deathAction.clampWhenFinished = true;
          deathAction.play();
          deathAction.setEffectiveWeight(0);
        }
      }

      onLoaded({ root, mixer, idleAction, runAction, fireAction, deathAction, rightArm, rightForeArm, rightHand, leftArm, leftForeArm, leftHand, gun: null, rightFingers, leftFingers, materials });
    },
    undefined,
    (err) => console.error("Failed to load fighter model", err),
  );
}

// --- New bot character (a different Mixamo model/skeleton from char-1,
// supplied with its own textures) ---------------------------------------
//
// This model only comes with a single frozen-pose "animation" baked in (no
// real idle/run/fire/death mocap of its own), so instead it borrows char-1's
// named clips (RifleIdle/RifleRun/RifleFire/DeathFromBackHeadshot) and
// retargets them onto its own skeleton at load time. Both are genuine
// Mixamo rigs sharing the same bone-naming/axis convention, so a clip
// authored for one plays back correctly on the other once each bone's
// rotation is re-expressed as a delta from its OWN rest pose (rather than
// copied as an absolute value from char-1's rest pose) — literal copying
// (tried first) produced a wildly mangled pose, since the two models don't
// share an identical rest pose or unit scale.

// Captures every named node's local rest transform (position + rotation)
// right after load, before any clip has been played — this is what
// retargetClip measures each animated frame against.
function captureRestPose(root: THREE.Object3D): Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }> {
  const map = new Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>();
  root.traverse((o) => {
    map.set(o.name, { pos: o.position.clone(), quat: o.quaternion.clone() });
  });
  return map;
}

// Re-expresses `clip` (authored against skeleton A's rest pose) onto
// skeleton B: each quaternion keyframe becomes restB * (restA^-1 * animQ) —
// the same rotation *delta* from A's own rest pose, reapplied on top of B's
// own rest pose. Position keyframes (root motion, e.g. the Hips bone's
// bounce) get the same delta-from-rest treatment, additionally scaled by
// posRatio (the two models' native, pre-normalization heights) since the
// two source assets were exported in different real-world unit scales.
function retargetClip(
  clip: THREE.AnimationClip,
  restA: Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>,
  restB: Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>,
  posRatio: number,
): THREE.AnimationClip {
  const newTracks: THREE.KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const dot = track.name.lastIndexOf(".");
    const boneName = track.name.slice(0, dot);
    const prop = track.name.slice(dot + 1);
    const a = restA.get(boneName);
    const b = restB.get(boneName);
    if (!a || !b) {
      newTracks.push(track.clone());
      continue;
    }
    if (prop === "quaternion" && track instanceof THREE.QuaternionKeyframeTrack) {
      const values = track.values.slice();
      const restAInv = a.quat.clone().invert();
      for (let i = 0; i < values.length; i += 4) {
        const animQ = new THREE.Quaternion(values[i], values[i + 1], values[i + 2], values[i + 3]);
        const delta = restAInv.clone().multiply(animQ);
        const newQ = b.quat.clone().multiply(delta);
        values[i] = newQ.x;
        values[i + 1] = newQ.y;
        values[i + 2] = newQ.z;
        values[i + 3] = newQ.w;
      }
      newTracks.push(new THREE.QuaternionKeyframeTrack(track.name, track.times.slice() as unknown as number[], values as unknown as number[]));
    } else if (prop === "position") {
      const values = track.values.slice();
      for (let i = 0; i < values.length; i += 3) {
        const dx = (values[i] - a.pos.x) * posRatio;
        const dy = (values[i + 1] - a.pos.y) * posRatio;
        const dz = (values[i + 2] - a.pos.z) * posRatio;
        values[i] = b.pos.x + dx;
        values[i + 1] = b.pos.y + dy;
        values[i + 2] = b.pos.z + dz;
      }
      newTracks.push(new THREE.VectorKeyframeTrack(track.name, track.times.slice() as unknown as number[], values as unknown as number[]));
    } else {
      newTracks.push(track.clone());
    }
  }
  return new THREE.AnimationClip(clip.name + "Retarget", clip.duration, newTracks);
}

// A reference video the user supplied — a crouched, forward-leaning
// tactical sprint (a different, stealthier style than char-1's upright
// rifle run) — showed the sprint style they wanted the bot to move like.
// True per-frame motion capture from that clip isn't possible (it's
// gameplay footage of another game viewed from a steep isometric camera,
// not a real person on video a pose-estimator could read), so instead
// this leans the bot's real running mocap forward and drops its hip
// height a bit — the actual foot-timing/weight-shift stays real motion
// capture, just biased toward that crouched-sprint silhouette.
const RUN_LEAN_BONES = ["mixamorigSpine", "mixamorigSpine1", "mixamorigSpine2"];
const RUN_LEAN_PER_BONE = THREE.MathUtils.degToRad(9); // ~27 total forward lean across the three
const RUN_HIP_DROP_FRACTION = 0.05; // as a fraction of the source rig's native height
function applyCrouchedSprintBias(clip: THREE.AnimationClip, hipsBoneName: string, hipDropNative: number): THREE.AnimationClip {
  const leanQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), RUN_LEAN_PER_BONE);
  const newTracks = clip.tracks.map((track) => {
    const dot = track.name.lastIndexOf(".");
    const boneName = track.name.slice(0, dot);
    const prop = track.name.slice(dot + 1);
    if (prop === "quaternion" && RUN_LEAN_BONES.includes(boneName) && track instanceof THREE.QuaternionKeyframeTrack) {
      const values = track.values.slice();
      for (let i = 0; i < values.length; i += 4) {
        const q = new THREE.Quaternion(values[i], values[i + 1], values[i + 2], values[i + 3]);
        q.multiply(leanQuat);
        values[i] = q.x;
        values[i + 1] = q.y;
        values[i + 2] = q.z;
        values[i + 3] = q.w;
      }
      return new THREE.QuaternionKeyframeTrack(track.name, track.times.slice() as unknown as number[], values as unknown as number[]);
    }
    if (prop === "position" && boneName === hipsBoneName) {
      const values = track.values.slice();
      for (let i = 1; i < values.length; i += 3) {
        values[i] -= hipDropNative;
      }
      return new THREE.VectorKeyframeTrack(track.name, track.times.slice() as unknown as number[], values as unknown as number[]);
    }
    return track.clone();
  });
  return new THREE.AnimationClip(clip.name + "CrouchSprint", clip.duration, newTracks);
}

interface SourceRigData {
  clips: Map<string, THREE.AnimationClip>;
  rest: Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>;
  nativeHeight: number;
}

// char-1.glb loaded once purely to harvest its named clips + rest pose for
// retargeting onto the new bot — cached the same way loadGunPrototype
// caches the gun model, so a second bot spawn wouldn't reload it.
let sourceRigDataPromise: Promise<SourceRigData> | null = null;
function loadSourceRigData(): Promise<SourceRigData> {
  if (!sourceRigDataPromise) {
    sourceRigDataPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        "/characters/char-1.glb",
        (gltf) => {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const nativeHeight = box.getSize(new THREE.Vector3()).y || 1;
          const rest = captureRestPose(gltf.scene);
          const clips = new Map<string, THREE.AnimationClip>();
          for (const name of ["RifleIdle", "RifleRun", "RifleFire", "DeathFromBackHeadshot"]) {
            const clip = gltf.animations.find((c) => c.name === name);
            if (clip) clips.set(name, clip);
          }
          resolve({ clips, rest, nativeHeight });
        },
        undefined,
        reject,
      );
    });
  }
  return sourceRigDataPromise;
}

// The bot model's own glTF, fetched and parsed once per URL and reused for
// every instance — six copies of this (5 guards + the Boss, see
// BOT_SPAWNS/BOSS_SPAWN) each calling `new GLTFLoader().load` fresh used to
// mean six independent GPU uploads of the same ~29k-triangle mesh and its
// five PBR textures (diffuse/normal/specular/glossiness/emissive), which is
// exactly the kind of redundant GPU memory pressure that reads as "lag" on
// a real phone even though it never showed up in this sandbox's headless
// testing. Cached the same way loadGunPrototype/loadSourceRigData are.
const botGltfCache = new Map<string, Promise<Awaited<ReturnType<InstanceType<typeof GLTFLoader>["loadAsync"]>>>>();
function loadBotGltf(url: string) {
  let promise = botGltfCache.get(url);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      new GLTFLoader().load(url, resolve, undefined, reject);
    });
    botGltfCache.set(url, promise);
  }
  return promise;
}

// Loads the new bot character model, retargeting char-1's named clips onto
// its own skeleton (see retargetClip above). Unlike loadFighter, this never
// tints the material — the user supplied this character with its own
// finished texture, and it must reach the game exactly as authored.
function loadBotFighter(scene: THREE.Scene, url: string, onLoaded: (rig: FighterRig) => void) {
  Promise.all([loadBotGltf(url), loadSourceRigData()])
    .then(([gltf, source]) => {
      // Object3D.copy() (which Object3D.clone() calls under the hood, and
      // which SkeletonUtils.clone uses internally for the initial deep
      // copy) copies matrixWorld by value from source to clone — it's
      // never recomputed fresh for the clone. The cached gltf.scene here
      // never gets added to a real scene/rendered on its own (only clones
      // of it are), so its bones' matrixWorld is still each Bone's
      // default-constructed identity the first time anything clones it —
      // and every clone then inherits that same never-posed identity
      // matrixWorld, making a cloned SkinnedMesh's own computeBoundingBox()
      // (which Box3.setFromObject ends up calling below, and which reads
      // bone.matrixWorld, not the bones' local transforms) come back
      // wildly wrong on the very first clone (seen in testing as a
      // fighter measuring ~600x too tall, rendered as giant legs floating
      // over the player's head). Forcing one Box3 computation directly on
      // the shared source first — which recursively walks its hierarchy
      // and does correctly populate every bone's matrixWorld from its
      // local transform, bottom-up — fixes every clone made afterward,
      // since each one now inherits valid matrixWorld from the source
      // instead of the default identity.
      new THREE.Box3().setFromObject(gltf.scene);
      const model = cloneSkinnedObject(gltf.scene) as THREE.Object3D;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const nativeHeight = size.y || 1;
      const restNewbot = captureRestPose(model);
      const posRatio = nativeHeight / source.nativeHeight;

      const scale = 1.6 / nativeHeight;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      let rightArm: THREE.Object3D | null = null;
      let rightForeArm: THREE.Object3D | null = null;
      let rightHand: THREE.Object3D | null = null;
      let leftArm: THREE.Object3D | null = null;
      let leftForeArm: THREE.Object3D | null = null;
      let leftHand: THREE.Object3D | null = null;
      const rightFingers: Record<string, THREE.Object3D> = {};
      const leftFingers: Record<string, THREE.Object3D> = {};
      const materials: THREE.MeshStandardMaterial[] = [];

      model.traverse((o) => {
        if (o.name === "mixamorigRightArm") rightArm = o;
        if (o.name === "mixamorigRightForeArm") rightForeArm = o;
        if (o.name === "mixamorigRightHand") rightHand = o;
        if (o.name === "mixamorigLeftArm") leftArm = o;
        if (o.name === "mixamorigLeftForeArm") leftForeArm = o;
        if (o.name === "mixamorigLeftHand") leftHand = o;
        const rightFinger = o.name.match(/^mixamorigRightHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (rightFinger) rightFingers[`${rightFinger[1]}${rightFinger[2]}`] = o;
        const leftFinger = o.name.match(/^mixamorigLeftHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (leftFinger) leftFingers[`${leftFinger[1]}${leftFinger[2]}`] = o;
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        // This rig's skinned meshes get frustum-culled against their
        // un-skinned bind-pose bounding sphere (computed in the mesh
        // node's own local space, which Blender's exporter placed away
        // from where the bones actually pose it) — so three.js was
        // culling the whole (correctly positioned, correctly posed)
        // character as "off camera" even head-on in plain view.
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // No tint — clone only so this instance's own death-fade opacity
        // (see applyDeathPose) never touches a shared/cached material.
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material = mat;
        materials.push(mat);
      });

      const root = new THREE.Group();
      root.add(model);
      scene.add(root);

      let mixer: THREE.AnimationMixer | null = null;
      let idleAction: THREE.AnimationAction | null = null;
      let runAction: THREE.AnimationAction | null = null;
      let fireAction: THREE.AnimationAction | null = null;
      let deathAction: THREE.AnimationAction | null = null;

      mixer = new THREE.AnimationMixer(model);
      const idleClip = source.clips.get("RifleIdle");
      if (idleClip) {
        idleAction = mixer.clipAction(retargetClip(idleClip, source.rest, restNewbot, posRatio));
        idleAction.play();
      }
      const runClip = source.clips.get("RifleRun");
      if (runClip) {
        const retargetedRun = retargetClip(runClip, source.rest, restNewbot, posRatio);
        const styledRun = applyCrouchedSprintBias(retargetedRun, "mixamorigHips", nativeHeight * RUN_HIP_DROP_FRACTION);
        runAction = mixer.clipAction(styledRun);
        runAction.play();
        runAction.setEffectiveWeight(0);
      }
      const fireClip = source.clips.get("RifleFire");
      if (fireClip) {
        fireAction = mixer.clipAction(retargetClip(fireClip, source.rest, restNewbot, posRatio));
        fireAction.setLoop(THREE.LoopOnce, 1);
        fireAction.clampWhenFinished = true;
        fireAction.play();
        fireAction.setEffectiveWeight(0);
      }
      const deathClip = source.clips.get("DeathFromBackHeadshot");
      if (deathClip) {
        deathAction = mixer.clipAction(retargetClip(deathClip, source.rest, restNewbot, posRatio));
        deathAction.setLoop(THREE.LoopOnce, 1);
        deathAction.clampWhenFinished = true;
        deathAction.play();
        deathAction.setEffectiveWeight(0);
      }

      onLoaded({ root, mixer, idleAction, runAction, fireAction, deathAction, rightArm, rightForeArm, rightHand, leftArm, leftForeArm, leftHand, gun: null, rightFingers, leftFingers, materials });
    })
    .catch((err) => console.error("Failed to load bot model", err));
}

// Tints a fighter's own cloned materials toward a menacing red — used only
// on the Boss (see BOSS_SCALE/BOSS_TINT) so it visibly reads as tougher
// than the regular guards at a glance, on top of standing taller.
const BOSS_TINT = new THREE.Color(0x8a1616);
function tintBossFighter(rig: FighterRig) {
  for (const mat of rig.materials) {
    mat.color.lerp(BOSS_TINT, 0.55);
  }
}

// A minimal single-player vs. bot skirmish on a 10x10 arena: touch
// joystick to move, tap the attack button in range. No networking — the
// "bot" is just a simple chase-and-swing AI running in the same tick loop
// as the player, both driven by the same idle-animation character model
// (there's only one character asset right now) tinted to tell them apart.
function CombatArena({ onExit, onMatchEnd }: { onExit: () => void; onMatchEnd: (result: "win" | "lose", kills: number, survivalSec: number, damageDealt: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickVec = useRef({ x: 0, y: 0 });
  const attackRequested = useRef(false);
  // Manual sprint toggle: tapping RUN forces full sprint on regardless of
  // how far the joystick is pushed, instead of requiring it held near max.
  const runToggled = useRef(false);
  const [runActive, setRunActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  // Free-look: dragging anywhere on the arena view (outside the joystick/
  // buttons) orbits the camera around the player, independent of movement.
  // Horizontal drag turns cameraYaw; vertical drag adds to cameraPitch,
  // which orbits the camera up/down around the player on top of its
  // default over-the-shoulder angle (see CAM_PITCH_MIN/MAX below).
  const cameraYaw = useRef(Math.PI);
  const cameraPitch = useRef(0);
  const lookTouchId = useRef<number | null>(null);
  const lookLastX = useRef(0);
  const lookLastY = useRef(0);

  const [playerHp, setPlayerHp] = useState(100);
  // One HP percentage + floating bar ref per fighter — index 0-4 are the
  // five room guards, index 5 is the Boss.
  const [botHps, setBotHps] = useState<number[]>([100, 100, 100, 100, 100, 100]);
  const botHpBarRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  const [result, setResult] = useState<"playing" | "win" | "lose">("playing");
  // Counts bot deaths this match, for the profile progress system's XP
  // award — read once when `result` leaves "playing" (see the effect
  // below), not reset mid-match since a match only ends once.
  const killCountRef = useRef(0);
  const matchStartRef = useRef(Date.now());
  // Total HP actually knocked off bots this match (clamped per-hit to each
  // bot's remaining HP, so overkill damage past 0 isn't counted twice).
  const damageDealtRef = useRef(0);

  useEffect(() => {
    if (result === "playing") return;
    const survivalSec = Math.round((Date.now() - matchStartRef.current) / 1000);
    onMatchEnd(result, killCountRef.current, survivalSec, Math.round(damageDealtRef.current));
    // onMatchEnd is a fresh closure each render (it wraps setProgress),
    // but the match-end transition itself only happens once per mount —
    // intentionally not in the deps array to avoid re-firing if the
    // parent re-renders and hands down a new function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  const [lookSensitivity, setLookSensitivity] = useState(() => {
    const saved = Number(localStorage.getItem(LOOK_SENSITIVITY_STORAGE_KEY));
    return saved >= LOOK_SENSITIVITY_MIN && saved <= LOOK_SENSITIVITY_MAX ? saved : 1;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const scene = new THREE.Scene();
    // A sky sphere plus matching fog — without these the canvas has no
    // background at all (it's alpha-transparent over the page's near-black
    // CSS gradient), which reads as floating in open space with the ground
    // just cutting off into a void, rather than standing outdoors under a
    // sky that wraps all the way around.
    const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: createSkyTexture(), side: THREE.BackSide, fog: false }));
    scene.add(sky);
    scene.fog = new THREE.Fog(0x2f5678, FOG_NEAR, FOG_FAR);
    // Third-person chase camera (Free Fire / PUBG Mobile style): positioned
    // behind and above the player, following their facing direction, rather
    // than a fixed top-down view.
    // Close, tight framing (Free Fire / PUBG Mobile style) instead of a
    // distant, wide-angle view — camera sits just behind the shoulder and
    // a narrower FOV keeps the character filling most of the screen
    // height rather than looking small and far away.
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, CAMERA_FAR);
    const CAM_DISTANCE = 2.1;
    const CAM_HEIGHT = 1.55;
    const CAM_LOOK_HEIGHT = 1.25;
    const CAM_DAMP_RATE = 7; // per-second follow damping, frame-rate independent
    // The camera orbits the look-at point on a sphere of this radius —
    // derived from the original fixed CAM_DISTANCE/CAM_HEIGHT so pitch 0
    // (no vertical drag yet) reproduces the exact same default view as
    // before, with up/down drag then orbiting away from that angle.
    const CAM_ORBIT_RADIUS = Math.hypot(CAM_DISTANCE, CAM_HEIGHT - CAM_LOOK_HEIGHT);
    const CAM_BASE_PITCH = Math.atan2(CAM_HEIGHT - CAM_LOOK_HEIGHT, CAM_DISTANCE);
    const CAM_PITCH_MIN = -0.15; // near-level, looking slightly down at most
    const CAM_PITCH_MAX = 1.3; // steep overhead angle, short of straight down
    camera.position.set(0, CAM_HEIGHT, CAM_DISTANCE + 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Real shadows + filmic tone mapping — walls/crates/characters were
    // reading flat and "gamey" next to a reference with dramatic directional
    // shadows and richer contrast. PCFSoftShadowMap gives soft shadow edges
    // instead of the harsh aliased look of the default shadow type.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Bloom on top of the render — the light strips/door glow/muzzle flash
    // are already emissive, but with no bloom pass they just render as a
    // flat bright color instead of actually spreading light into the
    // surrounding pixels the way a real light source reads. OutputPass
    // re-applies the renderer's own color space/tone mapping after the
    // bloom pass, since UnrealBloomPass's own output otherwise skips it.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.82);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // Ground color raised from its original near-black (0x0a0e18) so
    // downward-facing surfaces — chiefly the room/corridor ceiling slabs —
    // pick up enough ambient fill to actually show their panel texture,
    // instead of rendering as a flat black void overhead. Floor/wall
    // brightness (driven mostly by the sky color and the key light below)
    // is unaffected.
    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x5a6478, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 6, 4);
    // The arena is 700x700 — far too big for one shadow camera frustum to
    // cover at any usable resolution, so instead of lighting the whole
    // level the frustum is a fixed-size window (see SHADOW_FOLLOW_DISTANCE/
    // SHADOW_FOLLOW_DIR below) that re-centers on the player every frame,
    // keeping shadow resolution high right where it's actually seen.
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    key.shadow.bias = -0.0015;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    scene.add(key.target);
    const SHADOW_FOLLOW_DIR = new THREE.Vector3(3, 6, 4).normalize();
    const SHADOW_FOLLOW_DISTANCE = 20;

    // A real hole cut through the main floor at each house's stairwell
    // (not just a decal on top of a solid floor) — otherwise standing at
    // the hole and looking down would still hit this solid ground plane
    // a few units below the room's own floor, instead of actually seeing
    // down into the tunnel.
    const groundShape = new THREE.Shape();
    groundShape.moveTo(-ARENA_HALF, -ARENA_HALF);
    groundShape.lineTo(ARENA_HALF, -ARENA_HALF);
    groundShape.lineTo(ARENA_HALF, ARENA_HALF);
    groundShape.lineTo(-ARENA_HALF, ARENA_HALF);
    groundShape.lineTo(-ARENA_HALF, -ARENA_HALF);
    for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
      // Shape-local Y maps to world -Z after the rotateX(-PI/2) below
      // (rotateX(θ) sends (x,y,z) to (x, z, -y) at θ=-90°), so world Z
      // needs to be negated to land the hole at its actual world
      // position — hence -c.z below for every corner.
      const { nearA, nearB, farA, farB } = stairFootprintCorners(i);
      const hole = new THREE.Path();
      hole.moveTo(nearA.x, -nearA.z);
      hole.lineTo(farA.x, -farA.z);
      hole.lineTo(farB.x, -farB.z);
      hole.lineTo(nearB.x, -nearB.z);
      hole.lineTo(nearA.x, -nearA.z);
      groundShape.holes.push(hole);
    }
    const groundGeo = new THREE.ShapeGeometry(groundShape);
    // ShapeGeometry's default UVs are the shape's raw local coordinates
    // (here, -ARENA_HALF..ARENA_HALF) rather than the usual 0-1 range, so
    // texture.repeat further below was silently multiplying against that
    // whole 700-unit span instead of a unit square — over-tiling any real
    // image so heavily it blurred into a flat, featureless color. A
    // fine-grained procedural noise texture still happened to read as
    // "textured" even that heavily aliased, which is why this went
    // unnoticed until a real photo replaced it. Remap to a proper 0-1 UV
    // here so texture.repeat means what it says.
    {
      const uv = groundGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) + ARENA_HALF) / (ARENA_HALF * 2), (uv.getY(i) + ARENA_HALF) / (ARENA_HALF * 2));
      }
      uv.needsUpdate = true;
    }
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({
        map: createSciFiFloorTexture(SCIFI_FLOOR_REPEAT, renderer.capabilities.getMaxAnisotropy()),
        roughness: 0.6,
        metalness: 0.35,
      }),
    );
    ground.receiveShadow = true;
    scene.add(ground);

    // Sci-fi outpost room — the wall segments exactly match the OBSTACLES
    // rects above (built straight from that array, so visuals and
    // collision can never drift apart), plus crates, a floor grate, a
    // hazard-stripe decal and a wall screen for detail.
    const wallMaxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // Builds one wall segment's box + real sci-fi panel texture (see
    // createSciFiWallTexture), and adds it to the scene — every
    // roomWallObstacles/CORRIDOR*_WALLS/etc. entry in the level goes
    // through this one helper instead of repeating the same lines at each
    // call site. Repeat count is derived from this particular wall's own
    // length/height, so a short corridor wall and a long room wall both
    // read at the same real-world panel scale instead of one stretching or
    // squashing the texture. `variant` picks between the two source
    // photos: 0 for room walls, 1 for corridor/tunnel walls.
    const addWallMesh = (ob: Obstacle, height: number, centerY: number, variant: 0 | 1 = 0) => {
      const width = ob.halfX * 2;
      const depth = ob.halfZ * 2;
      const longSide = Math.max(width, depth);
      const wallMat = new THREE.MeshStandardMaterial({
        map: createSciFiWallTexture(longSide / SCIFI_WALL_TILE_SIZE, height / SCIFI_WALL_TILE_SIZE, wallMaxAnisotropy, variant),
        roughness: 0.7,
        metalness: 0.3,
      });
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
      wallMesh.position.set(ob.x, centerY, ob.z);
      wallMesh.receiveShadow = true;
      scene.add(wallMesh);
      return wallMesh;
    };
    // Same as addWallMesh, but for a wall segment that isn't axis-aligned
    // (the chamfered corners of the new octagonal room) — takes an explicit
    // world-space length and Y rotation instead of deriving a Box's width/
    // depth from an Obstacle rect, since a rotated rect can't be expressed
    // as one of those.
    const addAngledWallMesh = (x: number, z: number, length: number, height: number, centerY: number, rotY: number, variant: 0 | 1 = 0) => {
      const wallMat = new THREE.MeshStandardMaterial({
        map: createSciFiWallTexture(length / SCIFI_WALL_TILE_SIZE, height / SCIFI_WALL_TILE_SIZE, wallMaxAnisotropy, variant),
        roughness: 0.7,
        metalness: 0.3,
      });
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, ROOM_WALL_THICKNESS), wallMat);
      wallMesh.position.set(x, centerY, z);
      wallMesh.rotation.y = rotY;
      wallMesh.receiveShadow = true;
      scene.add(wallMesh);
      return wallMesh;
    };
    const doorGlowMat = new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff3355, emissiveIntensity: 1.4, roughness: 0.4 });
    const hazardMat = new THREE.MeshStandardMaterial({ map: createHazardStripeTexture(), roughness: 0.8 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.3 });
    // Real sci-fi panel texture for every ceiling slab, scaled to that
    // slab's own footprint the same way addWallMesh scales the wall
    // texture — a small MIDROOM ceiling and ROOM6's big one both read at
    // the same real-world panel size instead of one stretching the other.
    const createCeilingMat = (width: number, depth: number) =>
      new THREE.MeshStandardMaterial({
        map: createSciFiCeilingTexture(width / SCIFI_CEILING_TILE_SIZE, depth / SCIFI_CEILING_TILE_SIZE, wallMaxAnisotropy),
        roughness: 0.6,
        metalness: 0.4,
        side: THREE.DoubleSide,
      });
    const lightStripMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.5, metalness: 0.3 });

    // Builds one full sci-fi outpost room (walls, door glows, crates, floor
    // grate, hazard stripe, wall screen, ceiling) at the given position —
    // called once per entry in ROOM_POSITIONS so every room stays visually
    // and structurally identical.
    const buildRoom = (pos: { x: number; z: number }) => {
      for (const ob of roomWallObstacles(pos)) {
        addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2);
      }

      // Glowing red door-frame lintel over each of the 4 openings.
      const addDoorGlow = (x: number, z: number, sizeX: number, sizeZ: number) => {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.15, sizeZ), doorGlowMat);
        glow.position.set(x, ROOM_WALL_HEIGHT - 0.3, z);
        scene.add(glow);
      };
      addDoorGlow(pos.x, pos.z - ROOM_SIZE / 2, ROOM_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // north (entrance)
      addDoorGlow(pos.x, pos.z + ROOM_SIZE / 2, ROOM_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // south (exit)
      addDoorGlow(pos.x - ROOM_SIZE / 2, pos.z, ROOM_WALL_THICKNESS + 0.05, ROOM_DOOR_WIDTH); // west (exit)
      addDoorGlow(pos.x + ROOM_SIZE / 2, pos.z, ROOM_WALL_THICKNESS + 0.05, ROOM_DOOR_WIDTH); // east (exit)

      // Crates themselves are spawned separately (see the loadCrateMaterial
      // block below), once the shared crate texture has actually loaded —
      // matching roomCrateObstacles' positions exactly.

      // No floor decal at the room's exact center anymore — that's now the
      // tunnel-hole's spot (see addFloorHole), and a separate decal there
      // z-fought with it, reading as a flickering, jagged edge.

      // Hazard-stripe floor decal at the entrance threshold.
      const hazard = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DOOR_WIDTH, 2), hazardMat);
      hazard.rotation.x = -Math.PI / 2;
      hazard.position.set(pos.x, 0.015, pos.z - ROOM_SIZE / 2 + 1);
      scene.add(hazard);

      // A glowing wall screen mounted on the interior face of the south wall.
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), screenMat);
      screen.position.set(pos.x - ROOM_SEG_OFFSET, ROOM_WALL_HEIGHT * 0.52, pos.z + ROOM_SIZE / 2 - ROOM_WALL_THICKNESS / 2 - 0.02);
      screen.rotation.y = Math.PI;
      scene.add(screen);

      // Ceiling slab sealing the room, with embedded cyan light-strip panels
      // matching the reference image's overhead detailing.
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_WALL_THICKNESS, ROOM_SIZE), createCeilingMat(ROOM_SIZE, ROOM_SIZE));
      ceiling.position.set(pos.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, pos.z);
      scene.add(ceiling);

      const addCeilingStrip = (x: number, z: number, sizeX: number, sizeZ: number) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.08, sizeZ), lightStripMat);
        strip.position.set(x, ROOM_WALL_HEIGHT - 0.06, z);
        scene.add(strip);
      };
      addCeilingStrip(pos.x, pos.z - 2.5, 1.5, 0.3);
      addCeilingStrip(pos.x, pos.z, 1.5, 0.3);
      addCeilingStrip(pos.x, pos.z + 2.5, 1.5, 0.3);
    };

    for (const pos of ROOM_POSITIONS) {
      buildRoom(pos);
    }

    // Every crate in the level — the 3 per room (see roomCrateObstacles)
    // plus the ones scattered through corridors/midroom/ROOM6 (see
    // EXTRA_CRATES) — is the same textured box, one material loaded and
    // shared. Waits on the load rather than blocking scene setup on it.
    loadCrateMaterial().then((material) => {
      if (disposed) return;
      for (const pos of ROOM_POSITIONS) {
        const crates = roomCrateObstacles(pos);
        const rotations = [0.3, -0.4, 0.8];
        crates.forEach((c, i) => placeCrate(scene, material, c.x, c.z, c.halfX, rotations[i] ?? 0));
      }
      EXTRA_CRATES.forEach((c, i) => placeCrate(scene, material, c.x, c.z, c.halfX, i * 0.7));
    });

    // The open shaft down through each house's own center to the tunnel
    // below (see ROOM_STAIRS_DOWN_POS/RAMP_RUN_LENGTH and the tick loop's
    // continuous height-follow, which still lets the player descend
    // smoothly through it) — no physical stair-step meshes, on purpose:
    // just the hole itself, so it stays a clear window straight down into
    // the tunnel from the house floor above.
    const holeRimMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
    const holeShaftMat = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: 0.9, side: THREE.DoubleSide });
    // Every stair element below is built in the stairway's own local
    // "along" (distance from the house center, in the direction it
    // descends — see ROOM_TUNNEL_DIR) / "perp" (distance off to the
    // side) axes, then converted to world X/Z here. Since every
    // ROOM_TUNNEL_DIR entry is axis-aligned, the along/perp axes are
    // always some (possibly swapped) combination of world X/Z, which is
    // all stairBoxSize is doing — no rotation needed.
    function stairWorldPos(x: number, z: number, dirX: number, dirZ: number, along: number, perp: number) {
      const perpX = -dirZ;
      const perpZ = dirX;
      return { x: x + dirX * along + perpX * perp, z: z + dirZ * along + perpZ * perp };
    }
    function stairBoxSize(dirX: number, dirZ: number, alongLen: number, widthLen: number) {
      return {
        sizeX: alongLen * Math.abs(dirX) + widthLen * Math.abs(dirZ),
        sizeZ: alongLen * Math.abs(dirZ) + widthLen * Math.abs(dirX),
      };
    }
    // A hollow frame (four border strips), not a solid plane — a solid
    // glowing rectangle here would just paper over the stairs inside it
    // instead of framing the opening around them.
    function addFloorHoleRim(x: number, y: number, z: number, dirX: number, dirZ: number) {
      const border = HOLE_HALF_SIZE - HOLE_INNER_SIZE / 2;
      const width = RAMP_HALF_WIDTH * 2;
      const addStrip = (along: number, perp: number, alongLen: number, widthLen: number) => {
        const pos = stairWorldPos(x, z, dirX, dirZ, along, perp);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, alongLen, widthLen);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(sizeX, sizeZ), holeRimMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(pos.x, y + 0.015, pos.z);
        scene.add(strip);
      };
      addStrip(RAMP_RUN_LENGTH / 2, -(RAMP_HALF_WIDTH + border / 2), RAMP_RUN_LENGTH + border * 2, border);
      addStrip(RAMP_RUN_LENGTH / 2, RAMP_HALF_WIDTH + border / 2, RAMP_RUN_LENGTH + border * 2, border);
      addStrip(-border / 2, 0, border, width);
      addStrip(RAMP_RUN_LENGTH + border / 2, 0, border, width);
    }
    // The pit's side walls and near-end cap, between a house's floor and
    // the tunnel ceiling below it — the far end is left open, since that
    // end just opens straight into the tunnel corridor's own space.
    function addHoleShaft(x: number, z: number, topY: number, bottomY: number, dirX: number, dirZ: number) {
      const height = topY - bottomY;
      const midY = (topY + bottomY) / 2;
      const width = RAMP_HALF_WIDTH * 2;
      const addWall = (along: number, perp: number, alongLen: number, widthLen: number) => {
        const pos = stairWorldPos(x, z, dirX, dirZ, along, perp);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, alongLen, widthLen);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(sizeX, height, sizeZ), holeShaftMat);
        wall.position.set(pos.x, midY, pos.z);
        scene.add(wall);
      };
      addWall(RAMP_RUN_LENGTH / 2, -RAMP_HALF_WIDTH, RAMP_RUN_LENGTH, 0.05);
      addWall(RAMP_RUN_LENGTH / 2, RAMP_HALF_WIDTH, RAMP_RUN_LENGTH, 0.05);
      addWall(0, 0, 0.05, width);
    }
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x8a929c, emissive: 0x2a3138, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.3 });
    const stairEdgeMat = new THREE.LineBasicMaterial({ color: 0xff9a4a });
    // Real walkable steps filling the stairwell run, rather than an open
    // shaft — 14 steps from the house floor (topY) down to the tunnel
    // floor (bottomY), each edge-highlighted so the drop reads clearly
    // even in the tunnel's dim lighting.
    function addStairsInHole(x: number, z: number, topY: number, bottomY: number, dirX: number, dirZ: number) {
      const steps = 14;
      const stepHeight = (topY - bottomY) / steps;
      const stepDepth = RAMP_RUN_LENGTH / steps;
      const width = RAMP_HALF_WIDTH * 2;
      for (let i = 0; i < steps; i++) {
        const stepCenterY = topY - stepHeight * (i + 0.5);
        const along = stepDepth * (i + 0.5);
        const pos = stairWorldPos(x, z, dirX, dirZ, along, 0);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, stepDepth, width);
        const step = new THREE.Mesh(new THREE.BoxGeometry(sizeX, stepHeight, sizeZ), stairMat);
        step.position.set(pos.x, stepCenterY, pos.z);
        step.add(new THREE.LineSegments(new THREE.EdgesGeometry(step.geometry), stairEdgeMat));
        scene.add(step);
      }
    }
    // One stairway hole down through each house's own center, its matching
    // rim up at that same spot underground (in the ceiling there), and the
    // pit walls between the two — no physical steps filling the run, so
    // it's an open shaft you can look straight down through from the house
    // floor and see the tunnel below.
    for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
      const tunnelCeilingY = TUNNEL_Y + TUNNEL_WALL_HEIGHT;
      const dir = ROOM_TUNNEL_DIR[i];
      addFloorHoleRim(ROOM_STAIRS_DOWN_POS[i].x, 0, ROOM_STAIRS_DOWN_POS[i].z, dir.x, dir.z);
      addFloorHoleRim(TUNNEL_STOPS[i].x, tunnelCeilingY, TUNNEL_STOPS[i].z, dir.x, dir.z);
      addHoleShaft(ROOM_STAIRS_DOWN_POS[i].x, ROOM_STAIRS_DOWN_POS[i].z, 0, tunnelCeilingY, dir.x, dir.z);
      addStairsInHole(ROOM_STAIRS_DOWN_POS[i].x, ROOM_STAIRS_DOWN_POS[i].z, 0, TUNNEL_Y, dir.x, dir.z);
      // Nothing else reaches down into the shaft otherwise (it sits
      // below the room's own ambient light and above the tunnel's floor
      // strip), which is exactly why the stairs were reading as a flat
      // black pit — these light the run from inside the stairwell
      // itself, one near the top and one near the tunnel floor since the
      // full run is too long now for a single point light to reach.
      const topLight = new THREE.PointLight(0xffffff, 1.3, RAMP_RUN_LENGTH, 2);
      topLight.position.set(
        ROOM_STAIRS_DOWN_POS[i].x + dir.x * (RAMP_RUN_LENGTH * 0.2),
        -0.6,
        ROOM_STAIRS_DOWN_POS[i].z + dir.z * (RAMP_RUN_LENGTH * 0.2),
      );
      scene.add(topLight);
      const bottomLight = new THREE.PointLight(0xffffff, 1.3, RAMP_RUN_LENGTH, 2);
      bottomLight.position.set(
        ROOM_STAIRS_DOWN_POS[i].x + dir.x * (RAMP_RUN_LENGTH * 0.8),
        TUNNEL_Y + 0.8,
        ROOM_STAIRS_DOWN_POS[i].z + dir.z * (RAMP_RUN_LENGTH * 0.8),
      );
      scene.add(bottomLight);
    }

    // The tunnel itself — every wall in the level, mirrored at TUNNEL_Y
    // (see the comment above ROOM_STAIRS_DOWN_POS for why this makes the
    // underground layer automatically follow the exact same walkable
    // route as the surface, no separate collision needed), plus a floor
    // and ceiling slab spanning the whole thing.
    const mirrorWallsUnderground = (obstacles: Obstacle[]) => {
      for (const ob of obstacles) {
        addWallMesh(ob, TUNNEL_WALL_HEIGHT, TUNNEL_Y + TUNNEL_WALL_HEIGHT / 2, 1);
      }
    };
    mirrorWallsUnderground(ROOM_POSITIONS.flatMap(roomWallObstacles));
    mirrorWallsUnderground(MIDROOM_WALLS);
    mirrorWallsUnderground(CORRIDOR_WALLS);
    mirrorWallsUnderground(CORRIDOR2_WALLS);
    mirrorWallsUnderground(CORRIDOR3_WALLS);
    mirrorWallsUnderground(CORRIDOR4_WALLS);
    mirrorWallsUnderground(CORRIDOR5_WALLS);
    mirrorWallsUnderground(ROOM6_WALLS);
    const undergroundWidth = UNDERGROUND_MAX_X - UNDERGROUND_MIN_X;
    const undergroundDepth = UNDERGROUND_MAX_Z - UNDERGROUND_MIN_Z;
    const undergroundCenterX = (UNDERGROUND_MIN_X + UNDERGROUND_MAX_X) / 2;
    const undergroundCenterZ = (UNDERGROUND_MIN_Z + UNDERGROUND_MAX_Z) / 2;
    const undergroundFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(undergroundWidth, undergroundDepth),
      new THREE.MeshStandardMaterial({ map: createFloorTexture(8, renderer.capabilities.getMaxAnisotropy()), roughness: 0.7, metalness: 0.25 }),
    );
    undergroundFloor.rotation.x = -Math.PI / 2;
    undergroundFloor.position.set(undergroundCenterX, TUNNEL_Y, undergroundCenterZ);
    scene.add(undergroundFloor);
    // A real hole cut through the ceiling slab at each house's stop (not
    // just a decal sitting on top of a solid slab) — otherwise standing
    // at the hole up on the surface, the view straight down would hit
    // this solid ceiling a few units below instead of actually seeing
    // into the tunnel.
    const ceilingShape = new THREE.Shape();
    const halfW = undergroundWidth / 2;
    const halfD = undergroundDepth / 2;
    ceilingShape.moveTo(-halfW, -halfD);
    ceilingShape.lineTo(halfW, -halfD);
    ceilingShape.lineTo(halfW, halfD);
    ceilingShape.lineTo(-halfW, halfD);
    ceilingShape.lineTo(-halfW, -halfD);
    for (let i = 0; i < TUNNEL_STOPS.length; i++) {
      // The shape's local Y axis ends up mapped to world -Z after the
      // rotateX(-PI/2) below (rotateX(θ) sends (x,y,z) to (x, z, -y) at
      // θ=-90°), so world Z needs to be negated to land the hole at its
      // actual world position instead of its mirror image — hence
      // -(c.z - undergroundCenterZ) below for every corner.
      const { nearA, nearB, farA, farB } = stairFootprintCorners(i);
      const toLocal = (c: { x: number; z: number }) => ({ x: c.x - undergroundCenterX, z: -(c.z - undergroundCenterZ) });
      const a = toLocal(nearA);
      const b = toLocal(farA);
      const c = toLocal(farB);
      const d = toLocal(nearB);
      const hole = new THREE.Path();
      hole.moveTo(a.x, a.z);
      hole.lineTo(b.x, b.z);
      hole.lineTo(c.x, c.z);
      hole.lineTo(d.x, d.z);
      hole.lineTo(a.x, a.z);
      ceilingShape.holes.push(hole);
    }
    const ceilingGeo = new THREE.ExtrudeGeometry(ceilingShape, { depth: ROOM_WALL_THICKNESS, bevelEnabled: false });
    ceilingGeo.rotateX(-Math.PI / 2);
    const undergroundCeiling = new THREE.Mesh(ceilingGeo, createCeilingMat(halfW * 2, halfD * 2));
    undergroundCeiling.position.set(undergroundCenterX, TUNNEL_Y + TUNNEL_WALL_HEIGHT, undergroundCenterZ);
    scene.add(undergroundCeiling);
    // A light strip over each house's own stop, so the tunnel doesn't
    // read as one featureless dark space.
    for (const stop of TUNNEL_STOPS) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(stop.x, TUNNEL_Y + TUNNEL_WALL_HEIGHT - 0.06, stop.z);
      scene.add(strip);
    }

    // Covered corridor joining the two rooms' facing doors — same wall/
    // ceiling materials as the rooms so it reads as one connected structure.
    // Built in two segments since MIDROOM sits in the middle of it.
    for (const ob of CORRIDOR_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const addCorridorStrip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    for (const seg of CORRIDOR_SEGMENTS) {
      const segCeiling = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, seg.length),
        createCeilingMat(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, seg.length),
      );
      segCeiling.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, seg.centerZ);
      scene.add(segCeiling);
      addCorridorStrip(seg.centerZ - seg.length / 4);
      addCorridorStrip(seg.centerZ + seg.length / 4);
    }

    // MIDROOM — a small single-door outpost built into the middle of the
    // corridor (see MIDROOM_WALLS above for its wall layout).
    for (const ob of MIDROOM_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const midDoorGlowSouth = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_DOOR_WIDTH, 0.15, ROOM_WALL_THICKNESS + 0.05), doorGlowMat);
    midDoorGlowSouth.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT - 0.3, MIDROOM_SOUTH_Z);
    scene.add(midDoorGlowSouth);
    const midDoorGlowNorth = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_DOOR_WIDTH, 0.15, ROOM_WALL_THICKNESS + 0.05), doorGlowMat);
    midDoorGlowNorth.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT - 0.3, MIDROOM_NORTH_Z);
    scene.add(midDoorGlowNorth);
    const midCeiling = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_SIZE, ROOM_WALL_THICKNESS, MIDROOM_SIZE), createCeilingMat(MIDROOM_SIZE, MIDROOM_SIZE));
    midCeiling.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, MIDROOM_POS.z);
    scene.add(midCeiling);

    // Second corridor — a plain walled/roofed passage (no mid-house) joining
    // ROOM2_POS to ROOM3_POS.
    for (const ob of CORRIDOR2_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const corridor2Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR2_LENGTH),
      createCeilingMat(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, CORRIDOR2_LENGTH),
    );
    corridor2Ceiling.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR2_CENTER_Z);
    scene.add(corridor2Ceiling);
    addCorridorStrip(CORRIDOR2_CENTER_Z - CORRIDOR2_LENGTH / 4);
    addCorridorStrip(CORRIDOR2_CENTER_Z + CORRIDOR2_LENGTH / 4);

    // Third corridor — runs east-west, joining ROOM3_POS to ROOM4_POS which
    // branches off to the side instead of continuing the main line.
    for (const ob of CORRIDOR3_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const corridor3Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR3_LENGTH, ROOM_WALL_THICKNESS, CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2),
      createCeilingMat(CORRIDOR3_LENGTH, CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2),
    );
    corridor3Ceiling.position.set(CORRIDOR3_CENTER_X, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, ROOM3_POS.z);
    scene.add(corridor3Ceiling);
    const addCorridor3Strip = (x: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.5), lightStripMat);
      strip.position.set(x, ROOM_WALL_HEIGHT - 0.06, ROOM3_POS.z);
      scene.add(strip);
    };
    addCorridor3Strip(CORRIDOR3_CENTER_X - CORRIDOR3_LENGTH / 4);
    addCorridor3Strip(CORRIDOR3_CENTER_X + CORRIDOR3_LENGTH / 4);

    // Fourth corridor — north-south again, joining ROOM4_POS to ROOM5_POS.
    for (const ob of CORRIDOR4_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const corridor4Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR4_LENGTH),
      createCeilingMat(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, CORRIDOR4_LENGTH),
    );
    corridor4Ceiling.position.set(ROOM4_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR4_CENTER_Z);
    scene.add(corridor4Ceiling);
    const addCorridor4Strip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM4_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    addCorridor4Strip(CORRIDOR4_CENTER_Z - CORRIDOR4_LENGTH / 4);
    addCorridor4Strip(CORRIDOR4_CENTER_Z + CORRIDOR4_LENGTH / 4);

    // Fifth corridor — joins ROOM5_POS to the larger ROOM6_POS ahead of it.
    for (const ob of CORRIDOR5_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, 1);
    }
    const corridor5Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR5_LENGTH),
      createCeilingMat(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, CORRIDOR5_LENGTH),
    );
    corridor5Ceiling.position.set(ROOM5_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR5_CENTER_Z);
    scene.add(corridor5Ceiling);
    const addCorridor5Strip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM5_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    addCorridor5Strip(CORRIDOR5_CENTER_Z - CORRIDOR5_LENGTH / 4);
    addCorridor5Strip(CORRIDOR5_CENTER_Z + CORRIDOR5_LENGTH / 4);

    // ROOM6 — the larger 40x30 room, built from ROOM6_WALLS directly (not
    // buildRoom(), since it isn't square) plus door glows on all 4 sides
    // and a matching ceiling.
    for (const ob of ROOM6_WALLS) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2);
    }
    const addRoom6DoorGlow = (x: number, z: number, sizeX: number, sizeZ: number) => {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.15, sizeZ), doorGlowMat);
      glow.position.set(x, ROOM_WALL_HEIGHT - 0.3, z);
      scene.add(glow);
    };
    addRoom6DoorGlow(ROOM6_POS.x, ROOM6_POS.z + ROOM6_DEPTH / 2, ROOM6_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // south — the only remaining door
    const room6Ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM6_WIDTH, ROOM_WALL_THICKNESS, ROOM6_DEPTH), createCeilingMat(ROOM6_WIDTH, ROOM6_DEPTH));
    room6Ceiling.position.set(ROOM6_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, ROOM6_POS.z);
    scene.add(room6Ceiling);

    // New octagonal room off Room 1's west door (door 3, see NEWROOM_WALLS
    // above) — straight north/south/west walls plus 4 diagonal corner
    // segments computed from their two world-space endpoints rather than
    // from an axis-aligned Obstacle rect, since a 45° wall can't be
    // expressed as one of those (see addAngledWallMesh).
    for (const ob of [NEWROOM_WALLS[0], NEWROOM_WALLS[1], NEWROOM_WALLS[2]]) {
      addWallMesh(ob, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2);
    }
    const addNewRoomDiagonal = (x1: number, z1: number, x2: number, z2: number) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      addAngledWallMesh((x1 + x2) / 2, (z1 + z2) / 2, length, ROOM_WALL_HEIGHT, ROOM_WALL_HEIGHT / 2, -Math.atan2(dz, dx));
    };
    const nrX = NEWROOM_POS.x;
    const nrZ = NEWROOM_POS.z;
    const nrH = NEWROOM_HALF;
    const nrS = NEWROOM_STRAIGHT_HALF;
    addNewRoomDiagonal(nrX - nrS, nrZ - nrH, nrX - nrH, nrZ - nrS); // NW
    addNewRoomDiagonal(nrX + nrS, nrZ - nrH, nrX + nrH, nrZ - nrS); // NE (terminates at Room 1's wall)
    addNewRoomDiagonal(nrX - nrS, nrZ + nrH, nrX - nrH, nrZ + nrS); // SW
    addNewRoomDiagonal(nrX + nrS, nrZ + nrH, nrX + nrH, nrZ + nrS); // SE (terminates at Room 1's wall)
    const newRoomCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(NEWROOM_HALF * 2, ROOM_WALL_THICKNESS, NEWROOM_HALF * 2),
      createCeilingMat(NEWROOM_HALF * 2, NEWROOM_HALF * 2),
    );
    newRoomCeiling.position.set(nrX, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, nrZ);
    scene.add(newRoomCeiling);

    // EXTRA_CRATES' own visuals are spawned in the loadCrateMaterial block
    // above, alongside the room crates.

    // Sliding gates — one pair of panels per door, closed by default and
    // sliding apart automatically as the player gets close (see the gate
    // update loop further down, in the per-frame tick).
    const GATE_PANEL_HEIGHT = ROOM_WALL_HEIGHT - 0.4;
    const GATE_THICKNESS = ROOM_WALL_THICKNESS * 0.9;
    const GATE_OPEN_RADIUS = 3.5;
    const GATE_SLIDE_RATE = 4;
    const gates = DOORS.map((door) => {
      const panelWidth = door.width / 2;
      const geo =
        door.axis === "x"
          ? new THREE.BoxGeometry(panelWidth, GATE_PANEL_HEIGHT, GATE_THICKNESS)
          : new THREE.BoxGeometry(GATE_THICKNESS, GATE_PANEL_HEIGHT, panelWidth);
      // Real door-leaf artwork (frame pillar, keypad, hazard stripe) instead
      // of the plain wall texture — panelA (the negative-side leaf) gets the
      // left-crop image with its pillar facing outward and detail toward the
      // gap; panelB (positive-side) gets the mirrored right-crop, so the two
      // leaves reconstruct one coherent door when slid shut.
      const panelAMat = new THREE.MeshStandardMaterial({
        map: createDoorPanelTexture(0, wallMaxAnisotropy),
        roughness: 0.5,
        metalness: 0.4,
      });
      const panelBMat = new THREE.MeshStandardMaterial({
        map: createDoorPanelTexture(1, wallMaxAnisotropy),
        roughness: 0.5,
        metalness: 0.4,
      });
      const panelA = new THREE.Mesh(geo, panelAMat);
      const panelB = new THREE.Mesh(geo, panelBMat);
      panelA.position.y = GATE_PANEL_HEIGHT / 2;
      panelB.position.y = GATE_PANEL_HEIGHT / 2;
      panelA.receiveShadow = true;
      panelB.receiveShadow = true;
      scene.add(panelA, panelB);
      return { door, panelA, panelB, panelWidth, openAmount: 0 };
    });
    const updateGatePanels = (g: (typeof gates)[number]) => {
      const slide = g.panelWidth * g.openAmount;
      if (g.door.axis === "x") {
        g.panelA.position.set(g.door.x - g.panelWidth / 2 - slide, GATE_PANEL_HEIGHT / 2, g.door.z);
        g.panelB.position.set(g.door.x + g.panelWidth / 2 + slide, GATE_PANEL_HEIGHT / 2, g.door.z);
      } else {
        g.panelA.position.set(g.door.x, GATE_PANEL_HEIGHT / 2, g.door.z - g.panelWidth / 2 - slide);
        g.panelB.position.set(g.door.x, GATE_PANEL_HEIGHT / 2, g.door.z + g.panelWidth / 2 + slide);
      }
    };
    gates.forEach(updateGatePanels); // start fully closed

    // A numbered plaque mounted on the solid wall beside each door (not a
    // "DOOR n" label floating over the opening) — a small dark rounded-rect
    // backing with a cyan border and a big glowing digit, like a real room
    // number sign, at roughly eye height so it's legible while approaching.
    // Drawn once per door onto a canvas and used as a billboard sprite (
    // always faces the camera, unlike a flat plane) so it reads correctly
    // from any angle.
    const createDoorNumberPlaque = (n: number): THREE.Sprite => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      const pad = 12;
      ctx.fillStyle = "rgba(10, 18, 26, 0.88)";
      ctx.strokeStyle = "#6be2ff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2, 22);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 108px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(107, 226, 255, 0.7)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#6be2ff";
      ctx.fillText(String(n), canvas.width / 2, canvas.height / 2 + 6);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.7, 0.7, 1);
      return sprite;
    };
    const DOOR_PLAQUE_HEIGHT = 1.7; // eye level, not up near the ceiling
    DOORS.forEach((door, i) => {
      const plaque = createDoorNumberPlaque(i + 1);
      // Slide along the door's own axis to clear the opening and land on
      // the solid wall next to it, then nudge across (perpendicular to the
      // wall's run) by just over half the wall thickness so the plaque
      // sits proud of the wall face instead of z-fighting inside it.
      const alongOffset = door.width / 2 + 0.5;
      const acrossOffset = ROOM_WALL_THICKNESS / 2 + 0.15;
      if (door.axis === "x") {
        plaque.position.set(door.x + alongOffset, DOOR_PLAQUE_HEIGHT, door.z + acrossOffset);
      } else {
        plaque.position.set(door.x + acrossOffset, DOOR_PLAQUE_HEIGHT, door.z + alongOffset);
      }
      scene.add(plaque);
    });

    // A vent-panel wall decal near door 3 (Room 1's west door), mounted low
    // on the wall (just above the floor) like the reference photo — a flat
    // plane facing into the room, sitting just proud of the wall's own
    // surface (ROOM_WALL_THICKNESS/2 + a small gap) so it doesn't z-fight
    // with it. Kept clear of the door 3 gap (z -51 to -49) by centering on
    // the solid wall segment north of the door instead of straddling it.
    const ventTexture = new THREE.TextureLoader().load("/textures/vent-panel.jpg");
    ventTexture.colorSpace = THREE.SRGBColorSpace;
    const VENT_DECAL_WIDTH = 3;
    const VENT_DECAL_HEIGHT = VENT_DECAL_WIDTH * (222 / 457);
    const ventDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(VENT_DECAL_WIDTH, VENT_DECAL_HEIGHT),
      new THREE.MeshStandardMaterial({ map: ventTexture, roughness: 0.6, metalness: 0.3 }),
    );
    ventDecal.position.set(ROOM_POS.x - ROOM_SIZE / 2 + ROOM_WALL_THICKNESS / 2 + 0.05, VENT_DECAL_HEIGHT / 2 + 0.15, ROOM_POS.z - 3);
    ventDecal.rotation.y = Math.PI / 2;
    ventDecal.receiveShadow = true;
    scene.add(ventDecal);

    // A small family of industrial wall-detail decals dressing out the rest
    // of Room 1 — a control panel, an electrical box, a server rack, and a
    // second (larger) vent style — cropped from the same reference photo as
    // the vent panel above. Spread across the room's other wall segments
    // (each clear of its own door gap) so the room reads as a dense,
    // functional facility interior instead of bare metal panels.
    const addWallDecal = (
      url: string,
      width: number,
      centerY: number,
      x: number,
      z: number,
      rotY: number,
      aspect: number,
    ) => {
      const tex = new THREE.TextureLoader().load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      const height = width * aspect;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }),
      );
      mesh.position.set(x, centerY, z);
      mesh.rotation.y = rotY;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    const WEST_WALL_X = ROOM_POS.x - ROOM_SIZE / 2 + ROOM_WALL_THICKNESS / 2 + 0.05;
    const EAST_WALL_X = ROOM_POS.x + ROOM_SIZE / 2 - ROOM_WALL_THICKNESS / 2 - 0.05;
    const NORTH_WALL_Z = ROOM_POS.z - ROOM_SIZE / 2 + ROOM_WALL_THICKNESS / 2 + 0.05;
    const SOUTH_WALL_Z = ROOM_POS.z + ROOM_SIZE / 2 - ROOM_WALL_THICKNESS / 2 - 0.05;

    // Hero control-unit panel — west wall, south segment (clear of the
    // ventDecal above, which sits on the north segment of this same wall).
    // A looping video of this same panel (the user's own reference clip —
    // a glowing pulse traveling through the pipes, the screen's readout
    // cycling) used as the material's map instead of a static photo, so the
    // wall itself animates. Same flush floor-to-ceiling sizing as the other
    // hero panels, derived from the video's own 1280x720 aspect.
    const heroVideo = document.createElement("video");
    // Two sources (WebM/VP9 first, MP4/H.264 fallback) since not every
    // WebView build ships both codecs — the browser picks whichever it
    // actually supports.
    const heroSourceWebm = document.createElement("source");
    heroSourceWebm.src = "/textures/control-panel-anim.webm";
    heroSourceWebm.type = "video/webm";
    const heroSourceMp4 = document.createElement("source");
    heroSourceMp4.src = "/textures/control-panel-anim.mp4";
    heroSourceMp4.type = "video/mp4";
    heroVideo.appendChild(heroSourceWebm);
    heroVideo.appendChild(heroSourceMp4);
    heroVideo.loop = true;
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroVideo.load();
    heroVideo.play().catch(() => {});
    const heroVideoTexture = new THREE.VideoTexture(heroVideo);
    heroVideoTexture.colorSpace = THREE.SRGBColorSpace;
    const heroWidth = ROOM_WALL_HEIGHT * (1280 / 720);
    const heroMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(heroWidth, ROOM_WALL_HEIGHT),
      new THREE.MeshStandardMaterial({ map: heroVideoTexture, roughness: 0.6, metalness: 0.3 }),
    );
    heroMesh.position.set(WEST_WALL_X, ROOM_WALL_HEIGHT / 2, ROOM_POS.z + ROOM_SEG_OFFSET);
    heroMesh.rotation.y = Math.PI / 2;
    heroMesh.receiveShadow = true;
    scene.add(heroMesh);
    // Electrical box — east wall, north segment.
    addWallDecal("/textures/electric-box.jpg", 1.4, 1.2, EAST_WALL_X, ROOM_POS.z - 5, -Math.PI / 2, 620 / 460);
    // Server rack — east wall, south segment, floor-mounted.
    addWallDecal("/textures/server-rack.jpg", 2.0, 1.7, EAST_WALL_X, ROOM_POS.z + 5, -Math.PI / 2, 1056 / 640);
    // Larger vent style — north wall, west segment.
    addWallDecal("/textures/vent-panel-2.jpg", 3.2, 1.9, ROOM_POS.x - 5, NORTH_WALL_Z, 0, 420 / 720);
    // A second hero panel ("48 A") — south wall, west segment, right next to
    // door 2's gap (the gate itself, at x 59-61, is left untouched) but
    // pulled in just enough to keep clear of it. Same floor-to-ceiling,
    // no-stretch sizing as the door-3 hero panel.
    addWallDecal("/textures/wall-hero-panel-2.jpg", ROOM_WALL_HEIGHT * (1536 / 1024), ROOM_WALL_HEIGHT / 2, 55.9, SOUTH_WALL_Z, Math.PI, 1024 / 1536);

    let player: FighterRig | null = null;

    // Preloaded here so it's very likely already resolved by the time each
    // fighter's rig finishes loading — every fighter is armed on spawn now,
    // it's the weapon every fighter actually shoots with (see the fire
    // logic in the tick loop below).
    const gunPrototype = loadGunPrototype();
    const equipGun = (rig: FighterRig) => {
      if (!rig.rightHand) return;
      gunPrototype.then((proto) => {
        rig.gun = createGunAttachment(rig.rightHand as THREE.Object3D, proto);
        curlGunGripFingers(rig.rightFingers, 1);
        curlGunGripFingers(rig.leftFingers, -1);
      });
    };

    loadFighter(scene, 0xffffff, (rig) => {
      if (disposed) return;
      rig.root.position.set(0, 0, 3);
      rig.root.rotation.y = Math.PI; // face into the dungeon at the start
      player = rig;
      equipGun(rig);
    });

    // Six fighters total: five room guards (index 0-4, one patrolling each
    // of ROOM_POSITIONS) plus the Boss (index 5, stationed in Room 6) —
    // all loaded from the same rig/model, just spawned at different posts
    // and the Boss additionally scaled up and tinted (see tintBossFighter).
    const bots: (FighterRig | null)[] = [null, null, null, null, null, null];
    for (let i = 0; i < BOT_SPAWNS.length; i++) {
      const spawn = BOT_SPAWNS[i];
      loadBotFighter(scene, "/characters/bot-2.glb", (rig) => {
        if (disposed) return;
        rig.root.position.set(spawn.x, 0, spawn.z);
        bots[i] = rig;
        equipGun(rig);
      });
    }
    loadBotFighter(scene, "/characters/bot-2.glb", (rig) => {
      if (disposed) return;
      rig.root.position.set(BOSS_SPAWN.x, 0, BOSS_SPAWN.z);
      rig.root.scale.setScalar(BOSS_SCALE);
      tintBossFighter(rig);
      bots[5] = rig;
      equipGun(rig);
    });
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    const clock = new THREE.Clock();
    let playerHpLocal = 100;
    let playerCooldown = 0;
    let playerFireT = -1;
    // Smoothed horizontal ground velocity — movement eases toward the
    // joystick-derived target instead of snapping to it, which is what
    // gives the accel/decel and the turning its weight.
    let playerVelX = 0;
    let playerVelZ = 0;
    let sprintBlend = 0;
    let playerSpeedNow = 0;
    let ended = false;
    // Short-lived tracer lines from a gun to its target, spawned per shot
    // and cleaned up once their life runs out (see spawnTracer/updateTracers).
    const tracers: Tracer[] = [];
    let playerDeathT = -1;
    let pendingResult: "win" | "lose" | null = null;
    let resultRevealT = 0;
    const camTargetPos = new THREE.Vector3();
    const camLookAt = new THREE.Vector3();

    // Index 0-4: the five room guards, one per ROOM_POSITIONS entry (see
    // roomIndex). Index 5: the Boss — tougher, and isBoss skips the
    // patrol/chase behavior entirely in favor of holding its ground.
    const botMaxHps = [100, 100, 100, 100, 100, BOSS_HP];
    const botStates = botMaxHps.map((hp, i) => ({
      hp,
      cooldown: 0,
      fireT: -1,
      deathT: -1,
      dead: false,
      isBoss: i === 5,
      roomIndex: i, // only meaningful for guards (0-4); Boss ignores it
      awake: i === 5, // the Boss has no guard/patrol behavior to wait on
      alertT: -1,
      patrolTarget: null as { x: number; z: number } | null,
      stuckT: 0,
      avoidSign: 1 as 1 | -1,
      // How long it's been since this fighter last actually had a clear
      // line of sight to the player while chasing — see LOSE_SIGHT_GIVEUP.
      loseSightT: 0,
    }));
    // Applies damage to one bot by index, handling its death (topple pose)
    // and the overall win condition (every fighter dead).
    const damageBot = (idx: number, amount: number) => {
      const st = botStates[idx];
      const rig = bots[idx];
      if (st.dead || !rig) return;
      damageDealtRef.current += Math.min(amount, st.hp);
      st.hp = Math.max(0, st.hp - amount);
      setBotHps((prev) => {
        const next = prev.slice();
        next[idx] = (st.hp / botMaxHps[idx]) * 100;
        return next;
      });
      if (st.hp <= 0) {
        st.dead = true;
        st.deathT = 0;
        killCountRef.current += 1;
        startDeath(rig);
        if (botStates.every((s) => s.dead)) {
          ended = true;
          pendingResult = "win";
        }
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      player?.mixer?.update(dt);
      for (const rig of bots) rig?.mixer?.update(dt);
      // Re-bend the off-hand toward the gun's foregrip after the mixer has
      // (re)applied this frame's idle/run/fire pose — see
      // updateOffHandReach. Skipped once dead: the death clip already
      // drives the arm bones for the collapse, and re-bending the off-hand
      // onto the gun every frame would fight that pose (and just looks
      // wrong — a dropped body shouldn't still be gripping the gun).
      if (player && playerDeathT < 0) updateOffHandReach(player);
      for (let i = 0; i < bots.length; i++) {
        const rig = bots[i];
        if (rig && botStates[i].deathT < 0) updateOffHandReach(rig);
      }
      updateTracers(tracers, dt);

      if (player && playerDeathT >= 0) {
        applyDeathPose(player, playerDeathT);
        playerDeathT += dt;
      }

      // Each fighter's own health bar floats directly over its head in the
      // 3D view instead of a fixed corner list — hidden once dead, once
      // it's behind the camera, or while it's still above half health
      // (only worth calling out once it's actually hurting).
      for (let i = 0; i < bots.length; i++) {
        const rig = bots[i];
        const st = botStates[i];
        if (rig && st.deathT >= 0) {
          applyDeathPose(rig, st.deathT);
          st.deathT += dt;
        }
        const barEl = botHpBarRefs.current[i];
        if (barEl) {
          if (rig && !st.dead && st.hp / botMaxHps[i] <= 0.5) {
            const markPoint = rig.root.position.clone();
            markPoint.y += st.isBoss ? 2.6 : 1.95;
            markPoint.project(camera);
            if (markPoint.z < 1) {
              const w = container.clientWidth;
              const h = container.clientHeight;
              barEl.style.display = "block";
              barEl.style.left = `${(markPoint.x + 1) * 0.5 * w}px`;
              barEl.style.top = `${(1 - markPoint.y) * 0.5 * h}px`;
            } else {
              barEl.style.display = "none";
            }
          } else {
            barEl.style.display = "none";
          }
        }
      }

      if (ended && pendingResult) {
        resultRevealT += dt;
        if (resultRevealT > DEATH_TOTAL_DURATION) {
          setResult(pendingResult);
          pendingResult = null;
        }
      }

      if (!ended && player) {
        const jv = joystickVec.current;
        const joyMag = Math.min(1, Math.hypot(jv.x, jv.y));

        // Sprint eases in once the stick is held past SPRINT_ENGAGE_MAG (or
        // the RUN button is toggled on) and eases back out the instant
        // neither is true, rather than snapping a speed multiplier on or off.
        const wantSprint = runToggled.current || joyMag > SPRINT_ENGAGE_MAG;
        sprintBlend = approach(sprintBlend, wantSprint ? 1 : 0, SPRINT_BLEND_RATE, dt);

        // Movement is relative to where the camera is currently looking
        // (like Free Fire), not fixed to world axes — dragging to look
        // around with one finger while pushing the joystick with the
        // other should send the player toward whatever direction the
        // camera has been turned to face.
        const camForwardX = -Math.sin(cameraYaw.current);
        const camForwardZ = -Math.cos(cameraYaw.current);
        const camRightX = Math.cos(cameraYaw.current);
        const camRightZ = -Math.sin(cameraYaw.current);
        const rawX = jv.x * camRightX + jv.y * camForwardX;
        const rawZ = jv.x * camRightZ + jv.y * camForwardZ;
        // With the RUN toggle on and the stick untouched, run straight
        // ahead (camera-forward) instead of standing still — RUN is meant
        // to start the character moving on its own, not just raise the
        // speed cap for whenever the stick happens to be pushed. Touching
        // the stick while RUN is on still steers normally.
        // Pushing the stick straight up (jv.y negative) works out to
        // -camForward once run through rawX/rawZ above (jv.y's sign flips
        // it), so "forward" to match that same convention is -camForward,
        // not camForward directly.
        const runningInPlace = runToggled.current && joyMag <= 0.0001;
        const dirX = joyMag > 0.0001 ? rawX / joyMag : runningInPlace ? -camForwardX : 0;
        const dirZ = joyMag > 0.0001 ? rawZ / joyMag : runningInPlace ? -camForwardZ : 0;
        const effectiveMag = runningInPlace ? 1 : joyMag;

        // How far the stick is pushed sets the target speed continuously —
        // a light tap walks, a full push runs, and holding full tilt ramps
        // sprint in on top — so there's no discrete walk/jog/run jump.
        const targetSpeed = effectiveMag * PLAYER_MAX_SPEED * (1 + PLAYER_SPRINT_BONUS * sprintBlend);
        const targetVelX = dirX * targetSpeed;
        const targetVelZ = dirZ * targetSpeed;
        const curVelLen = Math.hypot(playerVelX, playerVelZ);
        const targetVelLen = Math.hypot(targetVelX, targetVelZ);
        // Speeding up and slowing down ease at different rates (a snappier
        // stop than start) instead of both snapping instantly — that's
        // what gives the movement its weight.
        const accelRate = targetVelLen > curVelLen ? PLAYER_ACCEL_RATE : PLAYER_DECEL_RATE;
        playerVelX = approach(playerVelX, targetVelX, accelRate, dt);
        playerVelZ = approach(playerVelZ, targetVelZ, accelRate, dt);

        player.root.position.x = clamp(player.root.position.x + playerVelX * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
        player.root.position.z = clamp(player.root.position.z + playerVelZ * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
        resolveObstacleCollisions(player.root.position);

        // Walking down each house's stairwell (see ROOM_STAIRS_DOWN_POS/
        // ROOM_TUNNEL_DIR for its footprint) continuously follows the
        // stairs' own slope — height is just a function of how far along
        // the run the player currently is, not a separate fall/rise state.
        for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
          const spot = ROOM_STAIRS_DOWN_POS[i];
          const dir = ROOM_TUNNEL_DIR[i];
          const dx = player.root.position.x - spot.x;
          const dz = player.root.position.z - spot.z;
          const along = dx * dir.x + dz * dir.z;
          const perp = dz * dir.x - dx * dir.z;
          if (Math.abs(perp) < RAMP_HALF_WIDTH && along > -RAMP_BAND && along < RAMP_RUN_LENGTH + RAMP_BAND) {
            const progress = clamp(along / RAMP_RUN_LENGTH, 0, 1);
            player.root.position.y = THREE.MathUtils.lerp(0, TUNNEL_Y, progress);
            break;
          }
        }

        // Slide each gate open as the player nears its door, closed again
        // once they've moved away. Also opens for any bot, not just the
        // player — a gate that only ever reacted to the player would slide
        // shut in a chasing bot's face the moment the player ran back
        // through it and out of GATE_OPEN_RADIUS, trapping the bot against
        // a door it has no way to open.
        for (const g of gates) {
          const gateDx = player.root.position.x - g.door.x;
          const gateDz = player.root.position.z - g.door.z;
          let anyNear = Math.hypot(gateDx, gateDz) < GATE_OPEN_RADIUS;
          if (!anyNear) {
            for (const rig of bots) {
              if (!rig) continue;
              const botGateDx = rig.root.position.x - g.door.x;
              const botGateDz = rig.root.position.z - g.door.z;
              if (Math.hypot(botGateDx, botGateDz) < GATE_OPEN_RADIUS) {
                anyNear = true;
                break;
              }
            }
          }
          const gateTarget = anyNear ? 1 : 0;
          g.openAmount = approach(g.openAmount, gateTarget, GATE_SLIDE_RATE, dt);
          updateGatePanels(g);
        }
        // Recomputed every tick from each gate's current slide position —
        // see gateBlockers/hasLineOfSight — so a shot is stopped by a
        // still-closed or half-open gate exactly like a wall, and clears
        // the instant it finishes sliding open.
        gateBlockers = gates.flatMap((g) =>
          g.door.axis === "x"
            ? [
                { x: g.panelA.position.x, z: g.panelA.position.z, halfX: g.panelWidth / 2, halfZ: GATE_THICKNESS / 2, pad: 0 },
                { x: g.panelB.position.x, z: g.panelB.position.z, halfX: g.panelWidth / 2, halfZ: GATE_THICKNESS / 2, pad: 0 },
              ]
            : [
                { x: g.panelA.position.x, z: g.panelA.position.z, halfX: GATE_THICKNESS / 2, halfZ: g.panelWidth / 2, pad: 0 },
                { x: g.panelB.position.x, z: g.panelB.position.z, halfX: GATE_THICKNESS / 2, halfZ: g.panelWidth / 2, pad: 0 },
              ],
        );
        playerSpeedNow = Math.hypot(playerVelX, playerVelZ);
        // Face the direction actually being moved in (not the raw stick
        // input) and ease into it instead of snapping, which keeps the
        // body orientation looking natural through a direction change
        // instead of instantly spinning to face it.
        if (playerSpeedNow > 0.05) {
          const targetYaw = Math.atan2(playerVelX, playerVelZ);
          player.root.rotation.y = dampAngle(player.root.rotation.y, targetYaw, PLAYER_TURN_RATE, dt);
        }

        // How far into Idle -> Running the real mocap clips are blended,
        // continuously off actual speed so there's no hard on/off cut.
        const speedFrac = clamp(playerSpeedNow / PLAYER_MAX_SPEED, 0, 1.15);
        updateLocomotionAnim(player, speedFrac, playerSpeedNow);

        // While stationary, the player's body keeps whatever facing it had
        // from its last movement — free-look camera drags orbit the view
        // around the character without spinning the character itself
        // (matching Free Fire: panning the screen doesn't turn your body).

        // All six fighters act independently and simultaneously — every
        // one still alive (the five guards, plus the Boss) can land its
        // own hit, rather than only "the current" one taking a turn.
        // Track the nearest one the player can actually see, as the
        // player's own auto-aim target.
        let nearestIdx = -1;
        let nearestDist = Infinity;
        for (let i = 0; i < bots.length; i++) {
          const rig = bots[i];
          const st = botStates[i];
          if (!rig || st.dead) continue;

          let botDx = player.root.position.x - rig.root.position.x;
          let botDz = player.root.position.z - rig.root.position.z;
          let botDist = Math.hypot(botDx, botDz);

          // Keep the two bodies from walking through each other.
          if (botDist < BODY_SEPARATION) {
            const nx = botDist > 0.0001 ? botDx / botDist : 0;
            const nz = botDist > 0.0001 ? botDz / botDist : 1;
            player.root.position.x = clamp(rig.root.position.x + nx * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
            player.root.position.z = clamp(rig.root.position.z + nz * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
            botDx = player.root.position.x - rig.root.position.x;
            botDz = player.root.position.z - rig.root.position.z;
            botDist = Math.hypot(botDx, botDz);
          }

          if (st.isBoss) {
            // The Boss holds its ground in Room 6 — it never patrols or
            // chases, but opens fire the instant the player comes within
            // range and line of sight.
            updateLocomotionAnim(rig, 0, 0);
            rig.root.rotation.y = Math.atan2(botDx, botDz);
            const canSeePlayer = hasLineOfSight(rig.root.position.x, rig.root.position.z, player.root.position.x, player.root.position.z);
            st.cooldown = Math.max(0, st.cooldown - dt);
            if (botDist <= GUN_RANGE && st.cooldown <= 0 && canSeePlayer) {
              playerHpLocal = Math.max(0, playerHpLocal - BOSS_DAMAGE);
              setPlayerHp(playerHpLocal);
              st.cooldown = BOSS_ATTACK_COOLDOWN;
              st.fireT = 0;
              rig.fireAction?.reset().play();
              const targetPoint = new THREE.Vector3(player.root.position.x, TRACER_TARGET_HEIGHT, player.root.position.z);
              tracers.push(spawnTracer(scene, rig.gun, rig.root.position, targetPoint));
            }
            if (st.fireT >= 0) {
              applyFirePose(rig, st.fireT);
              st.fireT = st.fireT + dt > FIRE_ANIM_DURATION ? -1 : st.fireT + dt;
            }
          } else if (!st.awake) {
            // Dormant guard: patrols its own room (see pickRoomPatrolTarget)
            // until it actually spots the player — the instant it has a
            // clear line of sight within DETECTION_RANGE, not just when
            // they're within some fixed radius — then freezes, faces
            // them, and holds for a near-instant beat (alertT) before
            // waking into the chase below.
            if (st.alertT < 0) {
              if (
                !st.patrolTarget ||
                Math.hypot(rig.root.position.x - st.patrolTarget.x, rig.root.position.z - st.patrolTarget.z) < PATROL_ARRIVE_DIST ||
                // A wider room-wide patrol crosses paths with the room's
                // own crates far more than the old small loop around the
                // guard post did — moveWithAvoidance's simple sideways
                // steering can still end up oscillating in a stable loop
                // against a corner rather than actually clearing it (seen
                // in testing: pinned dead against a crate edge for 45+s
                // straight). Once it's been stuck that long, abandon the
                // current waypoint for a fresh one instead of fixating on
                // one that may not be reachable from here.
                st.stuckT > STUCK_AVOID_FLIP_DELAY * 2
              ) {
                st.patrolTarget = pickRoomPatrolTarget(st.roomIndex);
                st.stuckT = 0;
              }
              const pdx = st.patrolTarget.x - rig.root.position.x;
              const pdz = st.patrolTarget.z - rig.root.position.z;
              const pdist = Math.hypot(pdx, pdz);
              if (pdist > 0.0001) {
                moveWithAvoidance(rig, st, pdx / pdist, pdz / pdist, PATROL_SPEED, dt);
                rig.root.rotation.y = Math.atan2(pdx, pdz);
                updateLocomotionAnim(rig, PATROL_RUN_WEIGHT, PATROL_SPEED);
              }
              if (
                botDist <= DETECTION_RANGE &&
                hasLineOfSight(rig.root.position.x, rig.root.position.z, player.root.position.x, player.root.position.z)
              ) {
                st.alertT = ALERT_TELEGRAPH_DURATION;
              }
            } else {
              updateLocomotionAnim(rig, 0, 0);
              rig.root.rotation.y = Math.atan2(botDx, botDz);
              st.alertT -= dt;
              if (st.alertT <= 0) st.awake = true;
            }
          } else {
            // Awake guard: closes the gap until it has a clear shot, then
            // holds position and fires. A wall between it and the player
            // blocks the shot (see hasLineOfSight) same as it blocks a
            // real bullet, so being "in range" by distance alone isn't
            // enough.
            const canSeePlayer = hasLineOfSight(rig.root.position.x, rig.root.position.z, player.root.position.x, player.root.position.z);
            if (canSeePlayer) {
              st.loseSightT = 0;
            } else {
              st.loseSightT += dt;
              if (st.loseSightT > LOSE_SIGHT_GIVEUP) {
                // Genuinely lost them (they ran out of the room, around
                // several corners, whatever) — stop chasing and go back to
                // patrolling instead of walking at their last known spot
                // forever. Fresh patrolTarget/stuckT so it doesn't pick up
                // mid-chase momentum as a patrol waypoint.
                st.awake = false;
                st.patrolTarget = null;
                st.stuckT = 0;
                st.loseSightT = 0;
                updateLocomotionAnim(rig, 0, 0);
              }
            }
            if (st.awake) {
              if (botDist > GUN_RANGE * 0.85 || !canSeePlayer) {
                moveWithAvoidance(rig, st, botDx / botDist, botDz / botDist, BOT_SPEED, dt);
                updateLocomotionAnim(rig, 1, BOT_SPEED);
              } else {
                updateLocomotionAnim(rig, 0, 0);
              }
              rig.root.rotation.y = Math.atan2(botDx, botDz);

              st.cooldown = Math.max(0, st.cooldown - dt);
              if (botDist <= GUN_RANGE && st.cooldown <= 0 && canSeePlayer) {
                playerHpLocal = Math.max(0, playerHpLocal - BOT_DAMAGE);
                setPlayerHp(playerHpLocal);
                st.cooldown = BOT_ATTACK_COOLDOWN;
                st.fireT = 0;
                rig.fireAction?.reset().play();
                const targetPoint = new THREE.Vector3(player.root.position.x, TRACER_TARGET_HEIGHT, player.root.position.z);
                tracers.push(spawnTracer(scene, rig.gun, rig.root.position, targetPoint));
              }
            }
            if (st.fireT >= 0) {
              applyFirePose(rig, st.fireT);
              st.fireT = st.fireT + dt > FIRE_ANIM_DURATION ? -1 : st.fireT + dt;
            }
          }

          // Only a fighter the player can actually see counts as a
          // target — a closer one hidden behind a wall (or a gate)
          // shouldn't steal the auto-aim (or the shot's damage) from a
          // farther one actually in view.
          if (botDist < nearestDist && hasLineOfSight(player.root.position.x, player.root.position.z, rig.root.position.x, rig.root.position.z)) {
            nearestDist = botDist;
            nearestIdx = i;
          }
        }

        playerCooldown = Math.max(0, playerCooldown - dt);

        // Auto-fire: attackRequested stays true for as long as the FIRE
        // button is held (set on pointer down, cleared on pointer up/
        // leave/cancel — see the button below), rather than being
        // consumed after one shot, so holding it down keeps firing every
        // time the cooldown clears until the finger lifts.
        if (attackRequested.current) {
          if (playerCooldown <= 0) {
            // The shot always fires — recoil, cooldown, tracer, the works —
            // on press. Snap the body to face wherever the camera is
            // pointed the instant it fires, so it always visibly faces the
            // shot direction rather than whatever it happened to face
            // before.
            player.root.rotation.y = cameraYaw.current;
            playerCooldown = PLAYER_ATTACK_COOLDOWN;
            playerFireT = 0;
            player.fireAction?.reset().play();
            const aimYaw = cameraYaw.current;
            const canHitBot = nearestIdx !== -1 && nearestDist <= GUN_RANGE;
            const targetPoint =
              canHitBot && bots[nearestIdx]
                ? new THREE.Vector3(bots[nearestIdx]!.root.position.x, TRACER_TARGET_HEIGHT, bots[nearestIdx]!.root.position.z)
                : new THREE.Vector3(
                    player.root.position.x + Math.sin(aimYaw) * GUN_RANGE,
                    TRACER_TARGET_HEIGHT,
                    player.root.position.z + Math.cos(aimYaw) * GUN_RANGE,
                  );
            tracers.push(spawnTracer(scene, player.gun, player.root.position, targetPoint));
            if (canHitBot) damageBot(nearestIdx, PLAYER_DAMAGE);
          }
        }

        if (playerFireT >= 0) {
          applyFirePose(player, playerFireT);
          playerFireT = playerFireT + dt > FIRE_ANIM_DURATION ? -1 : playerFireT + dt;
        }

        if (playerHpLocal <= 0) {
          ended = true;
          playerDeathT = 0;
          startDeath(player);
          pendingResult = "lose";
        }
      }

      // Re-center the shadow-casting light's frustum on the player every
      // frame (see SHADOW_FOLLOW_DIR/DISTANCE above) — same fixed lighting
      // angle, just recentered, so shadow resolution stays sharp locally
      // instead of trying to cover the whole 700x700 arena at once.
      if (player) {
        key.position.copy(player.root.position).addScaledVector(SHADOW_FOLLOW_DIR, SHADOW_FOLLOW_DISTANCE);
        key.target.position.copy(player.root.position);
        key.target.updateMatrixWorld();
      }

      // Chase camera keeps following/rendering even after the match ends,
      // so the loser's/bot's death animation actually plays out on screen
      // instead of the view freezing the instant HP hits zero.
      if (player) {
        // Chase camera: sits behind the player along cameraYaw and eases
        // toward that spot each frame instead of snapping, so turning
        // feels smooth rather than jittery. Movement is derived from this
        // same angle (see above), so the camera never needs to "catch up"
        // to the player — dragging to free-look simply turns cameraYaw
        // directly, and that's already where movement and the view both
        // point. The follow damping is frame-rate independent (an
        // exponential ease on dt, not a fixed per-frame lerp factor), and
        // it eases a little slower while the player's speed is changing
        // quickly — accelerating off the mark or braking to a stop — which
        // reads as a slight, natural lag instead of a rigid, glued-on rig.
        const facing = cameraYaw.current;
        const pitch = clamp(CAM_BASE_PITCH + cameraPitch.current, CAM_PITCH_MIN, CAM_PITCH_MAX);
        const orbitHoriz = CAM_ORBIT_RADIUS * Math.cos(pitch);
        const orbitVert = CAM_ORBIT_RADIUS * Math.sin(pitch);
        camTargetPos.set(
          player.root.position.x - Math.sin(facing) * orbitHoriz,
          CAM_LOOK_HEIGHT + player.root.position.y + orbitVert,
          player.root.position.z - Math.cos(facing) * orbitHoriz,
        );
        // The follow used to add a head bob synced to the running phase
        // and a slight roll while turning, for a more cinematic feel —
        // but on a small phone screen that reads as the whole view
        // shaking rather than adding life, so the camera now just tracks
        // the player's position and facing with nothing layered on top:
        // fully stable regardless of how fast the player is moving.
        camera.position.lerp(camTargetPos, 1 - Math.exp(-CAM_DAMP_RATE * dt));

        camLookAt.set(player.root.position.x, CAM_LOOK_HEIGHT + player.root.position.y, player.root.position.z);
        camera.lookAt(camLookAt);
      }

      composer.render();
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      heroVideo.pause();
      heroVideo.src = "";
      renderer.dispose();
      container.removeChild(renderer.domElement);
      gateBlockers = [];
    };
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const base = joystickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }
    joystickVec.current = { x: dx / radius, y: dy / radius };
    const knob = joystickKnobRef.current;
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resetJoystick = () => {
    joystickVec.current = { x: 0, y: 0 };
    joystickTouchId.current = null;
    const knob = joystickKnobRef.current;
    if (knob) knob.style.transform = "translate(0px, 0px)";
  };

  const handleLookDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lookTouchId.current = e.pointerId;
    lookLastX.current = e.clientX;
    lookLastY.current = e.clientY;
  };
  const handleLookMove = (e: React.PointerEvent) => {
    if (lookTouchId.current !== e.pointerId) return;
    const dx = e.clientX - lookLastX.current;
    const dy = e.clientY - lookLastY.current;
    lookLastX.current = e.clientX;
    lookLastY.current = e.clientY;
    cameraYaw.current -= dx * LOOK_SENSITIVITY_BASE * lookSensitivity;
    // Dragging up (dy negative) looks up, so subtract dy rather than add it.
    cameraPitch.current = clamp(cameraPitch.current - dy * LOOK_SENSITIVITY_BASE * lookSensitivity, -1.6, 1.6);
  };

  const changeSensitivity = (value: number) => {
    const clamped = clamp(value, LOOK_SENSITIVITY_MIN, LOOK_SENSITIVITY_MAX);
    setLookSensitivity(clamped);
    localStorage.setItem(LOOK_SENSITIVITY_STORAGE_KEY, String(clamped));
  };
  const handleLookUp = () => {
    lookTouchId.current = null;
  };

  return (
    <div
      role="dialog"
      aria-label="DEPLOY"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "linear-gradient(160deg, #0a1220 0%, #060a14 100%)",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
      />

      {/* Health bar */}
      <div style={{ position: "absolute", top: 16, left: 16, width: "min(38%, 260px)" }}>
        <div style={{ color: "#dce8f5", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", marginBottom: 4 }}>
          YOU
        </div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${playerHp}%`, background: "linear-gradient(90deg,#4fd8ff,#6be2ff)", transition: "width 150ms ease-out" }} />
        </div>
      </div>

      {/* Each fighter's own health bar floats directly above its head
          in-world (see the screen-projection block in the tick loop),
          not fixed to a screen corner, so it stays pinned to whichever
          bot it belongs to. Index 5 is the Boss — wider bar, own label. */}
      {botHps.map((hp, i) => (
        <div
          key={i}
          ref={(el) => {
            botHpBarRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            width: i === 5 ? 110 : 90,
            marginLeft: i === 5 ? -55 : -45,
            marginTop: -30,
            display: "none",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              color: i === 5 ? "#ff8a8a" : "#dce8f5",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.08em",
              marginBottom: 2,
              textAlign: "center",
              textShadow: "0 0 4px rgba(0,0,0,0.9)",
            }}
          >
            {i === 5 ? "BOSS" : `GUARD ${i + 1}`}
          </div>
          <div style={{ height: i === 5 ? 8 : 6, borderRadius: 3, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${hp}%`,
                background: i === 5 ? "linear-gradient(90deg,#ff3b3b,#8a0000)" : "linear-gradient(90deg,#ff6b5e,#ff9a4d)",
                transition: "width 150ms ease-out",
              }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={onExit}
        aria-label="Exit match"
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "6px 18px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(200,220,240,0.4)",
          borderRadius: 4,
          color: "#dce8f5",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        EXIT
      </button>

      {/* Look-sensitivity settings */}
      <button
        onClick={() => setSettingsOpen((v) => !v)}
        aria-label="Camera settings"
        style={{
          position: "absolute",
          top: 58,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: settingsOpen ? "rgba(107,216,255,0.25)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(200,220,240,0.4)",
          color: "#dce8f5",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        ⚙
      </button>
      {settingsOpen && (
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 16,
            width: "min(72vw, 260px)",
            padding: "12px 14px",
            background: "rgba(8,14,24,0.92)",
            border: "1px solid rgba(150,200,230,0.35)",
            borderRadius: 8,
            touchAction: "none",
          }}
        >
          <div
            style={{
              color: "#dce8f5",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.06em",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>LOOK SENSITIVITY</span>
            <span>{lookSensitivity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={LOOK_SENSITIVITY_MIN}
            max={LOOK_SENSITIVITY_MAX}
            step={0.1}
            value={lookSensitivity}
            onChange={(e) => changeSensitivity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* Virtual joystick */}
      <div
        ref={joystickBaseRef}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          joystickTouchId.current = e.pointerId;
          updateJoystick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (joystickTouchId.current === e.pointerId) updateJoystick(e.clientX, e.clientY);
        }}
        onPointerUp={() => resetJoystick()}
        onPointerCancel={() => resetJoystick()}
        style={{
          position: "absolute",
          left: "6%",
          bottom: "8%",
          width: "clamp(90px, 16vw, 130px)",
          height: "clamp(90px, 16vw, 130px)",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          border: "1.5px solid rgba(150,200,230,0.4)",
          touchAction: "none",
        }}
      >
        <div
          ref={joystickKnobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "42%",
            height: "42%",
            marginLeft: "-21%",
            marginTop: "-21%",
            borderRadius: "50%",
            background: "rgba(107,216,255,0.5)",
            border: "1.5px solid rgba(190,235,255,0.85)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Fire button — auto-fires for as long as it's held down (see the
          attackRequested consumption in the tick loop), not just once per
          tap. setPointerCapture keeps the up/cancel events firing on this
          button even if the finger slides off it while held, so a drag-off
          reliably stops the fire instead of leaving it stuck on. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          attackRequested.current = true;
        }}
        onPointerUp={() => {
          attackRequested.current = false;
        }}
        onPointerCancel={() => {
          attackRequested.current = false;
        }}
        aria-label="Fire"
        style={{
          position: "absolute",
          right: "7%",
          bottom: "9%",
          width: "clamp(72px, 13vw, 100px)",
          height: "clamp(72px, 13vw, 100px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, #ff8a6b, #d8402c)",
          border: "2px solid rgba(255,220,210,0.85)",
          boxShadow: "0 0 20px rgba(255,90,60,0.6)",
          color: "#fff8f0",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontSize: "clamp(13px, 2vw, 16px)",
          cursor: "pointer",
        }}
      >
        FIRE
      </button>

      {/* Run toggle button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          runToggled.current = !runToggled.current;
          setRunActive(runToggled.current);
        }}
        aria-label="Run"
        style={{
          position: "absolute",
          right: "calc(7% + clamp(72px, 13vw, 100px) + 14px)",
          bottom: "9%",
          width: "clamp(56px, 10vw, 76px)",
          height: "clamp(56px, 10vw, 76px)",
          borderRadius: "50%",
          background: runActive ? "radial-gradient(circle, #baffb0, #3fd85a)" : "radial-gradient(circle, #8fe89a, #2f8f45)",
          border: runActive ? "2px solid rgba(220,255,220,0.95)" : "2px solid rgba(210,255,210,0.7)",
          boxShadow: runActive ? "0 0 26px rgba(90,255,120,0.85)" : "0 0 14px rgba(90,255,120,0.4)",
          color: "#f0fff2",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontSize: "clamp(11px, 1.7vw, 14px)",
          cursor: "pointer",
        }}
      >
        RUN
      </button>

      {result !== "playing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            background: "rgba(3,6,13,0.75)",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 6vw, 52px)",
              letterSpacing: "0.15em",
              color: result === "win" ? "#6be2ff" : "#ff6b5e",
              textShadow: result === "win" ? "0 0 24px rgba(107,216,255,0.8)" : "0 0 24px rgba(255,107,94,0.8)",
            }}
          >
            {result === "win" ? "VICTORY" : "DEFEAT"}
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(13px, 2.6vw, 16px)",
              letterSpacing: "0.08em",
              color: "#ffd23f",
            }}
          >
            +{killCountRef.current * KILL_XP + (result === "win" ? WIN_XP_BONUS : 0)} XP
            {killCountRef.current > 0 && ` · ${killCountRef.current} kill${killCountRef.current === 1 ? "" : "s"}`}
          </div>
          <button
            onClick={onExit}
            style={{
              padding: "10px 32px",
              background: "rgba(120,140,160,0.28)",
              border: "1px solid rgba(180,200,220,0.4)",
              borderRadius: 4,
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            RETURN TO LOBBY
          </button>
        </div>
      )}
    </div>
  );
}

// A gift is a one-shot claim, not something the player can re-tap for more —
// once claimed it stays claimed until something else (a daily reset, a match
// win, etc. — not wired up yet) marks a new one available. Persisted in
// localStorage so it survives a reload instead of quietly resetting itself.
// No trigger exists yet, so this defaults to available once so the claim
// flow itself is testable; whatever trigger comes later is what's meant to
// flip it back to "1" going forward, not this default.
const GIFT_AVAILABLE_STORAGE_KEY = "10sa-gift-available";

function GiftClaimPanel({
  available,
  onClaim,
  onClose,
}: {
  available: boolean;
  onClaim: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Gift"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(360px, 82vw)",
          background: "linear-gradient(180deg, rgba(20,14,42,0.97), rgba(8,6,20,0.97))",
          border: "1px solid rgba(168,120,255,0.45)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(120,60,255,0.35), inset 0 0 40px rgba(80,40,180,0.15)",
          padding: "22px 26px 28px",
          fontFamily: "'Barlow', sans-serif",
          color: "#e8e2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 2,
              color: "#c9a8ff",
              textShadow: "0 0 18px rgba(170,110,255,0.7)",
            }}
          >
            GIFT
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e2ff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            height: 1,
            background: "linear-gradient(90deg, rgba(168,120,255,0.6), rgba(168,120,255,0))",
          }}
        />

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 8px" }}>
          {available ? (
            <>
              <img src="/lobby-gift-crate.png" alt="Gift crate" style={{ width: 130 }} />
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: 1, color: "#c9a8ff" }}>
                You have a gift waiting!
              </div>
              <button
                onClick={onClaim}
                style={{
                  marginTop: 6,
                  padding: "10px 28px",
                  border: "none",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #ff6a2b 0%, #ff3d1a 55%, #d81f0f 100%)",
                  boxShadow: "0 0 20px rgba(255,110,40,0.6)",
                  color: "#fff",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                CLAIM
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  border: "1px dashed rgba(168,120,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  opacity: 0.5,
                }}
              >
                🎁
              </div>
              <div style={{ fontSize: 14, color: "#8a80a8", textAlign: "center", maxWidth: 260 }}>
                No gift available right now. Check back later!
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GiftBox({
  missionPressed,
  onMissionPress,
  onMissionRelease,
  onMissionClick,
}: {
  missionPressed: boolean;
  onMissionPress: () => void;
  onMissionRelease: () => void;
  onMissionClick: () => void;
}) {
  const [available, setAvailable] = useState(() => {
    const stored = localStorage.getItem(GIFT_AVAILABLE_STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });
  const [pressed, setPressed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleClaim = () => {
    setAvailable(false);
    localStorage.setItem(GIFT_AVAILABLE_STORAGE_KEY, "0");
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "calc(44% - 45px)",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <button
          aria-label="Gift"
          onClick={() => setPanelOpen(true)}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          onTouchCancel={() => setPressed(false)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            transform: pressed ? "scale(0.94)" : "scale(1)",
            transition: "transform 120ms ease",
          }}
        >
          <style>{`
            @keyframes gift-shake-burst {
              0%   { transform: rotate(0deg); }
              2%   { transform: rotate(-9deg); }
              4%   { transform: rotate(8deg); }
              6%   { transform: rotate(-7deg); }
              8%   { transform: rotate(6deg); }
              10%  { transform: rotate(-4deg); }
              12%  { transform: rotate(3deg); }
              14%  { transform: rotate(0deg); }
              100% { transform: rotate(0deg); }
            }
          `}</style>
          {/* Shake bursts (vigorous, then a pause, then repeats) only run
              while a gift is actually waiting — a still crate signals
              nothing to claim, same convention as other games. The shine
              sweep runs all the time regardless of claim state. */}
          <div
            style={{
              animation: available ? "gift-shake-burst 2.6s ease-in-out infinite" : "none",
              transformOrigin: "50% 90%",
            }}
          >
            {/* mask-image lives on this wrapper (sized exactly to the
                crate image, 1:1) so it clips both the img and the sliding
                shine block below to the crate's real silhouette — an
                irregular chamfered shape, not a plain rectangle. Putting
                the mask on the (smaller, offset) sliding block itself
                would size/position the mask against that block's own
                box instead of the crate's, distorting it. */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                WebkitMaskImage: "url(/lobby-gift-crate.png)",
                WebkitMaskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskImage: "url(/lobby-gift-crate.png)",
                maskSize: "100% 100%",
                maskRepeat: "no-repeat",
              }}
            >
              <img
                src="/lobby-gift-crate.png"
                alt="Gift crate"
                draggable={false}
                style={{
                  width: "clamp(86px, 19.4vw, 142px)",
                  display: "block",
                }}
              />
              {/* Same sliding-block mechanic as the START MISSION
                  button's shine (left/width, not background-position) so
                  the two move at truly identical speed — matching just
                  the keyframe percentages while using a different CSS
                  property for the motion (as before) doesn't actually
                  produce the same felt speed. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-20%",
                  left: "-60%",
                  width: "35%",
                  height: "140%",
                  background:
                    "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)",
                  transform: "skewX(-20deg)",
                  animation: "mission-sweep 3.4s ease-in-out infinite",
                  animationDelay: "1s",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </button>
        <div
          style={{
            marginTop: 2,
            color: "#fff",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(13px, 3vw, 17px)",
            letterSpacing: "0.12em",
          }}
        >
          {available ? "OPEN" : "CLAIMED"}
        </div>
        {/* In normal flow as the next item in this same column, with a
            fixed 10px gap, instead of independently absolute-positioned —
            that way it's guaranteed to land exactly 10px below the crate
            cluster's actual rendered bottom (crate + label), on any
            screen, rather than at a fixed top:% that could drift into or
            past the crate depending on its size. */}
        <div style={{ marginTop: 0 }}>
          <StartMissionButton
            pressed={missionPressed}
            onPress={onMissionPress}
            onRelease={onMissionRelease}
            onClick={onMissionClick}
          />
        </div>
      </div>
      {panelOpen && (
        // Rendered as a sibling of the (small, translated) crate wrapper
        // above, not nested inside it — that wrapper's own translateX
        // transform would otherwise become this panel's containing block
        // for `inset: 0`, shrinking the backdrop down to the crate's own
        // little box instead of covering the full screen.
        <GiftClaimPanel available={available} onClaim={handleClaim} onClose={() => setPanelOpen(false)} />
      )}
    </>
  );
}

function ComingSoonPanel({
  title,
  icon,
  message,
  onClose,
}: {
  title: string;
  icon: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(360px, 82vw)",
          background: "linear-gradient(180deg, rgba(20,14,42,0.97), rgba(8,6,20,0.97))",
          border: "1px solid rgba(168,120,255,0.45)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(120,60,255,0.35), inset 0 0 40px rgba(80,40,180,0.15)",
          padding: "22px 26px 28px",
          fontFamily: "'Barlow', sans-serif",
          color: "#e8e2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 2,
              color: "#c9a8ff",
              textShadow: "0 0 18px rgba(170,110,255,0.7)",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e2ff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            height: 1,
            background: "linear-gradient(90deg, rgba(168,120,255,0.6), rgba(168,120,255,0))",
          }}
        />

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 8px" }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              border: "1px dashed rgba(168,120,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              opacity: 0.7,
            }}
          >
            {icon}
          </div>
          <div style={{ fontSize: 14, color: "#8a80a8", textAlign: "center", maxWidth: 260 }}>{message}</div>
        </div>
      </div>
    </div>
  );
}

function CharacterSelectionPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Character Selection"
      style={{ position: "absolute", inset: 0, zIndex: 10, background: "#000" }}
    >
      <img
        src="/character-select-full.jpg"
        alt="Character Selection"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 500,
          height: 500,
          maxWidth: "94vw",
          maxHeight: "94vw",
          objectFit: "contain",
          objectPosition: "left top",
        }}
      />
      <button
        onClick={onClose}
        aria-label="Back"
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          width: 38,
          height: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: "1.5px solid rgba(255,207,77,0.6)",
          background: "rgba(10,10,20,0.55)",
          color: "#ffcf4d",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        ‹
      </button>
    </div>
  );
}


const HOME_ICON = (
  <svg viewBox="0 0 24 24" width="46%" height="46%" fill="none">
    <path d="M3 11L12 4l9 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="15" r="1.6" fill="#fff" />
    <path d="M12 16.6v2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PEOPLE_ICON = (
  <svg viewBox="0 0 24 24" width="48%" height="48%" fill="none">
    <circle cx="9" cy="8" r="3.2" fill="#fff" />
    <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" fill="#fff" />
    <circle cx="16.5" cy="9" r="2.6" fill="#fff" opacity="0.85" />
    <path d="M14.8 13.9c2.9.4 4.7 2.6 4.7 5.6" fill="#fff" opacity="0.85" />
  </svg>
);

const MAIL_ICON = (
  <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none">
    <rect x="2.5" y="5" width="19" height="14" rx="1.6" stroke="#fff" strokeWidth="2" />
    <path d="M3.5 6.5L12 13l8.5-6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function LobbyIconButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        width: "clamp(48px, 12vw, 62px)",
        height: "clamp(48px, 12vw, 62px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        border: "1.5px solid rgba(255,150,70,0.65)",
        borderRadius: 8,
        background: "rgba(10,14,26,0.72)",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 120ms ease",
      }}
    >
      {icon}
      {label && (
        <span
          style={{
            color: "#fff",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(8px, 2.2vw, 11px)",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

// Real progress now (no account/backend, but persisted in localStorage
// instead of hardcoded) — every match played through CombatArena awards
// XP and updates these numbers for good, surviving reloads.
const PLAYER_NAME = "ShadowReaper";
const PLAYER_PROGRESS_STORAGE_KEY = "10sa-player-progress";
const KILL_XP = 40;
const WIN_XP_BONUS = 150;

type MatchHistoryEntry = {
  result: "win" | "lose";
  kills: number;
  xp: number;
  durationSec: number;
  damage: number;
  timestamp: number;
};

const MATCH_HISTORY_LIMIT = 10;

type PlayerProgress = {
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  wins: number;
  matches: number;
  history: MatchHistoryEntry[];
};

function xpNextForLevel(level: number): number {
  return 800 + (level - 1) * 150;
}

const RANK_TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
function rankForLevel(level: number): string {
  const tierIndex = Math.min(RANK_TIERS.length - 1, Math.floor((level - 1) / 5));
  const numerals = ["I", "II", "III"];
  const subIndex = (level - 1) % 3;
  return `${RANK_TIERS[tierIndex]} ${numerals[subIndex]}`;
}

function defaultPlayerProgress(): PlayerProgress {
  return { level: 1, xp: 0, xpNext: xpNextForLevel(1), kills: 0, wins: 0, matches: 0, history: [] };
}

function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PLAYER_PROGRESS_STORAGE_KEY);
    if (!raw) return defaultPlayerProgress();
    const parsed = JSON.parse(raw);
    return {
      level: parsed.level ?? 1,
      xp: parsed.xp ?? 0,
      xpNext: parsed.xpNext ?? xpNextForLevel(parsed.level ?? 1),
      kills: parsed.kills ?? 0,
      wins: parsed.wins ?? 0,
      matches: parsed.matches ?? 0,
      // Older saves (from before match history existed) simply won't have
      // this field — default to empty rather than crashing on .map/.slice.
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return defaultPlayerProgress();
  }
}

// Applies a chunk of XP, rolling over into as many level-ups as it takes
// (each level's own xpNext threshold, not a fixed one) — a big XP grant
// can legitimately jump more than one level at once.
function applyXP(progress: PlayerProgress, xpGained: number): PlayerProgress {
  let { level, xp, xpNext } = progress;
  xp += xpGained;
  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    xpNext = xpNextForLevel(level);
  }
  return { ...progress, level, xp, xpNext };
}

const AVATAR_ICON = (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
    <circle cx="12" cy="12" r="12" fill="#2a3550" />
    <path
      d="M12 4.5c-3.3 0-5.2 2-5.2 4.6 0 1.7.7 2.9 1.6 3.7-2.6 1-4.4 3-4.4 5.7v.5a12 12 0 0016 0v-.5c0-2.7-1.8-4.7-4.4-5.7.9-.8 1.6-2 1.6-3.7 0-2.6-1.9-4.6-5.2-4.6z"
      fill="#8fa3c9"
    />
    <path d="M6.8 9.6c0-2.8 2.2-4.8 5.2-4.8s5.2 2 5.2 4.8" stroke="#4a5a80" strokeWidth="1.2" fill="none" />
  </svg>
);

const RANK_BADGE_ICON = (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
    <path
      d="M12 2l2.6 5.4 5.9.6-4.4 4 1.3 5.8L12 15.1 6.6 17.8l1.3-5.8-4.4-4 5.9-.6L12 2z"
      fill="#ffd23f"
      stroke="#a8760f"
      strokeWidth="1"
    />
  </svg>
);

function PlayerProfileButton({ progress, onClick }: { progress: PlayerProgress; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  const xpFraction = progress.xp / progress.xpNext;
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        position: "absolute",
        top: "3%",
        left: "3%",
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 2vw, 10px)",
        padding: "clamp(5px, 1.6vw, 8px) clamp(10px, 3vw, 14px) clamp(5px, 1.6vw, 8px) clamp(5px, 1.6vw, 8px)",
        border: "1px solid rgba(140,160,200,0.4)",
        borderRadius: 10,
        background: "rgba(8,12,22,0.65)",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 120ms ease",
      }}
    >
      <div style={{ width: "clamp(34px, 9vw, 44px)", height: "clamp(34px, 9vw, 44px)", flexShrink: 0 }}>{AVATAR_ICON}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, minWidth: 0 }}>
        <span
          style={{
            color: "#fff",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(11px, 3vw, 14px)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {PLAYER_NAME}
        </span>
        <span
          style={{
            color: "#9db0d4",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(9px, 2.4vw, 11px)",
            letterSpacing: "0.06em",
          }}
        >
          LV {progress.level}
        </span>
        <div style={{ width: "clamp(56px, 16vw, 84px)", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <div style={{ width: `${xpFraction * 100}%`, height: "100%", background: "linear-gradient(90deg, #ff8a2e, #ff5b1f)" }} />
        </div>
      </div>
    </button>
  );
}

function ProfilePanel({ progress, onClose }: { progress: PlayerProgress; onClose: () => void }) {
  const xpFraction = progress.xp / progress.xpNext;
  const winRate = progress.matches > 0 ? Math.round((progress.wins / progress.matches) * 100) : 0;
  const rank = rankForLevel(progress.level);
  const [selectedMatch, setSelectedMatch] = useState<MatchHistoryEntry | null>(null);
  return (
    <div
      role="dialog"
      aria-label="Profile"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(380px, 86vw)",
          background: "linear-gradient(180deg, rgba(20,14,42,0.97), rgba(8,6,20,0.97))",
          border: "1px solid rgba(168,120,255,0.45)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(120,60,255,0.35), inset 0 0 40px rgba(80,40,180,0.15)",
          padding: "22px 26px 26px",
          fontFamily: "'Barlow', sans-serif",
          color: "#e8e2ff",
          maxHeight: "82vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 2,
              color: "#c9a8ff",
              textShadow: "0 0 18px rgba(170,110,255,0.7)",
            }}
          >
            PROFILE
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e2ff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            height: 1,
            background: "linear-gradient(90deg, rgba(168,120,255,0.6), rgba(168,120,255,0))",
          }}
        />

        {/* Avatar + name + rank badge */}
        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              flexShrink: 0,
              borderRadius: "50%",
              border: "2px solid rgba(168,120,255,0.5)",
              boxShadow: "0 0 20px rgba(140,80,255,0.4)",
              overflow: "hidden",
            }}
          >
            {AVATAR_ICON}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: "#fff",
              }}
            >
              {PLAYER_NAME}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18 }}>{RANK_BADGE_ICON}</div>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 14, color: "#ffd23f" }}>
                {rank}
              </span>
            </div>
          </div>
        </div>

        {/* Level + XP bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9d8ac2" }}>
            <span>LEVEL {progress.level}</span>
            <span>
              {progress.xp} / {progress.xpNext} XP
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              width: "100%",
              height: 10,
              borderRadius: 5,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(168,120,255,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${xpFraction * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ff8a2e, #ff5b1f)",
                boxShadow: "0 0 10px rgba(255,140,60,0.6)",
              }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {[
            { label: "KILLS", value: progress.kills },
            { label: "WINS", value: progress.wins },
            { label: "WIN RATE", value: `${winRate}%` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(168,120,255,0.25)",
                borderRadius: 10,
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>
                {stat.value}
              </div>
              <div style={{ marginTop: 2, fontSize: 10, letterSpacing: "0.08em", color: "#9d8ac2" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Match history */}
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#9d8ac2",
            }}
          >
            MATCH HISTORY
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {progress.history.length === 0 ? (
              <div
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  fontSize: 12,
                  color: "#6b5f92",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(168,120,255,0.25)",
                  borderRadius: 10,
                }}
              >
                No matches played yet
              </div>
            ) : (
              progress.history.map((entry, i) => {
                const mm = Math.floor(entry.durationSec / 60);
                const ss = entry.durationSec % 60;
                const duration = `${mm}:${ss.toString().padStart(2, "0")}`;
                const won = entry.result === "win";
                return (
                  <button
                    key={`${entry.timestamp}-${i}`}
                    onClick={() => setSelectedMatch(entry)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${won ? "rgba(90,220,140,0.3)" : "rgba(255,90,90,0.25)"}`,
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: won ? "#5adc8c" : "#ff5a5a",
                        boxShadow: won ? "0 0 8px rgba(90,220,140,0.8)" : "0 0 8px rgba(255,90,90,0.8)",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                          color: won ? "#5adc8c" : "#ff8a8a",
                        }}
                      >
                        {won ? "VICTORY" : "DEFEAT"}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "#9d8ac2" }}>
                        {entry.kills} kills · {duration} survived
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#ffb347",
                        flexShrink: 0,
                      }}
                    >
                      +{entry.xp} XP
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      {selectedMatch && <MatchDetailPanel entry={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  );
}

function MatchDetailPanel({ entry, onClose }: { entry: MatchHistoryEntry; onClose: () => void }) {
  const won = entry.result === "win";
  const mm = Math.floor(entry.durationSec / 60);
  const ss = entry.durationSec % 60;
  const duration = `${mm}m ${ss.toString().padStart(2, "0")}s`;
  const rows = [
    { label: "MATCH", value: won ? "VICTORY" : "DEFEAT", color: won ? "#5adc8c" : "#ff8a8a" },
    { label: "KILLS", value: String(entry.kills) },
    { label: "SURVIVED", value: duration },
    { label: "XP EARNED", value: `+${entry.xp}` },
    { label: "DAMAGE DEALT", value: String(entry.damage ?? 0) },
  ];
  return (
    <div
      role="dialog"
      aria-label="Match Detail"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(380px, 86vw)",
          background: "linear-gradient(180deg, rgba(20,14,42,0.97), rgba(8,6,20,0.97))",
          border: "1px solid rgba(168,120,255,0.45)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(120,60,255,0.35), inset 0 0 40px rgba(80,40,180,0.15)",
          padding: "22px 26px 26px",
          fontFamily: "'Barlow', sans-serif",
          color: "#e8e2ff",
          maxHeight: "82vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 2,
              color: "#c9a8ff",
              textShadow: "0 0 18px rgba(170,110,255,0.7)",
            }}
          >
            MATCH DETAILS
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e2ff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            height: 1,
            background: "linear-gradient(90deg, rgba(168,120,255,0.6), rgba(168,120,255,0))",
          }}
        />

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(168,120,255,0.25)",
              }}
            >
              <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "#9d8ac2" }}>{row.label}</span>
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: row.color ?? "#fff",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Lobby({ visible }: { visible: boolean }) {
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployPressed, setDeployPressed] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [progress, setProgress] = useState<PlayerProgress>(loadPlayerProgress);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMatchEnd = (result: "win" | "lose", kills: number, survivalSec: number, damageDealt: number) => {
    setProgress((prev) => {
      const xpGained = kills * KILL_XP + (result === "win" ? WIN_XP_BONUS : 0);
      const entry: MatchHistoryEntry = {
        result,
        kills,
        xp: xpGained,
        durationSec: survivalSec,
        damage: damageDealt,
        timestamp: Date.now(),
      };
      const next: PlayerProgress = {
        ...applyXP(prev, xpGained),
        kills: prev.kills + kills,
        wins: prev.wins + (result === "win" ? 1 : 0),
        matches: prev.matches + 1,
        history: [entry, ...prev.history].slice(0, MATCH_HISTORY_LIMIT),
      };
      localStorage.setItem(PLAYER_PROGRESS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      <img
        src="/lobby-bg-new.jpg"
        alt="10 Squad Assassin lobby background"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Slight overscan: some viewports report a hair less usable
          // height than 100% (mobile browser/WebView chrome), which can
          // leave a thin gap at an edge under a plain `cover` fit. Scaling
          // up a touch from the top edge grows the image downward only,
          // so it always overshoots on every side with zero gap while the
          // top stays exactly where it was.
          transform: "scale(1.04)",
          transformOrigin: "50% 0%",
        }}
      />

      <img
        src="/lobby-title.png"
        alt="10 Squad Assassin"
        style={{
          position: "absolute",
          top: "calc(4% - 15px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "21.25%",
          maxWidth: 157,
          pointerEvents: "none",
        }}
      />

      <PlayerProfileButton progress={progress} onClick={() => setProfileOpen(true)} />

      <GiftBox
        missionPressed={deployPressed}
        onMissionPress={() => setDeployPressed(true)}
        onMissionRelease={() => setDeployPressed(false)}
        onMissionClick={() => setDeployOpen(true)}
      />

      {/* RANK / Character / Mail row: bottom-left corner, matching the
          reference mockup's position (measured at ~1.25% left inset,
          ~2.3% bottom inset, buttons ~8.75% of the mockup's width each). */}
      <div
        style={{
          position: "absolute",
          left: "3%",
          bottom: "3%",
          display: "flex",
          gap: "clamp(6px, 2vw, 10px)",
        }}
      >
        <LobbyIconButton icon={HOME_ICON} label="RANK" onClick={() => setRankOpen(true)} />
        <LobbyIconButton icon={PEOPLE_ICON} onClick={() => setCharacterOpen(true)} />
        <LobbyIconButton icon={MAIL_ICON} onClick={() => setMailOpen(true)} />
      </div>

      {deployOpen && <CombatArena onExit={() => setDeployOpen(false)} onMatchEnd={handleMatchEnd} />}
      {rankOpen && (
        <ComingSoonPanel
          title="RANK"
          icon="🏆"
          message="Your rank and leaderboard standing will show up here once ranked play goes live."
          onClose={() => setRankOpen(false)}
        />
      )}
      {characterOpen && <CharacterSelectionPanel onClose={() => setCharacterOpen(false)} />}
      {mailOpen && (
        <ComingSoonPanel
          title="MAIL"
          icon="✉️"
          message="Squad messages and notifications will show up here once mail goes live."
          onClose={() => setMailOpen(false)}
        />
      )}
      {profileOpen && <ProfilePanel progress={progress} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
