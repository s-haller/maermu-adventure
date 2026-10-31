import { loadImage, loadSprites } from "./assets";
import { chapters, type Chapter } from "./story/chapters";
import { endings, notebookPages, runScript } from "./story/finale";
import { carriedItem } from "./story/items";
import { letter } from "./story/letter";
import { Player } from "./player";
import { getScene } from "./scenes";
import type { Action, Hotspot, Scene, Verb } from "./types";
import { commandLine, DEFAULT_QUIPS, VERBS } from "./verbs";

const VIEW_W = 640;
const VIEW_H = 360;

export type GameUi = {
  game: HTMLElement;
  layout: HTMLElement;
  canvas: HTMLCanvasElement;
  sentence: HTMLElement;
  verbs: HTMLElement;
  pack: HTMLElement;
  letterItem: HTMLButtonElement;
  letterIcon: HTMLImageElement;
  letterLayer: HTMLElement;
  letterHeading: HTMLElement;
  letterBody: HTMLElement;
  letterClose: HTMLButtonElement;
  menu: HTMLElement;
  chapters: HTMLElement;
  continueChapter: HTMLButtonElement;
  toMenu: HTMLButtonElement;
};

export class Game {
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private scene: Scene = getScene("interior");
  private background: CanvasImageSource | null = null;
  private backgrounds = new Map<string, CanvasImageSource>();
  private armed: Verb | null = null;
  private hover: Hotspot | null = null;
  private hoverText = "";
  private message = "";
  private pinMessage = false;
  private pinAt = 0;
  private pinX = 0;
  private pinY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private hasLetter = false;
  private inventory: string[] = [];
  private selected: string | null = null;
  private flags = new Set<string>();
  private switches: string[] = [];
  private reader: "letter" | "notebook" | "ending" | null = null;
  private visited = new Set<string>();
  private debug = false;
  private shade = 0;
  private shading: "out" | "in" | "hold" | null = null;
  private pending: (() => void) | null = null;
  private letterOpen = false;
  private onMenu = true;
  private startingChapter = false;
  private chapter: Chapter | null = null;
  private savedMessage = "";
  private last = performance.now();
  private verbButtons = new Map<Verb, HTMLButtonElement>();

  constructor(private ui: GameUi) {
    const ctx = ui.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    this.ctx = ctx;
    this.player = new Player({
      still: { south: null, north: null, east: null, west: null },
      walkEast: [],
      idleSouth: [],
    });
  }

  async start(): Promise<void> {
    this.buildVerbs();
    this.bind();
    const { sprites, footPad } = await loadSprites();
    this.player = new Player(sprites);
    this.player.footPad = footPad;
    this.ui.letterIcon.src = "/art/letter.png";
    this.buildMenu();
    this.background = await loadImage(getScene(chapters[0]?.scene ?? "interior").background);
    this.showMenu();
    this.fit();
    requestAnimationFrame(this.frame);
  }

  private buildMenu(): void {
    for (const [index, chapter] of chapters.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      const title = document.createElement("span");
      const number = chapter.number ?? index + 1;
      title.textContent = `${number}  ${chapter.title}`;
      const summary = document.createElement("span");
      summary.className = "chapter-summary";
      summary.textContent = chapter.summary;
      button.append(title, summary);
      button.addEventListener("click", () => {
        void this.beginChapter(chapter);
      });
      this.ui.chapters.append(button);
    }
    this.ui.continueChapter.addEventListener("click", () => this.resume());
    this.ui.toMenu.addEventListener("click", () => {
      if (!this.onMenu) this.showMenu();
    });
  }

  private buildVerbs(): void {
    for (const verb of VERBS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = verb.label;
      button.addEventListener("click", () => this.arm(verb.id));
      this.ui.verbs.append(button);
      this.verbButtons.set(verb.id, button);
    }
  }

