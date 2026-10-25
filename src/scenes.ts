import type { Scene } from "./types";

const scenery = {
  push: { type: "say" as const, text: "Märmu gives it a shove. It was not waiting for a shove." },
  pull: { type: "say" as const, text: "Märmu pulls. The Alps do not budge, and neither does this." },
  use: { type: "say" as const, text: "Märmu can't think of a use for that." },
  pickup: { type: "say" as const, text: "That stays where it is." },
  give: { type: "say" as const, text: "There is nobody to give that to." },
};

export const scenes: Record<string, Scene> = {
  interior: {
    id: "interior",
    background: "/art/interior.png",
    intro: "Swiss Alps. Morning. Märmu is home.",
    returnLine: "Home again. The cabin smells like cold wood and almost-coffee.",
    groundLook: "The floorboards are worn where Märmu paces in the morning.",
    walk: { xMin: 48, xMax: 590, yMin: 288, yMax: 328 },
    opening: { x: 300, y: 316, facing: "south" },
    entry: { x: 500, y: 318, facing: "west" },
    hotspots: [
      {
        id: "left-window",
        name: "window",
        rect: { x: 92, y: 68, w: 122, h: 104 },
        defaultVerb: "look",
        verbs: {
          look: {
            type: "say",
            text: "Snow on the high peaks, and a sky the colour of a clean cup.",
          },
          open: { type: "say", text: "The latch is stiff. The morning can come in through the door." },
          close: { type: "say", text: "The window is already shut." },
          talk: { type: "say", text: "Märmu taps the glass. The mountain does not tap back." },
          ...scenery,
        },
      },
      {
        id: "right-window",
        name: "window",
        rect: { x: 360, y: 64, w: 120, h: 112 },
        defaultVerb: "look",
        verbs: {
          look: {
            type: "say",
            text: "The same peaks from the other window. They have not moved. They rarely do.",
          },
          open: { type: "say", text: "Painted shut, or Märmu is too comfortable to bother." },
          close: { type: "say", text: "Already closed." },
          talk: { type: "say", text: "He has already said good morning once. Twice would be keen." },
          ...scenery,
        },
      },
      {
        id: "stove",
        name: "stove",
        rect: { x: 248, y: 148, w: 124, h: 128 },
        defaultVerb: "look",
        approach: { x: 300, y: 316, facing: "north" },
        verbs: {
          look: {
            type: "say",
            text: "A stone stove, a kettle, and a small stack of wood. Breakfast is still a rumour.",
          },
          open: { type: "say", text: "No fire yet. The morning can wait a minute." },
          close: { type: "say", text: "The stove door is already shut." },
          use: { type: "say", text: "Coffee later. The mailbox is the thing that will not wait." },
          talk: { type: "say", text: "The kettle does not reply. It never has." },
          push: scenery.push,
          pull: scenery.pull,
          pickup: { type: "say", text: "The stove is the heavy part of the house. It stays." },
          give: scenery.give,
        },
      },
      {
        id: "left-bench",
        name: "bench",
        rect: { x: 96, y: 176, w: 120, h: 42 },
        defaultVerb: "look",
        verbs: {
          look: { type: "say", text: "A plain bench under the window. Fine for sitting. Terrible for news." },
          ...scenery,
          open: { type: "say", text: "Benches do not open." },
          close: { type: "say", text: "It is not open." },
          talk: { type: "say", text: "Märmu has had longer conversations, but not with furniture." },
        },
      },
      {
        id: "right-bench",
        name: "bench",
        rect: { x: 368, y: 174, w: 112, h: 42 },
        defaultVerb: "look",
        verbs: {
          look: { type: "say", text: "The other bench. Same job, other window." },
          ...scenery,
          open: { type: "say", text: "Still a bench." },
          close: { type: "say", text: "Already as closed as a bench gets." },
          talk: { type: "say", text: "No answer. Benches are good at that." },
        },
      },
      {
        id: "door",
        name: "door",
        rect: { x: 532, y: 72, w: 96, h: 186 },
        defaultVerb: "open",
        approach: { x: 560, y: 316, facing: "north" },
        verbs: {
          look: {
            type: "say",
            text: "The cabin door. Beyond it is the meadow, the peaks, and whatever the day is.",
          },
          open: { type: "go", scene: "exterior" },
          walk: { type: "go", scene: "exterior" },
          close: { type: "say", text: "It is already closed." },
          push: { type: "go", scene: "exterior" },
          pull: { type: "say", text: "It opens outward. Pulling only makes Märmu look committed." },
          use: { type: "go", scene: "exterior" },
          talk: { type: "say", text: "Märmu has already talked himself into going outside." },
          pickup: scenery.pickup,
          give: scenery.give,
        },
      },
    ],
  },
  exterior: {
    id: "exterior",
    background: "/art/exterior.png",
    intro: "The meadow in front of the cabin. The air is cold and the mailbox is not empty.",
    returnLine: "Back outside. The peaks are still exactly where he left them.",
    groundLook: "A dirt path through short grass, with a few flowers minding their own business.",
    walk: { xMin: 36, xMax: 600, yMin: 318, yMax: 346 },
    entry: { x: 286, y: 336, facing: "south" },
    hotspots: [
      {
        id: "mountains",
        name: "mountains",
        rect: { x: 455, y: 0, w: 185, h: 168 },
        defaultVerb: "look",
        verbs: {
          look: {
            type: "say",
            text: "The Alps, doing what they always do: sitting there, enormous, and not in a hurry.",
          },
          open: { type: "say", text: "Mountains do not open. Paths do, eventually." },
          close: { type: "say", text: "They are not that kind of mountains." },
          talk: { type: "say", text: "Märmu says good morning. The echo keeps it." },
          ...scenery,
        },
      },
      {
        id: "cabin",
        name: "cabin",
        rect: { x: 0, y: 0, w: 470, h: 300 },
        defaultVerb: "look",
        verbs: {
          look: { type: "say", text: "Märmu's cabin. Small, wooden, and exactly enough." },
          open: { type: "say", text: "The front door is the part that opens." },
          close: { type: "say", text: "It is a house, not a lid." },
          talk: { type: "say", text: "He lives here. A speech would be redundant." },
          ...scenery,
        },
      },
      {
        id: "side-door",
        name: "side door",
        rect: { x: 36, y: 148, w: 100, h: 134 },
        defaultVerb: "look",
        approach: { x: 86, y: 336, facing: "north" },
        verbs: {
          look: { type: "say", text: "The side door. Woodshed, guest room, or a mystery. Shut, in any case." },
          open: { type: "say", text: "Märmu tries the latch. Locked, or never his to begin with." },
          walk: { type: "say", text: "He could go in, if the door agreed. It does not." },
          close: { type: "say", text: "Already closed. Firmly." },
          push: { type: "say", text: "It gives a wooden no." },
          pull: { type: "say", text: "The latch holds. The meadow remains the plan." },
          use: { type: "say", text: "No key, and no reason yet." },
          talk: { type: "say", text: "Märmu knocks. Something inside does not answer, which is polite." },
          pickup: scenery.pickup,
          give: scenery.give,
        },
      },
      {
        id: "door",
        name: "door",
        rect: { x: 236, y: 146, w: 104, h: 136 },
        defaultVerb: "open",
        approach: { x: 286, y: 336, facing: "north" },
        verbs: {
          look: { type: "say", text: "Home. The door is shut, which is how he left it." },
          open: { type: "go", scene: "interior" },
          walk: { type: "go", scene: "interior" },
          close: { type: "say", text: "Already closed. He is on the outside of it, even so." },
          push: { type: "say", text: "It opens inward. Pushing just introduces him to the wood." },
          pull: { type: "go", scene: "interior" },
          use: { type: "go", scene: "interior" },
          talk: { type: "say", text: "He will be back inside in a moment. The door can wait." },
          pickup: scenery.pickup,
          give: scenery.give,
        },
      },
      {
        id: "mailbox",
        name: "mailbox",
        rect: { x: 520, y: 198, w: 112, h: 160 },
        defaultVerb: "open",
        approach: { x: 488, y: 336, facing: "east" },
        verbs: {
          look: {
            type: "say",
            text: "A wooden mailbox on a post, flag up. The morning post has to go somewhere.",
          },
          open: { type: "open-mailbox" },
          close: { type: "close-mailbox" },
          walk: {
            type: "say",
            text: "Märmu stops at the mailbox. It is a mailbox. This is as far as that goes.",
          },
          push: { type: "say", text: "The post is set in the ground. The meadow wins." },
          pull: { type: "say", text: "Märmu tugs the door. Opening it would be the ordinary way." },
          use: { type: "open-mailbox" },
          pickup: { type: "say", text: "The post is planted in the meadow. The Swiss post would mind." },
          give: { type: "say", text: "The mailbox already has a job. It does not want a gift." },
          talk: { type: "say", text: "The mailbox has nothing to say. The letter might." },
        },
      },
    ],
  },
};

export function getScene(id: string): Scene {
  const scene = scenes[id];
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
}
