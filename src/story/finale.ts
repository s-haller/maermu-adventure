import type { Action, Hotspot, Scene } from "../types";

const say = (text: string): Action => ({ type: "say", text });
const script = (id: string): Action => ({ type: "script", id });

const poem = ["stone", "snow", "home"] as const;

export type ScriptState = {
  flags: ReadonlySet<string>;
  switches: readonly string[];
};

export type ScriptResult = {
  say: string;
  set?: string[];
  go?: string;
  ending?: "gift" | "falke" | "rod";
  switches?: string[];
};

export const notebookPages = [
  "Stone, then snow, then home. That is the order of the doors, and the order of a life.",
  "The tapes go back in the years they were sealed: 1962, then 1974, then 1989.",
  "The terminal answers to one word. WISSEN. Knowledge, and nothing cheaper.",
  "The low pipe sings the alphorn's note. The others only rattle.",
  "A cheese recipe, given to the valley, not sold. Measurements that were map coordinates all along.",
];

export const endings = {
  gift: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Wolke tries to pay for the cheese. Märmu will not take the money. It is a gift, like the pages the village wrote for nothing, and like the feather passed from neighbour to neighbour.",
      "There is no price on any of it. Wolke's cloud of hair sinks, and he collapses sobbing beside the turbines.",
      "Bruno keeps Phonemos under the rock. Märmu becomes its keeper, and the village gets its share of the wisdom. They settle into the canteen for a long winter's sleep, with the wiki humming softly and a warm blanket over Märmu.",
      "The first page is a hand-drawn map of the valley. Welcome home, Märmu.",
      "Your wiki in the Alps, not in the clouds.",
    ],
  },
  falke: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Falke reads the archive of a rescued eagle, ringed and released in these Alps, and the names of its descendants in the valley. Then he reads Cumulus Dump's terms, which let the company delete any non-commercial data without notice.",
      "He does not raise a wing. He walks to Wolke, lays one wing on his shoulder, and says, quietly: \"I think it is enough, Wolke.\" The company's own security chief has ordered the operation stopped.",
      "Wolke's hair deflates. His plan falls apart, and he collapses sobbing.",
      "Bruno keeps Phonemos under the rock. Märmu becomes its keeper. They settle into the canteen for the winter, Phonemos humming beside them, a warm blanket over Märmu. He yawns, once, and it is the good kind.",
      "Welcome home, Märmu. Your wiki in the Alps, not in the clouds.",
    ],
  },
  rod: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Wolke grabs the rod and forces it into the turbine lock. It bends with a metallic groan. The gate does not move.",
      "His grand plan falls apart in his hands, and he collapses sobbing.",
      "Märmu still has the real key. The turbines keep turning. Bruno keeps Phonemos in the mountain, and Märmu becomes its keeper. The village gets its share of the wisdom.",
      "They sleep the winter out in the canteen, the wiki humming, a warm blanket over Märmu. In spring the valley will still be talking about him.",
      "Welcome home, Märmu. Your wiki in the Alps, not in the clouds.",
    ],
  },
};

function has(state: ScriptState, flag: string): boolean {
  return state.flags.has(flag);
}

function done(sayText: string, extra: Omit<ScriptResult, "say"> = {}): ScriptResult {
  return { say: sayText, ...extra };
}

