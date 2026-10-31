import type { Action } from "../types";

const say = (text: string): Action => ({ type: "say", text });
const script = (id: string): Action => ({ type: "script", id });

export { say, script };

export type ScriptState = {
  flags: ReadonlySet<string>;
  switches: readonly string[];
  items: readonly string[];
  hasLetter: boolean;
};

export type ScriptResult = {
  say: string;
  set?: string[];
  go?: string;
  ending?: "gift" | "falke" | "rod";
  switches?: string[];
  add?: string[];
  remove?: string[];
  read?: "notebook";
};

export const notebookPages = [
  "A cheese recipe for the valley. Given, not sold. The measurements are cups and patience.",
  "There is no map in this book. Anyone who treats it as a way to find me has not read it.",
  "The keeper's word is not written here either. It is spoken, when it is time.",
];

export const endings = {
  gift: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Wolke tries to pay for the cheese. Märmu will not take the money. It is a gift, like the recipe, and like the pages the village wrote for nothing.",
      "There is no price on any of it. Wolke's cloud of hair sinks, and he collapses sobbing beside the turbines.",
      "Bruno says the word he would not write. Märmu types it. The first page is a hand-drawn map of the valley. Welcome home, Märmu.",
      "They sleep the winter out in the canteen, Phonemos humming, a warm blanket over Märmu. In spring the valley will still be talking about him.",
      "Your wiki in the Alps, not in the clouds.",
    ],
  },
  falke: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Falke lays one wing on Wolke's shoulder and says, quietly: \"I think it is enough, Wolke.\" He was hired to take the bunker. He will not.",
      "Wolke's hair deflates. His plan falls apart, and he collapses sobbing.",
      "Bruno says the word he would not write. Märmu types it. The wiki wakes on a map of the valley. Welcome home, Märmu.",
      "They sleep the winter out in the canteen, the machines humming, a warm blanket over Märmu. He yawns, once, and it is the good kind.",
      "Your wiki in the Alps, not in the clouds.",
    ],
  },
  rod: {
    heading: "The Sleep of the Righteous",
    paragraphs: [
      "Wolke grabs the rod and forces it into the turbine lock. It bends with a metallic groan. The gate does not move.",
      "His grand plan falls apart in his hands, and he collapses sobbing. Märmu still has the real key.",
      "Bruno says the word he would not write. Märmu types it. Welcome home, Märmu. The first page is the valley, drawn by hand.",
      "Bruno keeps Phonemos in the mountain, and Märmu becomes its keeper. They sleep the winter out under a warm blanket.",
      "Your wiki in the Alps, not in the clouds.",
    ],
  },
};

function has(state: ScriptState, flag: string): boolean {
  return state.flags.has(flag);
}

function holds(state: ScriptState, id: string): boolean {
  return state.items.includes(id);
}

function done(sayText: string, extra: Omit<ScriptResult, "say"> = {}): ScriptResult {
  return { say: sayText, ...extra };
}

function routeEnding(state: ScriptState): ScriptResult["ending"] {
  if (has(state, "route-falke")) return "falke";
  if (has(state, "route-rod")) return "rod";
  return "gift";
}

