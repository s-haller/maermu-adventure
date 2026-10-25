export type Chapter = {
  id: string;
  title: string;
  summary: string;
  scene: string;
  hasLetter?: boolean;
};

/** Add a chapter here to put it on the main menu. `scene` is where it starts. */
export const chapters: Chapter[] = [
  {
    id: "opening",
    title: "Morning at home",
    summary: "The cabin, the meadow, and the letter.",
    scene: "interior",
  },
];