export function runScript(id: string, state: ScriptState): ScriptResult {
  switch (id) {
    case "coffee":
      return has(state, "coffee")
        ? done("The crystal is already in the fuse slot, and the machine is humming.")
        : done("Märmu swaps the dead fuse for the ice-cave crystal. The machine coughs, then purrs, and the canteen smells like coffee.", {
            set: ["coffee"],
          });
    case "bruno":
      if (!has(state, "coffee")) {
        return done("\"The machine died in 1989,\" Bruno says. \"I have been waiting for a fuse that does not come from a catalogue.\"");
      }
      if (!has(state, "told")) {
        return done(
          "Bruno wraps both paws around the cup. \"Phonemos holds what is worth keeping, under the rock, where nobody can sell it. Libraries burn. Companies close. The cloud forgets what nobody pays to keep.\"",
          { set: ["told"] },
        );
      }
      if (!has(state, "briefed")) {
        return done(
          "\"I hid it because I trusted my own plans more than anyone's help. That was the mistake. The hall is through that door. Stone, then snow, then home. The notebook knows the rest.\"",
          { set: ["briefed"] },
        );
      }
      return done("\"Go on. I will keep the coffee warm, and I will try to let someone help.\"");
    case "canteen-door":
      return has(state, "briefed")
        ? done("The blast door opens onto a corridor of humming racks.", { go: "hall" })
        : done("Bruno is still between Märmu and the door, and he has not finished.");
    case "switch-stone":
    case "switch-snow":
    case "switch-home":
      return throwSwitch(id.replace("switch-", ""), state);
    case "pipes":
      if (!has(state, "doors")) return done("The racks are sealed behind the fire doors. The switches come first.");
      if (has(state, "cooled")) return done("Glacier water is already running through the pipes. The warning light stays dark.");
      return done("Märmu fixes the gondola pulley to a beam and hauls cold water up the old pipes. The temperature warning drops.", {
        set: ["cooled"],
      });
    case "drive":
      if (!has(state, "cooled")) return done("The drive is too hot to touch. The racks need the glacier water first.");
      if (!has(state, "notebook-read")) return done("The tape years are in Bruno's notebook. Märmu should read it before he guesses.");
      if (has(state, "tapes")) return done("The drive is spinning again. 1962, 1974, 1989, in that order.");
      return done("Märmu stacks the wax-sealed tapes in the years the notebook lists. The damaged drive catches, and the archive comes back.", {
        set: ["tapes"],
      });
    case "vent":
      if (!has(state, "tapes")) return done("The dark room can wait. The drive is still broken.");
      if (has(state, "daylight")) return done("Daylight already lies across the first backup. Cumulus Dump's plan to delete the archive is written there in plain words.");
      return done("Märmu angles the mirror into the shaft. Daylight reaches the dark archive, and the first backup shows Cumulus Dump's plan to delete it.", {
        set: ["daylight"],
      });
    case "hatch":
      if (!has(state, "daylight")) return done("One room is still dark. Märmu is not done in this hall.");
      if (has(state, "hatch")) return done("The hatch is loose. The control room is through it.");
      return done("Märmu tries the pipes until one answers the alphorn's low note. The hatch lock shakes loose.", {
        set: ["hatch"],
      });
    case "hall-door":
      return has(state, "hatch")
        ? done("The hatch swings in on a room with one green terminal.", { go: "control" })
        : done("The hatch is sealed. The pipes around it are waiting for a note they recognise.");
    case "word":
    case "grater":
    case "feather":
      return enterKey(id, state);
    case "wolke-look":
      return has(state, "arrived")
        ? done("Herr Wolke, charming and grey, with a cloud of hair that floats a little above his suit.")
        : done("The room is empty except for the terminal and a door with a serious keyhole.");
    case "wolke":
      if (!has(state, "pinged")) return done("There is nobody here to talk to. The terminal is still waiting for its keys.");
      if (!has(state, "offer")) {
        return done(
          "Herr Wolke smiles as if the bunker were a meeting room. \"Let us keep it safe in the cloud. Seamless access. Trust. I will take Phonemos off your hands.\"",
          { set: ["offer"] },
        );
      }
      if (!has(state, "tempted")) {
        return done(
          "Bruno looks at his cup, and he is tired. \"It would be easier,\" he says. Märmu does not agree. Neither of them agrees with Wolke.",
          { set: ["tempted"] },
        );
      }
      if (!has(state, "refused")) {
        return done(
          "Märmu refuses. Wolke's hair puffs up, and he shouts, \"When I cannot have it, nobody shall have it!\" He runs for the power door.",
          { set: ["refused"] },
        );
      }
      return done("Wolke is already gone, toward the turbines. The power door is the only way after him.");
    case "power-door":
      if (!has(state, "refused")) return done("The power door is locked, and nobody is asking for it yet.");
      return done("The real sluice key turns. The door opens on water, turbines, and Herr Wolke.", { go: "power" });
    case "rod-door":
      return done("Märmu tries the rod in the power door. It bends with a soft groan and comes back out looking sorry. This door wants the real key.");
    case "wolke-book":
      if (has(state, "stopped")) return done("It is already over. Wolke is sitting on the wet floor.");
      return done(
        "Märmu opens the contributors page: the elder, the dairy, the ticket clerk, all written for free. The notebook's cheese recipe was given away, not sold. Wolke has no price for any of it.",
        { set: ["showed"] },
      );
    case "wolke-cheese":
      if (!has(state, "showed")) return done("Wolke squints at the cheese and names a price. He does not understand it yet. The notebook comes first.");
      if (has(state, "stopped")) return done("Wolke is in no state for seconds.");
      return done("Wolke reaches for his wallet. Märmu says it is a gift. There is nothing left to buy.", {
        set: ["stopped"],
        ending: "gift",
      });
    case "falke-book":
      if (has(state, "stopped")) return done("Falke has already said his piece.");
      return done(
        "The archive names Falke's family: a rescued eagle, ringed and released in these Alps, and the descendants still in the valley. Cumulus Dump's terms let them delete that without notice. Falke lays one wing on Wolke's shoulder. \"I think it is enough, Wolke.\"",
        { set: ["stopped"], ending: "falke" },
      );
    case "wolke-rod":
      if (has(state, "stopped")) return done("The rod is already bent, and so is the plan.");
      return done(
        "Wolke shouts for the sluice key. Falke is not there to fetch it, so Märmu hands him the rod. Wolke forces it into the gate. It bends. The gate does not move.",
        { set: ["stopped"], ending: "rod" },
      );
    case "wolke-key":
      return done("Märmu keeps the real sluice key in his paw. The gate can wait. Wolke does not get this one.");
    case "falke":
      return has(state, "stopped")
        ? done("Falke folds his wings. The operation is over, because he said so.")
        : done("\"I am here on a contract,\" Falke says, politely, which is worse. \"Show me a reason, or step aside.\"");
    default:
      return done("Nothing happens.");
  }
}

