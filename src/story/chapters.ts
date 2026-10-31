export type Chapter = {
  id: string;
  title: string;
  summary: string;
  scene: string;
  /** Menu number. Defaults to the list position, so 1 is the first chapter. */
  number?: number;
  hasLetter?: boolean;
  /** Items already in inventory when this chapter starts. */
  items?: string[];
  /** Flags already set when this chapter starts. */
  flags?: string[];
};

/** Add a chapter here to put it on the main menu. `scene` is where it starts. */
export const chapters: Chapter[] = [
  {
    id: "letter",
    title: "The Letter",
    summary: "A mailbox, a list, and the path to the village.",
    scene: "interior",
  },
  {
    id: "village",
    title: "The Village",
    summary: "Cheese, a notebook, a key, and the last gondola.",
    scene: "village",
    hasLetter: true,
    flags: ["letter-read"],
  },
  {
    id: "mountain",
    title: "The Mountain",
    summary: "A slipped trail, a rope, and an eagle.",
    scene: "trail",
    hasLetter: true,
    items: ["rope", "notebook", "sluice-key", "rod", "cheese", "tire"],
    flags: ["letter-read", "notebook-read"],
  },
  {
    id: "hut",
    title: "The Hütte",
    summary: "A tire, a stream, and a cave behind the water.",
    scene: "hut",
    hasLetter: true,
    items: ["sluice-key", "rod", "cheese", "tire"],
    flags: ["letter-read", "notebook-read", "notebook-gone", "ibex-met"],
  },
  {
    id: "bunker",
    title: "The Bunker",
    summary: "Bruno, a slipped hose, and a word that is spoken.",
    scene: "entrance",
    hasLetter: true,
    items: ["sluice-key", "rod", "cheese"],
    flags: ["letter-read", "notebook-read", "notebook-gone", "launched"],
  },
];