export function runScript(id: string, state: ScriptState): ScriptResult {
  switch (id) {
    case "to-village":
      if (!state.hasLetter) return done("The path to the village can wait. The mailbox cannot.");
      if (!has(state, "letter-read")) return done("Bruno wrote it down. Märmu should read the letter before he walks.");
      return done("The path drops toward the village. The first snow is a rumour with a timetable.", { go: "village" });
    case "to-meadow":
      return done("Back up the path. The cabin is where he left it.", { go: "exterior" });
    case "to-dairy":
      return done("The dairy smells like the job he came to finish.", { go: "dairy" });
    case "to-elder":
      return done("The elder's cottage. The lane noise stops at the door.", { go: "elder" });
    case "to-workshop":
      return done("The workshop door is open. Something on the shelf is pretending to be one thing.", { go: "workshop" });
    case "to-station":
      return done("The valley station. The last car has not left, and it is thinking about it.", { go: "station" });
    case "leave-shop":
      return done("Out to the lane. Wolke is still bad at faces.", { go: "village" });
    case "wolke-dairy":
      return done("\"Have you seen anyone asking for a rope?\" Wolke smiles over Märmu's head. He does not look down. Märmu does not say the word.");
    case "wolke-lane":
      return done("Wolke walks the lane, asking about a rope. He passes a marmot carrying cheese and does not see him.");
    case "cellar":
      if (holds(state, "cheese")) return done("The cellar is shelves and cold air. The wheel is already in Märmu's arms.");
      return done("Märmu climbs down. The cheese wheel he made is on the cold shelf. He brings it up, and he does not say rope.", {
        add: ["cheese"],
      });
    case "owner":
      if (!holds(state, "cheese")) {
        return done("\"Your wheel is in the cellar. The hoist rope is frayed. I am finished with it.\" Wolke is listening for a different sentence.");
      }
      if (holds(state, "rope")) return done("The owner is back among the cheeses. The frayed rope has a new job.");
      return done("She looks at the frayed rope, then at Wolke. She hands it over without naming it. A marmot collecting cheese is not a marmot asking for a rope.", {
        add: ["rope"],
        set: ["wolke-left-dairy"],
      });
    case "elder":
      if (holds(state, "notebook") && has(state, "notebook-read")) {
        return done("\"No map,\" the elder says. \"If I had drawn one, that man in the grey suit would already be buying it.\"");
      }
      if (holds(state, "notebook")) return done("\"Read it before you go. Bruno did not keep it so it could sit in a pocket.\"");
      return done("The elder waits until the grey suit is out of the room. \"He buys what people give away. This notebook is yours. Read it here.\"", {
        add: ["notebook"],
        read: "notebook",
      });
    case "shelf":
      if (!holds(state, "rod")) {
        return done("Two pieces on the shelf look like the same key. Märmu tries the first in the stuck drawer. It bends and will not turn. He keeps it.", {
          add: ["rod"],
        });
      }
      if (!holds(state, "sluice-key")) {
        return done("The other piece looks the same until it turns. The drawer opens on dust. This one is the sluice key. He keeps both.", {
          add: ["sluice-key"],
        });
      }
      return done("The shelf is empty. The drawer works, and it had nothing else he needed.");
    case "biker":
      if (holds(state, "tire")) return done("The bike rolls. The biker is already arguing with the next hill.");
      if (!has(state, "biker-talk")) {
        return done("\"I do not give parts away,\" the biker says, to a pedal. \"I fix them.\"", { set: ["biker-talk"] });
      }
      return done("Märmu holds the wheel while the biker seats a new tire. The old one is cracked and leftover. He lets it go because it is junk, not a gift.", {
        add: ["tire"],
      });
    case "gondola": {
      if (!state.hasLetter) return done("The clerk will not open the window for a marmot with no post.");
      const named: [string, string][] = [
        ["rope", "a rope"],
        ["notebook", "the notebook"],
        ["sluice-key", "the sluice key"],
        ["cheese", "the cheese wheel"],
      ];
      const missing = named.filter(([item]) => !holds(state, item)).map(([, label]) => label);
      if (missing.length) {
        const list = missing.join(", ").replace(/, ([^,]*)$/, " and $1");
        return done(`The clerk reads the letter and taps the glass. "You are still short ${list}."`);
      }
      if (!has(state, "notebook-read")) return done("The clerk can see the notebook. \"Read it before the pass closes. I am not a library.\"");
      if (!holds(state, "tire") || !holds(state, "rod")) {
        return done("The crow hops the gondola roof. \"You are leaving the useful junk. The letter is not the whole pack.\"");
      }
      return done("The clerk finds the four things the letter names. The last car leaves. The crow gets on, already talking.", {
        go: "trail",
      });
    }
    case "bridge":
      return done("The bridge is still up there, whole and useless. The trail that reached it is in the gorge.");
    case "stone":
      if (has(state, "crossed")) return done("The rope is already across. Märmu is not climbing it twice.");
      if (!holds(state, "rope")) return done("A stone at the break, and a gorge where the path was. The bridge is a picture. A rope would make the stone useful.");
      return done("The dairy rope would reach. Märmu has to tie it to the stone.");
    case "stone-throw":
      if (has(state, "crossed")) return done("The rope is already across. Märmu is not climbing it twice.");
      return done("Märmu ties the dairy rope to the stone and throws it across. The rope holds. He climbs, small and careful.", {
        remove: ["rope"],
        set: ["crossed"],
        go: "farside",
      });
    case "ibex":
      return done("The ibex looks at the gorge as if it were a step. \"The hut is along this trail. The shepherd is down in the village. I am not.\"", {
        set: ["ibex-met"],
      });
    case "crow":
      return done("The crow has an opinion about the rope, the ibex, Märmu's ears, and the shoes he is not wearing.");
    case "hut-path":
      if (!has(state, "ibex-met")) return done("The trail goes on. Märmu would rather hear where it goes.");
      if (!has(state, "notebook-gone")) {
        return done("Falke drops out of the sky. He thinks the notebook is the way to Bruno. It tears. The pages fall into the gorge. The ibex rams him, and he leaves with nothing. There was no map to take.", {
          remove: ["notebook"],
          set: ["notebook-gone"],
        });
      }
      return done("Falke is gone. The ibex snorts, and the trail to the hut is open.", { go: "hut" });
    case "axe":
      return done("An axe, a chopping block, and no wood. A bridge is a fine idea with nothing to cut.");
    case "animals":
      return done("Sheep, a cow, a goat, and a Bernese mountain dog. None of them care. The ibex does.");
    case "catapult":
      if (has(state, "launched")) return done("The tire hangs slack between the hut and the fence. Märmu is already across.");
      if (!holds(state, "tire")) return done("The fence and the hut corner want something that stretches. The axe has nothing to bite.");
      return done("The old tire would stretch between the hut and the fence. The ibex is watching the gap.");
    case "catapult-do":
      if (has(state, "launched")) return done("The tire hangs slack between the hut and the fence. Märmu is already across.");
      return done("Märmu fixes the old tire between the hut and the fence. The ibex pulls it back and lets go. Märmu flies over the stream.", {
        remove: ["tire"],
        set: ["launched"],
      });
    case "cave":
      if (!has(state, "launched")) return done("The cave is behind the waterfall, on the far side of the stream. Märmu is on this side.");
      return done("The crow stays with the ibex, still talking. Märmu goes in alone.", { go: "entrance" });
    case "motto":
      return done("Carved over the steel door: Wissen ist ewig. Knowledge is eternal. The plate on the door says A9756.", {
        set: ["saw-motto"],
      });
    case "enter-bunker":
      if (!has(state, "saw-motto")) return done("The door will open. The stone over it is the thing Märmu has not read.");
      return done("The steel door opens on a canteen, not on a solved machine.", { go: "canteen" });
    case "hose":
      if (has(state, "hose")) return done("The hose is back on. The machine works. The cup under the spout is still a rumour.");
      return done("The water hose has slipped behind the machine, where Bruno cannot reach. Märmu can. He pushes it back on. The machine purrs. There is no coffee in it.", {
        set: ["hose"],
      });
    case "bruno":
      if (!has(state, "hose")) {
        return done("\"The hose slipped,\" Bruno says. \"I had a plan that did not include asking. You are small enough. I am asking.\"");
      }
      if (!has(state, "brewed")) {
        return done("\"It works, and it has nothing to brew. The beans are past Phonemos, in the cool room. The terminal is in the way. The motto over the door is not my word.\"");
      }
      if (!has(state, "stopped")) {
        return done("Wolke is pleased with himself. Bruno has said which room. He has not said the word. He thought the room would be enough of a plan.");
      }
      if (!has(state, "word-spoken")) {
        return done("\"The letter was for you,\" Bruno says. \"Daheim. Home. I am saying it, because I should have said it years ago.\"", {
          set: ["word-spoken"],
        });
      }
      return done("\"Type it at the terminal. I will not write it down.\"");
    case "canteen-door":
      if (!has(state, "hose")) return done("Bruno is still between Märmu and the door. The hose comes first.");
      return done("The door opens on the terminal room. One green cursor, and a colder door beyond it.", { go: "control" });
    case "terminal":
      if (has(state, "word-typed")) return done("The screen is a hand-drawn map of the valley. Welcome home, Märmu.");
      if (has(state, "stopped") && has(state, "word-spoken")) {
        return done("Märmu types the word Bruno just spoke. Daheim. The wiki wakes.", {
          set: ["word-typed"],
          ending: routeEnding(state),
        });
      }
      if (has(state, "stopped")) return done("The login is still waiting. Bruno has the word, and he is in the canteen.");
      if (has(state, "ran") && !has(state, "falke-turned") && !has(state, "stopped")) {
        return done("Wolke's failed login is still on the screen, terms and all. Märmu turns it toward Falke. The archive names a rescued eagle, ringed and released in these Alps, and the descendants still in the valley. The terms let Cumulus Dump delete that without notice. Falke goes quiet, and walks toward the plant.", {
          set: ["falke-turned"],
        });
      }
      if (has(state, "motto-open")) return done("The motto opened the cold room. The keeper's word is not carved on any lintel.");
      if (!has(state, "saw-motto")) return done("The terminal wants a phrase from the entrance. Märmu saw the door and did not read the stone.");
      return done("Märmu gives it the motto from the lintel. Wissen ist ewig. The far door opens. This is the way to the coffee, not the keeper's word.", {
        set: ["motto-open"],
      });
    case "cool-door":
      if (!has(state, "motto-open")) return done("The far door stays shut. The terminal has not heard the motto yet.");
      return done("Cold air, and the smell of coffee that has been kept properly.", { go: "coolroom" });
    case "beans":
      if (holds(state, "coffee") || has(state, "brewed")) return done("The shelf is short one tin. That tin has a canteen to get back to.");
      return done("Coffee beans, kept here because the canteen is too warm. Märmu takes the tin.", { add: ["coffee"] });
    case "back-terminal":
      return done("Back to the green cursor.", { go: "control" });
    case "brew":
      if (has(state, "brewed")) return done("The machine is humming and the cup is finally honest.");
      if (!holds(state, "coffee")) return done("The machine is ready. The beans are not in it.");
      return done("The beans go in.", {
        remove: ["coffee"],
        set: ["brewed"],
        go: "canteen2",
      });
    case "falke-canteen":
      return done("Falke stands beside Wolke, polite and patient. The crow did the talking. Falke is here for the notebook that no longer exists.");
    case "wolke-canteen":
      if (has(state, "ran")) return done("Wolke has run for the plant. Falke has not.");
      return done("Wolke explains, delighted. The crow stayed outside with the ibex and told them the way. \"Your uncle named the room. He will not name the word. I will log in myself.\" He heads for the terminal.", {
        set: ["wolke-at-terminal"],
      });
    case "wolke-login":
      if (has(state, "ran")) return done("Wolke is gone, toward the turbines, shouting that if he cannot have it, nobody can.");
      return done("Wolke jumps. His hair puffs. He tries to log in. The letter said the word was never written, Bruno will not speak it, and the notebook is in the gorge. He screams and runs for the power plant. Falke stays at the screen.", {
        set: ["ran"],
      });
    case "falke-talk":
      if (has(state, "falke-turned")) return done("Falke has gone to the plant. One sentence, and he is taking it there.");
      if (has(state, "stopped")) return done("Falke folds his wings. Someone else already ended it.");
      return done("\"I am here on a contract,\" Falke says. He is still at the screen Wolke could not open. The archive is one click away.");
    case "to-plant":
      if (!has(state, "ran")) return done("The stairs go down to the turbines. Nobody is breaking them yet.");
      return done("The stairs drop toward the water that keeps Phonemos alive.", { go: "power" });
    case "back-canteen":
      return done("Back to Bruno.", { go: has(state, "brewed") ? "canteen2" : "canteen" });
    case "plant-back":
      return done("Back up to the terminal. The turbines keep their own counsel.", { go: "control" });
    case "plant-cheese":
      if (has(state, "stopped")) return done("Wolke is sobbing on the wet floor. The cheese will keep.");
      if (!has(state, "notebook-read")) {
        return done("Wolke names a price. The recipe was in the notebook, and Märmu did not read it before the pages fell.");
      }
      return done("Märmu offers the cheese. Wolke tries to pay. \"It is a gift.\" The elder, the dairy, and the clerk wrote for nothing, and the recipe was given away. Wolke has no price for it. He collapses sobbing.", {
        set: ["stopped", "route-gift"],
      });
    case "plant-rod":
      if (has(state, "stopped")) return done("The gate is unmoved, and Wolke is finished.");
      return done("Wolke shouts for Falke to bring the sluice key. Falke is not the one who answers. Märmu holds out the rod, the one the real key has been hiding since the workshop. Wolke forces it into the lock. It bends. The gate does not move. He collapses sobbing.", {
        set: ["stopped", "route-rod"],
      });
    case "plant-key":
      return done("The real key would open the gate. Märmu keeps it. Wolke does not get this one.");
    case "plant-falke":
      if (has(state, "stopped")) return done("Falke has said his sentence. Wolke is on the floor.");
      return done("Falke lays one wing on Wolke's shoulder. \"I think it is enough, Wolke.\" He was hired to take the bunker. He will not. Wolke's hair deflates, and he collapses sobbing.", {
        set: ["stopped", "route-falke"],
      });
    case "plant-wolke":
      if (has(state, "stopped")) return done("Wolke is sobbing. The gate did not get its grand ending. Bruno is waiting, and the word is still unspoken.");
      if (has(state, "falke-turned")) return done("\"The key!\" Wolke shouts. Falke is no longer fetching it. He is coming down the stairs with a different sentence.");
      return done("\"The key!\" Wolke shouts at the gate. \"Falke! The sluice key!\" Falke is not here. Märmu has two things that look like one, and a cheese that is not for sale.");
    default:
      return done("Nothing happens.");
  }
}
