import * as THREE from "three";

// A real sci-fi floor-panel image for the main arena ground, tiled with
// RepeatWrapping. Shared between the main combat arena and any other
// procedural level (e.g. CypherPhunkArena) so every map reads with the
// same material language.
const sciFiFloorTextureLoader = new THREE.TextureLoader();
export function createSciFiFloorTexture(repeatCount: number, maxAnisotropy: number): THREE.Texture {
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
// own repeat count. Variant 0 dresses rooms, variant 1 dresses corridors.
const sciFiWallTextureBases: (THREE.Texture | null)[] = [null, null];
const SCIFI_WALL_URLS = ["/textures/wall-scifi.jpg", "/textures/wall-scifi-2.jpg"];
export function createSciFiWallTexture(repeatX: number, repeatY: number, maxAnisotropy: number, variant: 0 | 1 = 0): THREE.Texture {
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

// A simple vertical-gradient sky, painted onto a canvas and wrapped around
// a big inward-facing sphere.
export function createSkyTexture(): THREE.CanvasTexture {
  const width = 4;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#050a14");
  gradient.addColorStop(0.38, "#0d1f34");
  gradient.addColorStop(0.52, "#2f5678");
  gradient.addColorStop(0.62, "#5f8aa3");
  gradient.addColorStop(1, "#5f8aa3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
