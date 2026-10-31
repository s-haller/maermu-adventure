export type CarriedItem = {
  id: string;
  name: string;
  look: string;
};

/** Everything the bunker puzzles need, earned in earlier chapters. */
export const carriedItems: CarriedItem[] = [
  {
    id: "notebook",
    name: "notebook",
    look: "Uncle Bruno's notebook. The cover is torn, and the pages are full of recipes that are not recipes.",
  },
  {
    id: "crystal",
    name: "crystal",
    look: "A clear crystal from the ice cave. It holds a little light of its own.",
  },
  {
    id: "rope",
    name: "rope",
    look: "The dairy's spare rope, strong enough for a gondola and a marmot.",
  },
  {
    id: "tapes",
    name: "tapes",
    look: "Wax-sealed tapes from the hut, labelled 1962, 1974, and 1989.",
  },
  {
    id: "mirror",
    name: "mirror",
    look: "A hand mirror from the village workshop.",
  },
  {
    id: "alphorn",
    name: "alphorn",
    look: "A small alphorn from the shepherd's hut. One low note, and it means it.",
  },
  {
    id: "grater",
    name: "grater",
    look: "The dairy's cheese grater. Bruno always said a key should be useful twice.",
  },
  {
    id: "feather",
    name: "feather",
    look: "The crow's feather, passed from neighbour to neighbour until it reached Märmu.",
  },
  {
    id: "sluice-key",
    name: "sluice key",
    look: "A real steel key from the workshop shelf. It does not bend.",
  },
  {
    id: "rod",
    name: "bendy rod",
    look: "It looks exactly like the sluice key, until someone forces it.",
  },
  {
    id: "cheese",
    name: "cheese",
    look: "A cheese wheel Märmu made himself. It is not for sale.",
  },
];

export const finaleItemIds = carriedItems.map((item) => item.id);

export function carriedItem(id: string): CarriedItem | undefined {
  return carriedItems.find((item) => item.id === id);
}
