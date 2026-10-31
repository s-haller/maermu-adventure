import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { applySceneLayout } from "./scripts/design-layout.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const layoutFiles = [path.join(root, "src/story/places.ts"), path.join(root, "src/scenes.ts")];

let suppressLayoutWrite = false;
let suppressTimer: ReturnType<typeof setTimeout> | undefined;

function designSave(): Plugin {
  return {
    name: "design-save",
    configureServer(server) {
      server.middlewares.use("/__design", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 100_000) req.destroy();
        });
        req.on("end", () => {
          try {
            const result = writeLayout(JSON.parse(body));
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Could not save." }));
          }
        });
      });
    },
    handleHotUpdate(ctx) {
      if (!suppressLayoutWrite) return;
      if (layoutFiles.includes(ctx.file)) return [];
    },
  };
}

function writeLayout(payload: unknown): { file: string; updated: string[]; missing: string[] } {
  const scene = scenePayload(payload);
  for (const file of layoutFiles) {
    const source = fs.readFileSync(file, "utf8");
    const result = applySceneLayout(source, scene.id, scene.hotspots);
    if (!result.found) continue;
    if (result.source !== source) {
      suppressLayoutWrite = true;
      clearTimeout(suppressTimer);
      suppressTimer = setTimeout(() => {
        suppressLayoutWrite = false;
      }, 800);
      fs.writeFileSync(file, result.source);
    }
    return { file: path.relative(root, file), updated: result.updated, missing: result.missing };
  }
  throw new Error(`No scene named ${scene.id}.`);
}

function scenePayload(payload: unknown): {
  id: string;
  hotspots: { id: string; rect: Box; approach?: { x: number; y: number } }[];
} {
  if (!payload || typeof payload !== "object") throw new Error("Expected a scene.");
  const body = payload as { scene?: unknown; hotspots?: unknown };
  if (typeof body.scene !== "string" || !/^[a-z0-9-]+$/.test(body.scene)) throw new Error("Expected a scene id.");
  if (!Array.isArray(body.hotspots)) throw new Error("Expected hotspots.");
  return {
    id: body.scene,
    hotspots: body.hotspots.map((entry) => {
      if (!entry || typeof entry !== "object") throw new Error("Expected a hotspot.");
      const hotspot = entry as { id?: unknown; rect?: unknown; approach?: unknown };
      if (typeof hotspot.id !== "string" || !/^[a-z0-9-]+$/.test(hotspot.id)) throw new Error("Expected a hotspot id.");
      const rect = box(hotspot.rect, true);
      const approach = hotspot.approach == null ? undefined : point(hotspot.approach);
      return { id: hotspot.id, rect, approach };
    }),
  };
}

type Box = { x: number; y: number; w: number; h: number };

function box(value: unknown, sized: boolean): Box {
  if (!value || typeof value !== "object") throw new Error("Expected a rectangle.");
  const rect = value as { x?: unknown; y?: unknown; w?: unknown; h?: unknown };
  return {
    x: integer(rect.x, -200, 800),
    y: integer(rect.y, -200, 800),
    w: integer(rect.w, sized ? 8 : -200, 800),
    h: integer(rect.h, sized ? 8 : -200, 800),
  };
}

function point(value: unknown): { x: number; y: number } {
  if (!value || typeof value !== "object") throw new Error("Expected an approach point.");
  const approach = value as { x?: unknown; y?: unknown };
  return { x: integer(approach.x, -200, 800), y: integer(approach.y, -200, 800) };
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error("Expected a whole-number coordinate.");
  }
  return value;
}

export default defineConfig({
  plugins: [designSave()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
