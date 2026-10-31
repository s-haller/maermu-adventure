export type CarriedItem = {
  id: string;
  name: string;
  look: string;
};

/** Everything a later beat still uses. */
export const carriedItems: CarriedItem[] = [
  {
    id: "cheese",
    name: "cheese",
    look: "A cheese wheel Märmu made himself. It is a gift. It is not for sale.",
  },
  {
    id: "sluice-key",
    name: "sluice key",
    look: "The real key from the workshop shelf. It turned the drawer. It does not bend.",
  },
  {
    id: "rod",
    name: "bendy rod",
    look: "It looked like the sluice key until the drawer bent it. Märmu kept the mistake.",
  },
  {
    id: "rope",
    name: "rope",
    look: "The dairy's frayed hoist rope. Still a rope. He never asked for it out loud.",
  },
  {
    id: "notebook",
    name: "notebook",
    look: "Bruno's notebook. A cheese recipe given to the valley, and no map.",
  },
  {
    id: "tire",
    name: "old tire",
    look: "The biker's cracked tire. Leftover, not a gift. It still stretches.",
  },
  {
    id: "coffee",
    name: "coffee",
    look: "A tin of beans from the cool room. The canteen is too warm for them.",
  },
];

export function carriedItem(id: string): CarriedItem | undefined {
  return carriedItems.find((item) => item.id === id);
}
