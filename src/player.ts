import type { Direction, FrameImage, SpriteSet, WalkBand } from "./types";

const WALK_FPS = 10;
const IDLE_FPS = 4;
const SPEED = 130;

type Point = { x: number; y: number };

export class Player {
  x = 280;
  y = 320;
  facing: Direction = "south";
  band: WalkBand = { xMin: 40, xMax: 600, yMin: 260, yMax: 340 };
  private target: Point | null = null;
  private onArrive: (() => void) | null = null;
  private walkTime = 0;
  private idleTime = 0;
  private moving = false;
  footPad = 6;

  constructor(private sprites: SpriteSet) {}

  place(x: number, y: number, facing: Direction): void {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.target = null;
    this.onArrive = null;
    this.moving = false;
  }

  walkTo(x: number, y: number, onArrive?: () => void): void {
    this.target = {
      x: clamp(x, this.band.xMin, this.band.xMax),
      y: clamp(y, this.band.yMin, this.band.yMax),
    };
    this.onArrive = onArrive ?? null;
    if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 4) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.finish();
    }
  }

  stop(): void {
    this.target = null;
    this.onArrive = null;
    this.moving = false;
  }

  faceToward(x: number, y: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx >= 0 ? "east" : "west";
    else this.facing = dy >= 0 ? "south" : "north";
  }

  update(dt: number): void {
    this.idleTime += dt;
    if (!this.target) {
      this.moving = false;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.finish();
      return;
    }
    this.moving = true;
    this.walkTime += dt;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "east" : "west";
    else this.facing = dy > 0 ? "south" : "north";
    const step = Math.min(dist, SPEED * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const frame = this.frame();
    const depth = this.depthScale();
    ctx.imageSmoothingEnabled = false;
    if (!frame) {
      this.drawPlaceholder(ctx, depth);
      return;
    }
    const w = frame.width * depth;
    const h = frame.height * depth;
    const flip = this.facing === "west" && this.usesFlippedWalk();
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (flip) ctx.scale(-1, 1);
    const bob = this.moving && (this.facing === "north" || this.facing === "south")
      ? Math.round(Math.sin(this.walkTime * 14) * depth)
      : 0;
    ctx.drawImage(
      frame,
      Math.round(-w / 2),
      Math.round(-h + this.footPad * depth + bob),
      Math.round(w),
      Math.round(h),
    );
    ctx.restore();
  }

  private finish(): void {
    this.target = null;
    this.moving = false;
    const arrive = this.onArrive;
    this.onArrive = null;
    arrive?.();
  }

  private depthScale(): number {
    const span = this.band.yMax - this.band.yMin || 1;
    const t = clamp((this.y - this.band.yMin) / span, 0, 1);
    return 0.82 + t * 0.28;
  }

  private usesFlippedWalk(): boolean {
    return this.moving && this.sprites.walkEast.length > 0;
  }

  private frame(): FrameImage | null {
    if (this.moving && (this.facing === "east" || this.facing === "west") && this.sprites.walkEast.length) {
      const frames = this.sprites.walkEast;
      const index = Math.floor(this.walkTime * WALK_FPS) % frames.length;
      return frames[index] ?? null;
    }
    if (!this.moving && this.facing === "south" && this.sprites.idleSouth.length) {
      const frames = this.sprites.idleSouth;
      const index = Math.floor(this.idleTime * IDLE_FPS) % frames.length;
      return frames[index] ?? null;
    }
    return this.sprites.still[this.facing];
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, depth: number): void {
    const w = 36 * depth;
    const h = 48 * depth;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#7a4a28";
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = "#f0d2a8";
    ctx.fillRect(-w / 4, -h + 6 * depth, w / 2, 14 * depth);
    ctx.fillStyle = "#b4232a";
    ctx.fillRect(-w / 2, -h + 22 * depth, w, 6 * depth);
    ctx.restore();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
