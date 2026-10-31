const FILES = ["src/story/places.ts", "src/scenes.ts"];

const RECT = /\{\s*x:\s*-?\d+\s*,\s*y:\s*-?\d+\s*,\s*w:\s*-?\d+\s*,\s*h:\s*-?\d+\s*\}/;
const APPROACH = /\{\s*x:\s*-?\d+\s*,\s*y:\s*-?\d+\s*,\s*facing:\s*"([a-z]+)"\s*\}/;

/**
 * Replace hotspot rectangles inside one scene's source text.
 * Spot calls and `rect:` fields are both handled. Approach points move
 * only when the payload includes one and the source already has one.
 */
export function applySceneLayout(source, sceneId, hotspots) {
  const chunk = sceneBounds(source, sceneId);
  if (!chunk) return { source, updated: [], missing: hotspots.map((hotspot) => hotspot.id), found: false };

  let slice = source.slice(chunk.start, chunk.end);
  const updated = [];
  const missing = [];
  for (const hotspot of hotspots) {
    const next = patchHotspot(slice, sceneId, hotspot);
    slice = next.slice;
    if (next.found) updated.push(hotspot.id);
    else missing.push(hotspot.id);
  }
  return {
    source: source.slice(0, chunk.start) + slice + source.slice(chunk.end),
    updated,
    missing,
    found: true,
  };
}

function sceneBounds(source, sceneId) {
  const key = `\n  ${sceneId}: {`;
  const start = source.indexOf(key);
  if (start < 0) return null;
  const from = start + 1;
  const rest = source.slice(from);
  const next = rest.search(/\n  [A-Za-z0-9]+: \{/);
  const end = next < 0 ? source.length : from + next;
  return { start: from, end };
}

function patchHotspot(chunk, sceneId, hotspot) {
  const marks = hotspotMarks(chunk);
  const mark = marks.find((candidate) => {
    if (candidate.id !== hotspot.id) return false;
    const slice = chunk.slice(candidate.index, spanEnd(marks, candidate.index, chunk.length));
    if (candidate.kind === "spot") return true;
    return candidate.id !== sceneId && /\brect\s*:/.test(slice);
  });
  if (!mark) return { slice: chunk, found: false };

  const end = spanEnd(marks, mark.index, chunk.length);
  let slice = chunk.slice(mark.index, end);
  if (!RECT.test(slice)) return { slice: chunk, found: false };
  const rect = hotspot.rect;
  slice = slice.replace(RECT, `{ x: ${rect.x}, y: ${rect.y}, w: ${rect.w}, h: ${rect.h} }`);
  if (hotspot.approach && APPROACH.test(slice)) {
    const approach = hotspot.approach;
    slice = slice.replace(APPROACH, (_match, facing) => `{ x: ${approach.x}, y: ${approach.y}, facing: "${facing}" }`);
  }
  return { slice: chunk.slice(0, mark.index) + slice + chunk.slice(end), found: true };
}

function hotspotMarks(chunk) {
  const marks = [];
  for (const match of chunk.matchAll(/spot\(\s*"([a-z0-9-]+)"/g)) {
    marks.push({ index: match.index, id: match[1], kind: "spot" });
  }
  for (const match of chunk.matchAll(/\bid:\s*"([a-z0-9-]+)"/g)) {
    marks.push({ index: match.index, id: match[1], kind: "field" });
  }
  marks.sort((a, b) => a.index - b.index);
  return marks;
}

function spanEnd(marks, index, length) {
  const next = marks.find((mark) => mark.index > index);
  return next ? next.index : length;
}