function throwSwitch(which: string, state: ScriptState): ScriptResult {
  if (has(state, "doors")) return done("The fire doors are already open, in the order of the poem.");
  const next = [...state.switches, which];
  const expected = poem[state.switches.length];
  if (which !== expected) {
    return done("A siren whoops, once, like a polite alarm clock. The switches snap back. Stone, then snow, then home.", {
      switches: [],
    });
  }
  if (next.length === poem.length) {
    return done("The last switch lands on home. The fire doors unlock, and the siren stays quiet.", {
      switches: next,
      set: ["doors"],
    });
  }
  const left = poem.length - next.length;
  return done(`The ${which} switch stays down. ${left === 1 ? "One switch" : `${left} switches`} to go.`, {
    switches: next,
  });
}

function enterKey(id: string, state: ScriptState): ScriptResult {
  const names: Record<string, string> = {
    word: "Märmu types WISSEN. The terminal accepts the word and waits.",
    grater: "The cheese grater fits the slot Bruno left for a physical key. It clicks.",
    feather: "Märmu signs with the crow's feather. The terminal takes the mark.",
  };
  if (has(state, id)) return done("That key is already in.");
  const set = [id];
  const complete = ["word", "grater", "feather"].every((key) => key === id || has(state, key));
  if (!complete) return done(names[id], { set });
  return done(
    `${names[id]} The screen wakes: a hand-drawn map of the valley, and the words \"Welcome home, Märmu.\" Then it pings Cumulus Dump. Herr Wolke is suddenly in the room, smiling.`,
    { set: [...set, "pinged", "arrived"] },
  );
}

function spot(
  id: string,
  name: string,
  rect: Hotspot["rect"],
  approach: Hotspot["approach"],
  defaultVerb: Hotspot["defaultVerb"],
  verbs: Hotspot["verbs"],
  items?: Hotspot["items"],
  when?: string,
): Hotspot {
  return { id, name, rect, approach, defaultVerb, verbs, items, when };
}

const canteenDoor = spot(
  "blast-door",
  "blast door",
  { x: 536, y: 88, w: 92, h: 176 },
  { x: 500, y: 296, facing: "east" },
  "open",
  {
    open: script("canteen-door"),
    use: script("canteen-door"),
    look: say("A steel door, the kind a mountain puts between itself and the weather."),
  },
);

