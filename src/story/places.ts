import type { Hotspot, Scene } from "../types";
import { say, script } from "./play";

function spot(
  id: string,
  name: string,
  rect: Hotspot["rect"],
  approach: Hotspot["approach"],
  defaultVerb: Hotspot["defaultVerb"],
  verbs: Hotspot["verbs"],
  items?: Hotspot["items"],
  when?: string,
  unless?: string,
): Hotspot {
  return { id, name, rect, approach, defaultVerb, verbs, items, when, unless };
}

const floor = { xMin: 28, xMax: 600, yMin: 268, yMax: 332 };

export const placeScenes: Record<string, Scene> = {
  village: {
    id: "village",
    background: "/art/village.png",
    intro: "The village. Cheese, a bell, a workshop, and a man in a grey suit who cannot see a marmot.",
    returnLine: "The lane again. The pass is still open, for now.",
    groundLook: "Cobbles and a little dust. Summer, with winter written in the sky.",
    walk: { xMin: 80, xMax: 560, yMin: 250, yMax: 330 },
    entry: { x: 160, y: 300, facing: "east" },
    opening: { x: 180, y: 300, facing: "east" },
    hotspots: [
      spot("up-path", "path home", { x: 0, y: 230, w: 70, h: 120 }, { x: 100, y: 300, facing: "west" }, "walk", {
        walk: script("to-meadow"),
        look: say("The path back up to the cabin."),
      }),
      spot("dairy-door", "dairy", { x: 8, y: 40, w: 130, h: 150 }, { x: 90, y: 290, facing: "north" }, "open", {
        open: script("to-dairy"),
        look: say("A shopfront on the lane. The dairy, and the cheese Märmu made."),
      }),
      spot("bike", "biker", { x: 70, y: 200, w: 100, h: 80 }, { x: 140, y: 300, facing: "north" }, "talk", {
        talk: script("biker"),
        look: say("A mountain bike against the fence, and a rider who will not give anything away."),
      }),
      spot("elder-door", "elder's cottage", { x: 140, y: 50, w: 130, h: 140 }, { x: 200, y: 290, facing: "north" }, "open", {
        open: script("to-elder"),
        look: say("The elder's cottage. Old songs, and a notebook that is not a map."),
      }),
      spot("station-path", "road", { x: 250, y: 210, w: 140, h: 100 }, { x: 320, y: 300, facing: "north" }, "walk", {
        walk: script("to-station"),
        look: say("The road down to the valley station. The gondola is the last car."),
      }),
      spot("workshop-door", "workshop", { x: 450, y: 40, w: 170, h: 160 }, { x: 500, y: 290, facing: "north" }, "open", {
        open: script("to-workshop"),
        look: say("The workshop. The letter asked for one key. The shelf has a double."),
      }),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 300, y: 180, w: 80, h: 110 },
        { x: 320, y: 300, facing: "north" },
        "talk",
        {
          talk: script("wolke-lane"),
          look: say("Grey suit, cloud of hair, asking the lane about a rope and missing the marmot."),
        },
        undefined,
        "wolke-left-dairy",
      ),
    ],
  },
  dairy: {
    id: "dairy",
    background: "/art/dairy.png",
    intro: "The dairy. Wolke is asking about a rope. Märmu's cheese is in the cellar.",
    returnLine: "The dairy. It still smells like the wheel he made.",
    groundLook: "Worn boards, dusted with flour and a little salt.",
    walk: floor,
    entry: { x: 200, y: 310, facing: "east" },
    hotspots: [
      spot("out", "door", { x: 190, y: 40, w: 140, h: 170 }, { x: 250, y: 300, facing: "north" }, "open", {
        open: script("leave-shop"),
        look: say("The door back to the lane."),
      }),
      spot("cellar", "cellar", { x: 16, y: 90, w: 120, h: 140 }, { x: 120, y: 300, facing: "west" }, "open", {
        open: script("cellar"),
        look: say("A dark hatch, a frayed hoist rope, and the cold shelf where the cheese waits."),
      }),
      spot("owner", "counter", { x: 400, y: 80, w: 220, h: 160 }, { x: 420, y: 300, facing: "east" }, "talk", {
        talk: script("owner"),
        look: say("The counter. The owner is finished with a rope that will not hoist anything else."),
      }),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 320, y: 90, w: 90, h: 150 },
        { x: 340, y: 300, facing: "north" },
        "talk",
        {
          talk: script("wolke-dairy"),
          look: say("Herr Wolke, charming the counter and missing the marmot at his shoes."),
        },
        undefined,
        undefined,
        "wolke-left-dairy",
      ),
    ],
  },
  elder: {
    id: "elder",
    background: "/art/elder.png",
    intro: "The elder's parlor. The grey suit is not in the room.",
    returnLine: "The parlor. The notebook's place on the table is empty.",
    groundLook: "Boards worn by people who came to listen.",
    walk: floor,
    entry: { x: 90, y: 310, facing: "east" },
    hotspots: [
      spot("out", "way out", { x: 0, y: 180, w: 50, h: 160 }, { x: 80, y: 310, facing: "west" }, "walk", {
        walk: script("leave-shop"),
        look: say("The way back to the lane."),
      }),
      spot("elder", "elder", { x: 70, y: 80, w: 220, h: 190 }, { x: 200, y: 310, facing: "west" }, "talk", {
        talk: script("elder"),
        look: say("The elder, keeper of old songs, and of a notebook with no map in it."),
      }),
    ],
  },
  workshop: {
    id: "workshop",
    background: "/art/workshop.png",
    intro: "The workshop. Two pieces on the shelf look like one key.",
    returnLine: "The workshop. The drawer knows the difference now.",
    groundLook: "Sawdust, and a floor that has held heavier mistakes.",
    walk: floor,
    entry: { x: 90, y: 310, facing: "east" },
    hotspots: [
      spot("out", "way out", { x: 0, y: 160, w: 48, h: 180 }, { x: 80, y: 310, facing: "west" }, "walk", {
        walk: script("leave-shop"),
        look: say("Back to the lane."),
      }),
      spot("shelf", "workbench", { x: 150, y: 30, w: 300, h: 190 }, { x: 320, y: 310, facing: "north" }, "use", {
        use: script("shelf"),
        look: say("A stuck drawer, and two slim pieces that could be the same key. One of them bends."),
      }),
    ],
  },
  station: {
    id: "station",
    background: "/art/station.png",
    intro: "The valley station. The clerk has the schedule. The crow has opinions.",
    returnLine: "The station. The last car is still the last car.",
    groundLook: "A concrete platform, with a little grit of snow that has not decided.",
    walk: floor,
    entry: { x: 80, y: 310, facing: "east" },
    hotspots: [
      spot("back", "path", { x: 0, y: 250, w: 50, h: 100 }, { x: 70, y: 310, facing: "west" }, "walk", {
        walk: script("leave-shop"),
        look: say("Back up to the village."),
      }),
      spot("clerk", "clerk", { x: 8, y: 60, w: 160, h: 160 }, { x: 120, y: 310, facing: "north" }, "talk", {
        talk: script("gondola"),
        look: say("The ticket window. Rules first. Sentiment only if the rules are satisfied."),
      }),
      spot("gondola", "gondola", { x: 180, y: 40, w: 420, h: 180 }, { x: 360, y: 310, facing: "east" }, "open", {
        open: script("gondola"),
        look: say("The last car before the snow. A crow is already on the roof, talking."),
      }),
    ],
  },
  trail: {
    id: "trail",
    background: "/art/trail.png",
    intro: "The trail has slipped. The bridge is still there, and Märmu cannot reach it. The crow comments on the drop.",
    returnLine: "The broken trail. The bridge has not come any closer.",
    groundLook: "Stone and a little grass, and then nothing.",
    walk: { xMin: 16, xMax: 230, yMin: 240, yMax: 330 },
    entry: { x: 70, y: 300, facing: "east" },
    opening: { x: 60, y: 300, facing: "east" },
    hotspots: [
      spot("bridge", "bridge", { x: 220, y: 80, w: 200, h: 80 }, undefined, "look", {
        look: script("bridge"),
      }),
      spot("stone", "stone", { x: 130, y: 210, w: 110, h: 90 }, { x: 120, y: 300, facing: "east" }, "use", {
        use: script("stone"),
        look: say("A stone at the break. It did not come up from the village. The gorge did the rest."),
      }, { rope: script("stone-throw") }),
    ],
  },
  farside: {
    id: "farside",
    background: "/art/farside.png",
    intro: "The far side of the gorge. An ibex is waiting, and the crow came too.",
    returnLine: "The far trail. Falke's shadow is gone.",
    groundLook: "A narrow path, with the gorge minding the left side.",
    walk: { xMin: 16, xMax: 240, yMin: 200, yMax: 270 },
    entry: { x: 80, y: 240, facing: "east" },
    hotspots: [
      spot("crow", "crow", { x: 8, y: 160, w: 70, h: 80 }, { x: 60, y: 240, facing: "west" }, "talk", {
        talk: script("crow"),
        look: say("The crow. He joined at the gondola and has not paused for breath."),
      }),
      spot("ibex", "ibex", { x: 60, y: 100, w: 150, h: 150 }, { x: 120, y: 240, facing: "west" }, "talk", {
        talk: script("ibex"),
        look: say("An old ibex. Long horns, longer patience."),
      }),
      spot("onward", "trail", { x: 180, y: 140, w: 90, h: 110 }, { x: 190, y: 240, facing: "east" }, "walk", {
        walk: script("hut-path"),
        look: say("The trail the ibex meant. It does not look empty."),
      }),
    ],
  },
  hut: {
    id: "hut",
    background: "/art/hut.png",
    intro: "The hut is empty of shepherds. The stream is not empty of water, and the cave is on the other side.",
    returnLine: "The hut. The animals remain unimpressed.",
    groundLook: "Grass, a little mud, and the smell of animals who live here.",
    walk: { xMin: 24, xMax: 520, yMin: 250, yMax: 330 },
    entry: { x: 160, y: 300, facing: "east" },
    opening: { x: 140, y: 300, facing: "east" },
    hotspots: [
      spot("axe", "chopping block", { x: 16, y: 130, w: 130, h: 120 }, { x: 100, y: 300, facing: "west" }, "look", {
        look: script("axe"),
      }),
      spot("animals", "animals", { x: 180, y: 140, w: 220, h: 110 }, { x: 260, y: 300, facing: "north" }, "look", {
        look: script("animals"),
      }),
      spot("fence", "fence", { x: 460, y: 150, w: 160, h: 110 }, { x: 420, y: 300, facing: "east" }, "use", {
        use: script("catapult"),
        look: say("A fence, the corner of the hut, and no wood for a bridge. The ibex is watching the gap."),
      }, { tire: script("catapult-do") }),
      spot("cave", "cave", { x: 400, y: 30, w: 200, h: 140 }, { x: 420, y: 300, facing: "east" }, "open", {
        open: script("cave"),
        look: say("A waterfall, and a cave behind it. The stream is the part in the way."),
      }),
    ],
  },
  entrance: {
    id: "entrance",
    background: "/art/entrance.png",
    intro: "A steel door in the rock. The crow did not follow.",
    returnLine: "The steel door. A9756, and the words over it.",
    groundLook: "Wet stone. The mountain is the hallway.",
    walk: { xMin: 40, xMax: 600, yMin: 270, yMax: 335 },
    entry: { x: 140, y: 310, facing: "east" },
    opening: { x: 120, y: 310, facing: "east" },
    hotspots: [
      spot("door", "steel door", { x: 200, y: 70, w: 240, h: 190 }, { x: 300, y: 310, facing: "north" }, "open", {
        open: script("enter-bunker"),
        look: script("motto"),
      }),
      spot("motto", "lintel", { x: 200, y: 8, w: 240, h: 70 }, { x: 300, y: 310, facing: "north" }, "look", {
        look: script("motto"),
      }),
    ],
  },
  canteen: {
    id: "canteen",
    background: "/art/canteen.png",
    intro: "The bunker canteen. Uncle Bruno is alive, older, and stuck with a coffee machine he would not ask for help with.",
    returnLine: "Bruno is still here. The cup is the honest part of the room.",
    groundLook: "Worn concrete, warm from the pipes underneath.",
    walk: { xMin: 36, xMax: 520, yMin: 276, yMax: 320 },
    entry: { x: 120, y: 300, facing: "east" },
    opening: { x: 140, y: 300, facing: "east" },
    hotspots: [
      spot("machine", "coffee machine", { x: 248, y: 90, w: 210, h: 160 }, { x: 280, y: 300, facing: "north" }, "use", {
        use: script("hose"),
        look: say("Bruno's coffee machine. The hose has slipped behind it, where he cannot reach."),
      }, { coffee: script("brew") }),
      spot("bruno", "Bruno", { x: 430, y: 140, w: 110, h: 140 }, { x: 400, y: 300, facing: "east" }, "talk", {
        talk: script("bruno"),
        look: say("Uncle Bruno. Grey muzzle, green scarf, and a plan he is finally willing to share."),
      }),
      spot("door", "door", { x: 530, y: 80, w: 100, h: 190 }, { x: 490, y: 300, facing: "east" }, "open", {
        open: script("canteen-door"),
        look: say("A steel door further in. Phonemos is not solved on this side of it."),
      }),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 150, y: 120, w: 90, h: 150 },
        { x: 180, y: 300, facing: "west" },
        "talk",
        {
          talk: script("wolke-canteen"),
          look: say("Herr Wolke, hair already considering a puff. He found the bunker by asking a crow."),
        },
        undefined,
        "brewed",
        "wolke-at-terminal",
      ),
      spot(
        "falke",
        "Falke",
        { x: 80, y: 130, w: 80, h: 140 },
        { x: 140, y: 300, facing: "west" },
        "talk",
        {
          talk: script("falke-canteen"),
          look: say("Agent Falke. He came for a map. The crow gave him a door instead."),
        },
        undefined,
        "brewed",
        "ran",
      ),
    ],
  },
  canteen2: {
    id: "canteen2",
    background: "/art/canteen2.png",
    intro: "Wolke and Falke are in the canteen. The crow stayed with the ibex and told them the way.",
    returnLine: "Bruno still has not said the word. Wolke is dying to.",
    groundLook: "Canteen concrete. The coffee is the calm thing in the room.",
    walk: { xMin: 36, xMax: 580, yMin: 260, yMax: 330 },
    entry: { x: 200, y: 300, facing: "east" },
    hotspots: [
      spot("falke", "Falke", { x: 20, y: 90, w: 110, h: 150 }, { x: 80, y: 300, facing: "north" }, "talk", {
        talk: script("falke-canteen"),
        look: say("Agent Falke, in the suit, still hoping the notebook was a map."),
      }, undefined, undefined, "ran"),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 140, y: 80, w: 120, h: 160 },
        { x: 180, y: 300, facing: "north" },
        "talk",
        {
          talk: script("wolke-canteen"),
          look: say("Herr Wolke. The hair is having a small weather system."),
        },
        undefined,
        undefined,
        "wolke-at-terminal",
      ),
      spot("machine", "coffee machine", { x: 260, y: 70, w: 110, h: 140 }, { x: 300, y: 300, facing: "north" }, "use", {
        use: script("hose"),
        look: say("The machine is humming. The cup is finally honest."),
      }),
      spot("bruno", "Bruno", { x: 360, y: 110, w: 80, h: 110 }, { x: 380, y: 300, facing: "north" }, "talk", {
        talk: script("bruno"),
        look: say("Uncle Bruno, small in the room, and done pretending the plan was enough."),
      }),
      spot("door", "door", { x: 470, y: 50, w: 110, h: 180 }, { x: 460, y: 300, facing: "east" }, "open", {
        open: script("canteen-door"),
        look: say("The way back to the terminal."),
      }),
    ],
  },
  control: {
    id: "control",
    background: "/art/control.png",
    intro: "The terminal room. One green cursor, and a door that wants the motto, not the keeper's word.",
    returnLine: "The terminal keeps its green glow.",
    groundLook: "Concrete, swept, as if Bruno hoped the guests would not come.",
    walk: { xMin: 28, xMax: 580, yMin: 284, yMax: 326 },
    entry: { x: 90, y: 306, facing: "east" },
    hotspots: [
      spot("back", "door back", { x: 0, y: 80, w: 40, h: 200 }, { x: 70, y: 306, facing: "west" }, "open", {
        open: script("back-canteen"),
        look: say("Back to the canteen, and to Bruno."),
      }),
      spot("terminal", "terminal", { x: 280, y: 110, w: 190, h: 160 }, { x: 340, y: 306, facing: "north" }, "use", {
        use: script("terminal"),
        look: say("A single terminal. The motto opens a door. The word that matters is spoken, and not yet."),
      }),
      spot("far-door", "far door", { x: 500, y: 70, w: 130, h: 200 }, { x: 470, y: 306, facing: "east" }, "open", {
        open: script("cool-door"),
        look: say("A heavier door. The air that leaks past it is cold."),
      }),
      spot(
        "stairs",
        "stairs",
        { x: 180, y: 280, w: 160, h: 70 },
        { x: 240, y: 306, facing: "south" },
        "walk",
        {
          walk: script("to-plant"),
          look: say("Stairs down to the turbines. The mountain does the work under here."),
        },
        undefined,
        "ran",
      ),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 450, y: 120, w: 80, h: 160 },
        { x: 420, y: 306, facing: "east" },
        "talk",
        {
          talk: script("wolke-login"),
          look: say("Wolke, hair fully interested, facing a cursor that will not love him."),
        },
        undefined,
        "wolke-at-terminal",
        "ran",
      ),
      spot(
        "falke",
        "Falke",
        { x: 160, y: 120, w: 110, h: 170 },
        { x: 200, y: 306, facing: "west" },
        "talk",
        {
          talk: script("falke-talk"),
          look: say("Agent Falke. Calm, precise, and still at the screen."),
        },
        undefined,
        "ran",
        "falke-turned",
      ),
    ],
  },
  coolroom: {
    id: "coolroom",
    background: "/art/coolroom.png",
    intro: "The cool room. The beans are here because the canteen is not.",
    returnLine: "The cool room. Frost, and one less tin.",
    groundLook: "Concrete cold enough to matter.",
    walk: floor,
    entry: { x: 120, y: 310, facing: "east" },
    hotspots: [
      spot("out", "door", { x: 8, y: 80, w: 140, h: 180 }, { x: 140, y: 310, facing: "west" }, "open", {
        open: script("back-terminal"),
        look: say("Back to the terminal."),
      }),
      spot("beans", "coffee", { x: 280, y: 70, w: 220, h: 180 }, { x: 300, y: 310, facing: "north" }, "pickup", {
        pickup: script("beans"),
        look: say("Sacks, frost, and a tin of coffee beans."),
      }),
    ],
  },
  power: {
    id: "power",
    background: "/art/power.png",
    intro: "The power room. Wolke is at the sluice, and his hair is having weather.",
    returnLine: "The turbines keep turning. Wolke is the noisy part.",
    groundLook: "Wet concrete. The mountain is doing the work.",
    walk: { xMin: 24, xMax: 480, yMin: 268, yMax: 326 },
    entry: { x: 80, y: 306, facing: "east" },
    hotspots: [
      spot("back", "stairs", { x: 0, y: 60, w: 80, h: 220 }, { x: 100, y: 306, facing: "west" }, "walk", {
        walk: script("plant-back"),
        look: say("Back up to the terminal."),
      }),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 230, y: 70, w: 160, h: 200 },
        { x: 300, y: 310, facing: "north" },
        "talk",
        {
          talk: script("plant-wolke"),
          look: say("Herr Wolke at the gate, hair fully puffed, trying to sabotage a mountain."),
        },
        {
          cheese: script("plant-cheese"),
          rod: script("plant-rod"),
          "sluice-key": script("plant-key"),
        },
      ),
      spot("gate", "turbine gate", { x: 190, y: 16, w: 240, h: 70 }, { x: 300, y: 310, facing: "north" }, "look", {
        look: say("The sluice gate. Behind it, the current that keeps Phonemos alive."),
      }),
      spot(
        "falke",
        "Falke",
        { x: 180, y: 90, w: 140, h: 180 },
        { x: 200, y: 306, facing: "east" },
        "talk",
        {
          talk: script("plant-falke"),
          look: say("Falke, one wing ready for a shoulder, not a fight."),
        },
        undefined,
        "falke-turned",
      ),
    ],
  },
};
