import type { Direction, FrameImage, SpriteSet } from "./types";

type Manifest = {
  still: Record<Direction, string>;
  walkEast: string[];
  idleSouth: string[];
  footPad?: number;
};

export async function loadImage(src: string): Promise<FrameImage | null> {
  const image = new Image();
  image.src = src;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

export async function loadSprites(): Promise<{ sprites: SpriteSet; footPad: number }> {
  const empty: SpriteSet = {
    still: { south: null, north: null, east: null, west: null },
    walkEast: [],
    idleSouth: [],
  };
  try {
    const response = await fetch("/art/maermu/manifest.json");
    if (!response.ok) return { sprites: empty, footPad: 6 };
    const manifest = (await response.json()) as Manifest;
    const still = {
      south: await loadImage(manifest.still.south),
      north: await loadImage(manifest.still.north),
      east: await loadImage(manifest.still.east),
      west: await loadImage(manifest.still.west),
    };
    const walkEast = (await Promise.all(manifest.walkEast.map((src) => loadImage(src)))).filter(
      (frame): frame is FrameImage => frame !== null,
    );
    const idleSouth = (await Promise.all(manifest.idleSouth.map((src) => loadImage(src)))).filter(
      (frame): frame is FrameImage => frame !== null,
    );
    return { sprites: { still, walkEast, idleSouth }, footPad: manifest.footPad ?? 6 };
  } catch {
    return { sprites: empty, footPad: 6 };
  }
}
