export type Direction = "south" | "north" | "east" | "west";

export type Verb =
  | "walk"
  | "look"
  | "open"
  | "close"
  | "push"
  | "pull"
  | "use"
  | "pickup"
  | "give"
  | "talk";

export type Rect = { x: number; y: number; w: number; h: number };

export type Action =
  | { type: "say"; text: string }
  | { type: "go"; scene: string }
  | { type: "open-mailbox" }
  | { type: "close-mailbox" }
  | { type: "read-letter" }
  | { type: "sequence"; steps: Action[] };

export type Hotspot = {
  id: string;
  name: string;
  rect: Rect;
  defaultVerb: Verb;
  approach?: { x: number; y: number; facing?: Direction };
  verbs: Partial<Record<Verb, Action>>;
};

export type WalkBand = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type Scene = {
  id: string;
  background: string;
  intro: string;
  returnLine: string;
  groundLook: string;
  walk: WalkBand;
  entry: { x: number; y: number; facing: Direction };
  opening?: { x: number; y: number; facing: Direction };
  hotspots: Hotspot[];
};

export type FrameImage = CanvasImageSource & { width: number; height: number };

export type SpriteSet = {
  still: Record<Direction, FrameImage | null>;
  walkEast: FrameImage[];
  idleSouth: FrameImage[];
};
