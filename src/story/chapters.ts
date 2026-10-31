import { finaleItemIds } from "./items";

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
};

/** Add a chapter here to put it on the main menu. `scene` is where it starts. */
export const chapters: Chapter[] = [
  {
    id: "opening",
    title: "Morning at home",
    summary: "The cabin, the meadow, and the letter.",
    scene: "interior",
  },
  {
    id: "bunker",
    number: 10,
    title: "The Bunker",
    summary: "Phonemos, Herr Wolke, and a winter's sleep.",
    scene: "canteen",
    items: finaleItemIds,
  },
];