export const finaleScenes: Record<string, Scene> = {
  canteen: {
    id: "canteen",
    background: "/art/canteen.png",
    intro:
      "The bunker canteen. Uncle Bruno is alive, older, and guarding a dead coffee machine. Märmu's pockets are full of the mountain. The notebook is the page to read.",
    returnLine: "Bruno is still here, and so is the coffee.",
    groundLook: "Worn concrete, warm from the pipes underneath.",
    walk: { xMin: 36, xMax: 560, yMin: 276, yMax: 304 },
    entry: { x: 180, y: 296, facing: "east" },
    opening: { x: 180, y: 296, facing: "east" },
    hotspots: [
      spot(
        "machine",
        "coffee machine",
        { x: 248, y: 96, w: 200, h: 150 },
        { x: 300, y: 296, facing: "north" },
        "use",
        {
          look: say("Bruno's coffee machine. The fuse is dead, and the cup under the spout is optimistic."),
          use: say("It needs a fuse, not a pep talk."),
          open: say("The fuse slot is empty."),
        },
        { crystal: script("coffee") },
      ),
      spot(
        "bruno",
        "Bruno",
        { x: 430, y: 148, w: 100, h: 124 },
        { x: 400, y: 296, facing: "east" },
        "talk",
        {
          talk: script("bruno"),
          look: say("Uncle Bruno. Grey muzzle, green scarf, and the stubborn calm of someone who has been right for years."),
          give: say("Talk to him first. He is not collecting souvenirs."),
        },
      ),
      canteenDoor,
    ],
  },
  hall: {
    id: "hall",
    background: "/art/hall.png",
    intro: "The machine hall. Three switches, hot racks, a dark vent, and a hatch that will not move.",
    returnLine: "The machine hall hums to itself.",
    groundLook: "Concrete, with a cable taped down the middle like an afterthought.",
    walk: { xMin: 20, xMax: 600, yMin: 286, yMax: 322 },
    entry: { x: 80, y: 308, facing: "east" },
    hotspots: [
      spot(
        "stone",
        "stone switch",
        { x: 4, y: 128, w: 62, h: 92 },
        { x: 70, y: 308, facing: "west" },
        "push",
        {
          push: script("switch-stone"),
          use: script("switch-stone"),
          look: say("The first switch is marked with a stone. Bruno's poem starts there."),
        },
      ),
      spot(
        "snow",
        "snow switch",
        { x: 68, y: 128, w: 60, h: 92 },
        { x: 100, y: 308, facing: "west" },
        "push",
        {
          push: script("switch-snow"),
          use: script("switch-snow"),
          look: say("The middle switch is marked with a snowflake."),
        },
      ),
      spot(
        "home",
        "home switch",
        { x: 134, y: 128, w: 64, h: 92 },
        { x: 168, y: 308, facing: "west" },
        "push",
        {
          push: script("switch-home"),
          use: script("switch-home"),
          look: say("The last switch is marked with a little house."),
        },
      ),
      spot(
        "pipes",
        "cooling pipes",
        { x: 210, y: 48, w: 250, h: 100 },
        { x: 360, y: 308, facing: "north" },
        "use",
        {
          look: say("Server racks, too warm, and a pulley under a shaft that used to carry glacier water."),
          use: say("The pipes need the dairy rope before they will pull."),
        },
        { rope: script("pipes") },
      ),
      spot(
        "drive",
        "tape drive",
        { x: 292, y: 162, w: 180, h: 116 },
        { x: 380, y: 308, facing: "north" },
        "use",
        {
          look: say("A damaged drive. It wants the wax-sealed tapes, in the years Bruno wrote down."),
          use: say("Märmu's paws are not the right media."),
        },
        { tapes: script("drive") },
      ),
      spot(
        "vent",
        "dark vent",
        { x: 476, y: 150, w: 64, h: 130 },
        { x: 460, y: 308, facing: "east" },
        "use",
        {
          look: say("A room with no power. A ventilation shaft points at the daylight somewhere above."),
          use: say("Nothing in the shaft will catch the light by itself."),
        },
        { mirror: script("vent") },
      ),
      spot(
        "hatch",
        "hatch",
        { x: 548, y: 176, w: 78, h: 92 },
        { x: 530, y: 308, facing: "east" },
        "open",
        {
          look: say("A round hatch, sealed. The pipes beside it are different lengths, like organ pipes."),
          open: script("hall-door"),
          use: say("Hands will not do it. The pipes want a note."),
        },
        { alphorn: script("hatch") },
      ),
    ],
  },
  control: {
    id: "control",
    background: "/art/control.png",
    intro: "The control room. One terminal, glowing green, and a locked door to the turbines.",
    returnLine: "The control room. The terminal keeps its green glow.",
    groundLook: "Concrete, swept, as if Bruno expected guests he hoped would not come.",
    walk: { xMin: 28, xMax: 580, yMin: 284, yMax: 306 },
    entry: { x: 90, y: 300, facing: "east" },
    hotspots: [
      spot(
        "console",
        "old console",
        { x: 16, y: 124, w: 168, h: 150 },
        { x: 90, y: 300, facing: "north" },
        "look",
        {
          look: say("An old console, already dark. The terminal that matters is the desk with the green cursor."),
          use: say("This one is retired. Bruno left the real terminal across the room."),
        },
      ),
      spot(
        "terminal",
        "terminal",
        { x: 300, y: 140, w: 160, h: 140 },
        { x: 360, y: 300, facing: "north" },
        "use",
        {
          look: say("A single terminal. It wants a word, a physical key, and a signature. Any order. Missing one, it stays locked."),
          use: say("It will not take a pawprint. The notebook has the word."),
        },
        {
          notebook: script("word"),
          grater: script("grater"),
          feather: script("feather"),
        },
      ),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 450, y: 140, w: 70, h: 150 },
        { x: 430, y: 300, facing: "east" },
        "talk",
        {
        talk: script("wolke"),
        look: script("wolke-look"),
      },
      undefined,
      "arrived",
    ),
      spot(
        "power-door",
        "power door",
        { x: 524, y: 108, w: 100, h: 168 },
        { x: 500, y: 300, facing: "east" },
        "open",
        {
          look: say("The door to the power room. A real keyhole, not a slot for a speech."),
          open: say("It is locked."),
          use: say("It is locked."),
        },
        {
          "sluice-key": script("power-door"),
          rod: script("rod-door"),
        },
      ),
    ],
  },
  power: {
    id: "power",
    background: "/art/power.png",
    intro:
      "The power room. An underground current turns the turbines. Wolke is at the sluice, and his hair is having a weather system. Falke watches.",
    returnLine: "The turbines keep turning.",
    groundLook: "Wet concrete. The mountain is doing the work down here.",
    walk: { xMin: 24, xMax: 470, yMin: 268, yMax: 304 },
    entry: { x: 70, y: 292, facing: "east" },
    hotspots: [
      spot(
        "watcher",
        "eagle",
        { x: 16, y: 148, w: 120, h: 130 },
        { x: 150, y: 292, facing: "west" },
        "look",
        {
          look: say("Another eagle, watching from the arch. The one in the coat is Falke."),
          talk: say("This one only watches. Falke is the one with the contract."),
        },
      ),
      spot(
        "falke",
        "Falke",
        { x: 230, y: 130, w: 140, h: 150 },
        { x: 210, y: 292, facing: "east" },
        "talk",
        {
          talk: script("falke"),
          look: say("Agent Falke. Calm, precise, and convinced that knowledge only counts when someone owns it."),
        },
        { notebook: script("falke-book") },
      ),
      spot(
        "wolke",
        "Herr Wolke",
        { x: 390, y: 96, w: 100, h: 180 },
        { x: 360, y: 292, facing: "east" },
        "talk",
        {
          talk: say("\"The key!\" Wolke shouts at the gate. \"Falke! The sluice key!\""),
          look: say("Herr Wolke, hair fully puffed, trying to sabotage a mountain with a bad idea."),
          give: say("He is shouting for a key. Märmu has two things that look like one."),
        },
        {
          notebook: script("wolke-book"),
          cheese: script("wolke-cheese"),
          rod: script("wolke-rod"),
          "sluice-key": script("wolke-key"),
        },
      ),
      spot(
        "gate",
        "turbine gate",
        { x: 430, y: 64, w: 80, h: 32 },
        { x: 370, y: 292, facing: "east" },
        "look",
        {
          look: say("The sluice gate. Behind it, the current that keeps Phonemos alive."),
          open: say("Wolke is the one forcing it, and he is doing it wrong."),
          use: say("The gate is Wolke's problem, for the next few seconds."),
        },
      ),
    ],
  },
};