  private bind(): void {
    const canvas = this.ui.canvas;
    canvas.addEventListener("mousemove", (event) => {
      const point = this.eventPoint(event);
      this.pointerX = point.x;
      this.pointerY = point.y;
      if (this.pinMessage) {
        const moved = Math.hypot(point.x - this.pinX, point.y - this.pinY) > 14;
        const aged = performance.now() - this.pinAt > 700;
        if (moved && aged) this.pinMessage = false;
      }
      this.hover = this.hotspotAt(point.x, point.y);
      this.hoverText = this.previewLine(point.x, point.y);
      canvas.style.cursor = this.hover ? "pointer" : "crosshair";
      this.paintSentence();
      this.paintVerbs();
    });
    canvas.addEventListener("mouseleave", () => {
      this.hover = null;
      this.hoverText = "";
      this.paintSentence();
      this.paintVerbs();
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerdown", (event) => {
      if (this.blocked()) return;
      const point = this.eventPoint(event);
      if (this.debug) {
        console.log(`${this.scene.id} ${Math.round(point.x)}, ${Math.round(point.y)}`);
      }
      if (event.button === 2) {
        this.lookAt(point.x, point.y);
        return;
      }
      if (event.button !== 0) return;
      this.primary(point.x, point.y);
    });
    this.ui.letterItem.addEventListener("click", () => this.useLetter(this.armed ?? "look"));
    this.ui.letterItem.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.useLetter("look");
    });
    this.ui.letterItem.addEventListener("mouseenter", () => {
      const verb = this.armed ?? "look";
      this.hoverText = commandLine(verb, "letter");
      this.paintSentence();
      this.paintVerbs();
    });
    this.ui.letterItem.addEventListener("mouseleave", () => {
      this.hoverText = "";
      this.paintSentence();
      this.paintVerbs();
    });
    this.ui.letterClose.addEventListener("click", () => this.closeLetter());
    this.ui.letterLayer.addEventListener("pointerdown", (event) => {
      if (event.target === this.ui.letterLayer) this.closeLetter();
    });
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key === "d" || event.key === "D") {
        if (this.onMenu) return;
        this.debug = !this.debug;
        this.message = this.debug ? "Hotspots shown. Clicks log their coordinates." : this.scene.intro;
        this.pinMessage = true;
        this.paintSentence();
      }
      if (event.key === "Escape") {
        if (this.shading) return;
        if (this.letterOpen) this.closeLetter();
        else if (!this.onMenu) this.showMenu();
        return;
      }
      if (this.onMenu && /^[0-9]$/.test(event.key)) {
        const number = event.key === "0" ? 10 : Number(event.key);
        const chapter = chapters.find((entry, index) => (entry.number ?? index + 1) === number);
        if (chapter) void this.beginChapter(chapter);
      }
    });
    window.addEventListener("resize", () => this.fit());
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.updateFade(dt);
    if (!this.blocked()) this.player.update(dt);
    this.draw();
    requestAnimationFrame(this.frame);
  };

  private draw(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.background) ctx.drawImage(this.background, 0, 0, VIEW_W, VIEW_H);
    else {
      ctx.fillStyle = "#87b4d4";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#6a8f4e";
      ctx.fillRect(0, this.scene.walk.yMin, VIEW_W, VIEW_H - this.scene.walk.yMin);
    }
    if (!this.onMenu) this.player.draw(ctx);
    if (this.debug && !this.onMenu) this.drawDebug(ctx);
    if (this.shade > 0) {
      ctx.fillStyle = `rgba(12, 8, 4, ${this.shade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = "#ffe14a";
    ctx.fillStyle = "#ffe14a";
    ctx.font = "10px monospace";
    const band = this.scene.walk;
    ctx.strokeRect(band.xMin, band.yMin, band.xMax - band.xMin, band.yMax - band.yMin);
    for (const hotspot of this.scene.hotspots) {
      ctx.strokeRect(hotspot.rect.x, hotspot.rect.y, hotspot.rect.w, hotspot.rect.h);
      ctx.fillText(hotspot.id, hotspot.rect.x + 2, hotspot.rect.y + 12);
    }
    ctx.restore();
  }

  private primary(x: number, y: number): void {
    const hotspot = this.hotspotAt(x, y);
    const verb = this.armed;
    this.armed = null;
    this.paintVerbs();
    if (this.selected && (!verb || verb === "use" || verb === "give")) {
      if (hotspot) this.useSelected(hotspot);
      else this.say(`Use the ${this.selectedName()} on something.`);
      return;
    }
    if (verb && verb !== "walk") {
      if (hotspot) this.perform(hotspot, verb);
      else this.say(this.groundRefusal(verb));
      return;
    }
    if (hotspot) this.perform(hotspot, hotspot.defaultVerb);
    else this.walk(x, y);
  }

  private lookAt(x: number, y: number): void {
    this.armed = null;
    this.paintVerbs();
    const hotspot = this.hotspotAt(x, y);
    if (hotspot) this.perform(hotspot, "look");
    else this.say(this.scene.groundLook);
  }

  private walk(x: number, y: number): void {
    const band = this.scene.walk;
    const tx = clamp(x, band.xMin, band.xMax);
    const ty = clamp(y, band.yMin, band.yMax);
    this.message = "Walk to";
    this.paintSentence();
    this.player.walkTo(tx, ty);
  }

  private perform(hotspot: Hotspot, verb: Verb): void {
    const action = hotspot.verbs[verb] ?? { type: "say", text: DEFAULT_QUIPS[verb] };
    this.message = commandLine(verb, hotspot.name);
    this.paintSentence();
    const approach = hotspot.approach;
    const walkFirst = approach && verb !== "look";
    const run = () => {
      if (approach?.facing) this.player.facing = approach.facing;
      else if (approach) this.player.faceToward(hotspot.rect.x + hotspot.rect.w / 2, hotspot.rect.y);
      this.apply(action);
    };
    if (walkFirst && approach) this.player.walkTo(approach.x, approach.y, run);
    else run();
  }

  private apply(action: Action): void {
    switch (action.type) {
      case "say":
        this.say(action.text);
        break;
      case "go":
        this.transition(action.scene);
        break;
      case "open-mailbox":
        this.openMailbox();
        break;
      case "close-mailbox":
        this.say(
          this.hasLetter
            ? "Märmu shuts the mailbox. Empty, for now."
            : "Märmu leaves it shut. The post is still inside.",
        );
        break;
      case "read-letter":
        this.openLetter();
        break;
      case "script":
        this.run(action.id);
        break;
      case "sequence":
        for (const step of action.steps) this.apply(step);
        break;
      default:
        break;
    }
  }

  private openMailbox(): void {
    if (this.hasLetter) {
      this.say("The mailbox is empty. The letter is in Märmu's paws now.");
      return;
    }
    this.hasLetter = true;
    this.ui.letterItem.hidden = false;
    this.say("A letter is waiting inside. Märmu takes it.");
  }

  private useLetter(verb: Verb): void {
    if (this.letterOpen || this.shading) return;
    this.armed = null;
    this.paintVerbs();
    this.message = commandLine(verb, "letter");
    if (verb === "look" || verb === "use" || verb === "open") {
      this.openLetter();
      return;
    }
    const lines: Partial<Record<Verb, string>> = {
      walk: "He is already carrying the letter.",
      close: "It is a letter, not a door. He can fold it after reading.",
      push: "Crumpling the post would be rude, even for a marmot in a hurry.",
      pull: "Pulling a letter does not reveal a second letter.",
      pickup: "He is already holding it.",
      give: "There is nobody here who wants his mail.",
      talk: "He can read it. It will not read itself aloud.",
    };
    this.say(lines[verb] ?? DEFAULT_QUIPS[verb]);
  }

  private openLetter(): void {
    this.showReader("letter");
    this.say("Märmu reads the letter.");
  }

  private closeLetter(): void {
    if (!this.letterOpen) return;
    const mode = this.reader;
    this.letterOpen = false;
    this.reader = null;
    this.ui.letterLayer.hidden = true;
    this.ui.letterClose.textContent = "Close";
    if (mode === "ending") {
      this.showMenu();
      return;
    }
    if (mode === "notebook") {
      this.flags.add("notebook-read");
      this.say("Märmu closes the notebook. Stone, then snow, then home. The word is WISSEN.");
      return;
    }
    this.say("Märmu folds the letter and keeps it.");
  }

  private showReader(mode: "letter" | "notebook" | "ending", ending?: keyof typeof endings): void {
    const doc =
      mode === "notebook"
        ? { heading: "Bruno's notebook", paragraphs: notebookPages }
        : mode === "ending" && ending
          ? endings[ending]
          : letter;
    this.reader = mode;
    this.letterOpen = true;
    this.hover = null;
    this.hoverText = "";
    this.ui.letterHeading.textContent = doc.heading;
    this.ui.letterBody.replaceChildren();
    for (const paragraph of doc.paragraphs) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      this.ui.letterBody.append(p);
    }
    this.ui.letterClose.textContent = mode === "ending" ? "Menu" : "Close";
    this.ui.letterLayer.hidden = false;
    this.paintVerbs();
  }

  private run(id: string): void {
    const result = runScript(id, { flags: this.flags, switches: this.switches });
    if (result.switches) this.switches = result.switches;
    for (const flag of result.set ?? []) this.flags.add(flag);
    this.say(result.say);
    if (result.ending) this.showReader("ending", result.ending);
    if (result.go) this.transition(result.go);
  }

  private useSelected(hotspot: Hotspot): void {
    const id = this.selected;
    if (!id) return;
    const name = this.selectedName();
    const action = hotspot.items?.[id];
    this.selected = null;
    this.syncPack();
    if (!action) {
      this.say(`The ${name} does nothing to the ${hotspot.name}.`);
      return;
    }
    this.message = `Use ${name} on ${hotspot.name}`;
    this.paintSentence();
    const approach = hotspot.approach;
    const run = () => {
      if (approach?.facing) this.player.facing = approach.facing;
      this.apply(action);
    };
    if (approach) this.player.walkTo(approach.x, approach.y, run);
    else run();
  }

  private clickItem(id: string): void {
    if (this.blocked()) return;
    const item = carriedItem(id);
    if (!item) return;
    const verb = this.armed;
    this.armed = null;
    this.paintVerbs();
    if (verb === "look") {
      this.lookItem(id);
      return;
    }
    if (this.selected === id) {
      this.selected = null;
      this.syncPack();
      this.say(`${item.name} put away.`);
      return;
    }
    this.selected = id;
    this.syncPack();
    if (id === "notebook") {
      this.showReader("notebook");
      this.say("Märmu opens the notebook.");
      return;
    }
    this.say(`Use ${item.name} on…`);
  }

  private lookItem(id: string): void {
    if (this.letterOpen || this.shading) return;
    const item = carriedItem(id);
    if (!item) return;
    if (id === "notebook") {
      this.selected = id;
      this.syncPack();
      this.showReader("notebook");
      this.say("Märmu opens the notebook.");
      return;
    }
    this.say(item.look);
  }

  private selectedName(): string {
    return carriedItem(this.selected ?? "")?.name ?? "thing";
  }

  private syncPack(): void {
    this.ui.pack.replaceChildren();
    for (const id of this.inventory) {
      const item = carriedItem(id);
      if (!item) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pack-item";
      button.textContent = item.name;
      button.classList.toggle("selected", id === this.selected);
      button.addEventListener("click", () => this.clickItem(id));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.lookItem(id);
      });
      button.addEventListener("mouseenter", () => {
        this.hoverText =
          this.selected === id ? `Use ${item.name} on…` : commandLine(this.armed ?? "look", item.name);
        this.paintSentence();
        this.paintVerbs();
      });
      button.addEventListener("mouseleave", () => {
        this.hoverText = "";
        this.paintSentence();
        this.paintVerbs();
      });
      this.ui.pack.append(button);
    }
  }

  private showMenu(): void {
    if (!this.onMenu) this.savedMessage = this.message;
    this.onMenu = true;
    this.letterOpen = false;
    this.ui.letterLayer.hidden = true;
    this.armed = null;
    this.hover = null;
    this.hoverText = "";
    this.paintVerbs();
    this.ui.continueChapter.hidden = this.chapter === null;
    if (this.chapter) this.ui.continueChapter.textContent = `Continue  ${this.chapter.title}`;
    this.ui.menu.hidden = false;
    this.say("Choose a chapter.");
  }

  private resume(): void {
    if (!this.chapter || this.startingChapter) return;
    this.onMenu = false;
    this.ui.menu.hidden = true;
    this.message = this.savedMessage;
    this.pinMessage = true;
    this.paintSentence();
  }

  private async beginChapter(chapter: Chapter): Promise<void> {
    if (this.startingChapter) return;
    this.startingChapter = true;
    this.chapter = chapter;
    this.onMenu = false;
    this.ui.menu.hidden = true;
    this.letterOpen = false;
    this.reader = null;
    this.ui.letterLayer.hidden = true;
    this.ui.letterClose.textContent = "Close";
    this.hasLetter = chapter.hasLetter ?? false;
    this.ui.letterItem.hidden = !this.hasLetter;
    this.inventory = chapter.items ? [...chapter.items] : [];
    this.selected = null;
    this.flags.clear();
    this.switches = [];
    this.syncPack();
    this.visited.clear();
    this.armed = null;
    this.hover = null;
    this.hoverText = "";
    this.shading = null;
    this.shade = 0;
    this.pending = null;
    this.player.stop();
    this.paintVerbs();
    await this.enter(getScene(chapter.scene), true);
    this.startingChapter = false;
  }

  private transition(id: string): void {
    if (this.shading) return;
    this.shading = "out";
    this.pending = () => {
      void this.swap(id);
    };
  }

  private async swap(id: string): Promise<void> {
    await this.enter(getScene(id), false);
    this.shading = "in";
  }

  private async enter(scene: Scene, first: boolean): Promise<void> {
    this.scene = scene;
    this.player.band = scene.walk;
    const spot = first && scene.opening ? scene.opening : scene.entry;
    this.player.place(spot.x, spot.y, spot.facing);
    this.background = await this.backgroundFor(scene);
    const seen = this.visited.has(scene.id);
    this.visited.add(scene.id);
    if (!seen || first) this.say(scene.intro);
    else this.say(scene.returnLine);
  }

  private async backgroundFor(scene: Scene): Promise<CanvasImageSource | null> {
    const cached = this.backgrounds.get(scene.id);
    if (cached) return cached;
    const image = await loadImage(scene.background);
    if (image) this.backgrounds.set(scene.id, image);
    return image;
  }

  private updateFade(dt: number): void {
    if (this.shading === "out") {
      this.shade = Math.min(1, this.shade + dt / 0.18);
      if (this.shade >= 1 && this.pending) {
        const next = this.pending;
        this.pending = null;
        this.shading = "hold";
        next();
      }
    } else if (this.shading === "in") {
      this.shade = Math.max(0, this.shade - dt / 0.22);
      if (this.shade <= 0) this.shading = null;
    }
  }

  private arm(verb: Verb): void {
    if (this.blocked()) return;
    this.armed = this.armed === verb ? null : verb;
    this.hover = null;
    this.hoverText = "";
    this.pinMessage = false;
    this.paintVerbs();
    this.paintSentence();
  }

  private previewLine(x: number, y: number): string {
    const hotspot = this.hotspotAt(x, y);
    if (this.selected && (!this.armed || this.armed === "use" || this.armed === "give")) {
      return hotspot ? `Use ${this.selectedName()} on ${hotspot.name}` : `Use ${this.selectedName()} on…`;
    }
    if (hotspot) return commandLine(this.armed ?? hotspot.defaultVerb, hotspot.name);
    if (this.armed && this.armed !== "walk") return `${commandLine(this.armed, "").trim()}…`;
    return "Walk to";
  }

  private groundRefusal(verb: Verb): string {
    if (verb === "look") return this.scene.groundLook;
    return `${this.scene.id === "exterior" ? "The path" : "The floor"} has no use for that.`;
  }

  private hotspotAt(x: number, y: number): Hotspot | null {
    const spots = this.scene.hotspots;
    for (let i = spots.length - 1; i >= 0; i -= 1) {
      const hotspot = spots[i];
      if (!hotspot) continue;
      if (hotspot.when && !this.flags.has(hotspot.when)) continue;
      const rect = hotspot.rect;
      if (x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h) return hotspot;
    }
    return null;
  }

  private say(text: string): void {
    this.message = text;
    this.pinMessage = true;
    this.pinAt = performance.now();
    this.pinX = this.pointerX;
    this.pinY = this.pointerY;
    this.paintSentence();
  }

  private paintSentence(): void {
    if (this.pinMessage) {
      this.ui.sentence.textContent = this.message;
      return;
    }
    if (this.hoverText && !this.letterOpen) {
      this.ui.sentence.textContent = this.hoverText;
      return;
    }
    if (this.armed && !this.hoverText) {
      this.ui.sentence.textContent = `${VERBS.find((verb) => verb.id === this.armed)?.label ?? ""}…`;
      return;
    }
    this.ui.sentence.textContent = this.message;
  }

  private paintVerbs(): void {
    const preview = this.hover?.defaultVerb;
    for (const [verb, button] of this.verbButtons) {
      button.classList.toggle("armed", verb === this.armed);
      button.classList.toggle("preview", this.armed === null && verb === preview);
    }
  }

  private blocked(): boolean {
    return this.onMenu || this.letterOpen || this.shading !== null;
  }

  private eventPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.ui.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  private fit(): void {
    const game = this.ui.game;
    game.style.transform = "none";
    const natural = game.offsetHeight;
    const scale = Math.max(
      1,
      Math.min(
        3,
        Math.floor(window.innerWidth / 660),
        Math.floor((window.innerHeight - 24) / natural),
      ),
    );
    game.style.transform = `scale(${scale})`;
    this.ui.layout.style.width = `${game.offsetWidth * scale}px`;
    this.ui.layout.style.height = `${natural * scale}px`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
